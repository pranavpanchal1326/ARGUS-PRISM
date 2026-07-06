"""Authentication & session endpoints (PRD §5.1).

Login flow:  credentials → MFA challenge → TOTP verify → JWT pair.
First login has ``mfa_enrolled=false`` and forces enrolment (QR) before verify.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.auth import mfa
from app.auth.deps import CurrentUser, get_current_user
from app.auth.oauth import OAuthError, exchange_google_code
from app.auth.rbac import permissions_for
from app.auth.security import (
    TokenError,
    access_ttl_seconds,
    create_access_token,
    create_mfa_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.core.response import ProblemException, envelope
from app.db.session import get_db
from app.models.user import Session, User
from app.schemas.auth import (
    LoginRequest,
    Me,
    MfaChallenge,
    MfaEnrolment,
    MfaVerifyRequest,
    OAuthRequest,
    RefreshRequest,
    SessionInfo,
    TokenPair,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def _client(request: Request) -> tuple[str, str]:
    device = request.headers.get("user-agent", "unknown")[:255]
    ip = request.client.host if request.client else "unknown"
    return device, ip


def _bearer(request: Request) -> str:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise ProblemException(401, "Not authenticated", code="not_authenticated")
    return header[7:].strip()


# ── Login (credentials → MFA challenge) ───────────────────────────
@router.post("/login")
def login(body: LoginRequest, db: DbSession = Depends(get_db)) -> dict:
    user = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if user is None or user.disabled or not verify_password(body.password, user.hashed_password):
        raise ProblemException(401, "Invalid credentials", code="invalid_credentials")

    challenge = MfaChallenge(
        mfa_token=create_mfa_token(user.id),
        mfa_enrolled=user.mfa_active,
    )
    return envelope(challenge.model_dump())


@router.post("/oauth/google")
async def oauth_google(body: OAuthRequest, db: DbSession = Depends(get_db)) -> dict:
    try:
        profile = await exchange_google_code(body.code, body.redirect_uri)
    except OAuthError as exc:
        raise ProblemException(401, "OAuth failed", detail=str(exc), code="oauth_failed") from exc

    user = db.execute(select(User).where(User.email == profile["email"])).scalar_one_or_none()
    if user is None or user.disabled:
        # No public signup — the email must belong to an invited user.
        raise ProblemException(401, "No account for this identity", code="no_account")

    challenge = MfaChallenge(
        mfa_token=create_mfa_token(user.id),
        mfa_enrolled=user.mfa_active,
    )
    return envelope(challenge.model_dump())


# ── MFA enrolment (first login) ───────────────────────────────────
@router.post("/mfa/enroll")
def mfa_enroll(request: Request, db: DbSession = Depends(get_db)) -> dict:
    """Issue a fresh otpauth URI. The bearer may be the short-lived mfa_token
    (first-time enrolment) or an access token (re-enrolment). A new secret is
    generated every call — never the same one twice."""
    token = _bearer(request)
    user_id = None
    for token_type in ("mfa", "access"):
        try:
            user_id = decode_token(token, token_type)["sub"]
            break
        except TokenError:
            continue
    if user_id is None:
        raise ProblemException(401, "Invalid enrolment token", code="invalid_token")

    user = db.get(User, user_id)
    if user is None or user.disabled:
        raise ProblemException(401, "User not found or disabled", code="invalid_user")

    secret = mfa.generate_secret()  # different every time
    user.mfa_secret = secret
    db.commit()
    # The secret leaves the server exactly here, inside the provisioning URI.
    uri = mfa.provisioning_uri(secret, user.email)
    return envelope(MfaEnrolment(otpauth_uri=uri).model_dump())


# ── MFA verify (challenge → tokens) ───────────────────────────────
@router.post("/mfa/verify")
def mfa_verify(body: MfaVerifyRequest, request: Request, db: DbSession = Depends(get_db)) -> dict:
    try:
        user_id = decode_token(body.mfa_token, "mfa")["sub"]
    except TokenError as exc:
        raise ProblemException(401, "Invalid or expired MFA token", code="invalid_token") from exc

    if mfa.rate_limited(user_id):
        raise ProblemException(
            429, "Too many attempts", detail="Try again shortly.", code="rate_limited"
        )

    user = db.get(User, user_id)
    if user is None or user.disabled or not user.mfa_secret:
        raise ProblemException(401, "MFA not enrolled", code="mfa_not_enrolled")

    if not mfa.verify_code(user.mfa_secret, body.code):
        mfa.record_attempt(user_id)
        raise ProblemException(401, "Invalid code", code="invalid_code")

    mfa.reset_attempts(user_id)
    # Activate MFA on first successful verification.
    if not user.mfa_active:
        user.mfa_active = True
        user.mfa_active_since = datetime.now(UTC)

    device, ip = _client(request)
    jti = uuid.uuid4().hex
    session = Session(user_id=user.id, refresh_jti=jti, device=device, ip=ip)
    db.add(session)
    db.commit()

    tokens = TokenPair(
        access_token=create_access_token(
            user.id, user.role, [p.value for p in permissions_for(user.role)], session.id
        ),
        refresh_token=create_refresh_token(user.id, jti),
        expires_in=access_ttl_seconds(),
    )
    return envelope(tokens.model_dump())


# ── Refresh (rotate) ──────────────────────────────────────────────
@router.post("/refresh")
def refresh(body: RefreshRequest, request: Request, db: DbSession = Depends(get_db)) -> dict:
    try:
        payload = decode_token(body.refresh_token, "refresh")
    except TokenError as exc:
        raise ProblemException(401, "Invalid refresh token", code="invalid_token") from exc

    session = db.execute(
        select(Session).where(Session.refresh_jti == payload["jti"])
    ).scalar_one_or_none()
    if session is None or session.revoked:
        raise ProblemException(401, "Session revoked", code="session_revoked")

    user = db.get(User, payload["sub"])
    if user is None or user.disabled:
        raise ProblemException(401, "User not found or disabled", code="invalid_user")

    # Rotation: revoke the old jti, mint a new one on the same session row.
    new_jti = uuid.uuid4().hex
    session.refresh_jti = new_jti
    session.last_seen_at = datetime.now(UTC)
    db.commit()

    tokens = TokenPair(
        access_token=create_access_token(
            user.id, user.role, [p.value for p in permissions_for(user.role)], session.id
        ),
        refresh_token=create_refresh_token(user.id, new_jti),
        expires_in=access_ttl_seconds(),
    )
    return envelope(tokens.model_dump())


# ── Logout ────────────────────────────────────────────────────────
@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    user: CurrentUser = Depends(get_current_user), db: DbSession = Depends(get_db)
) -> Response:
    if user.sid:
        session = db.get(Session, user.sid)
        if session is not None:
            session.revoked = True
            db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Profile + sessions ────────────────────────────────────────────
@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user), db: DbSession = Depends(get_db)) -> dict:
    record = db.get(User, user.id)
    assert record is not None
    sessions = [
        SessionInfo(
            id=s.id,
            device=s.device,
            ip=s.ip,
            created_at=s.created_at,
            last_seen_at=s.last_seen_at,
            current=(s.id == user.sid),
        )
        for s in record.sessions
        if not s.revoked
    ]
    profile = Me(
        id=record.id,
        email=record.email,
        name=record.name,
        role=record.role,
        mfa_active=record.mfa_active,
        mfa_active_since=record.mfa_active_since,
        sessions=sessions,
    )
    return envelope(profile.model_dump())


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(
    session_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: DbSession = Depends(get_db),
) -> Response:
    session = db.get(Session, session_id)
    if session is None or session.user_id != user.id:
        raise ProblemException(404, "Session not found", code="not_found")
    session.revoked = True
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
