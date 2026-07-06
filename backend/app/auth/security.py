"""Password hashing + JWT issue/verify.

JWTs are HS256 signed with ``JWT_SECRET``. Three token types:
  - ``access``  — 15 min, carries role + permissions for stateless authz
  - ``refresh`` — 7 days, carries a ``jti`` matched against the sessions table (rotation)
  - ``mfa``     — 5 min, binds the login step to the MFA-verify step

Law 3: tokens are never logged. Signing material never leaves this process.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings


class TokenError(Exception):
    """Raised when a token is invalid, expired, or of the wrong type."""


def _prepare(password: str) -> bytes:
    # bcrypt hard-limits the secret to 72 bytes; truncate deterministically.
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(_prepare(password), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def _now() -> datetime:
    return datetime.now(UTC)


def _encode(payload: dict[str, Any], ttl: timedelta, token_type: str) -> str:
    settings = get_settings()
    now = _now()
    body = {
        **payload,
        "token_type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
        "jti": payload.get("jti", uuid.uuid4().hex),
    }
    return jwt.encode(body, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: str, role: str, permissions: list[str], sid: str) -> str:
    settings = get_settings()
    return _encode(
        {"sub": user_id, "role": role, "permissions": permissions, "sid": sid},
        timedelta(minutes=settings.access_token_ttl_minutes),
        "access",
    )


def create_refresh_token(user_id: str, jti: str) -> str:
    settings = get_settings()
    return _encode(
        {"sub": user_id, "jti": jti},
        timedelta(days=settings.refresh_token_ttl_days),
        "refresh",
    )


def create_mfa_token(user_id: str) -> str:
    settings = get_settings()
    return _encode(
        {"sub": user_id},
        timedelta(minutes=settings.mfa_token_ttl_minutes),
        "mfa",
    )


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise TokenError(f"invalid token: {exc}") from exc
    if payload.get("token_type") != expected_type:
        raise TokenError(
            f"token type mismatch: expected {expected_type}, got {payload.get('token_type')}"
        )
    if "sub" not in payload:
        raise TokenError("token missing subject")
    return payload


def access_ttl_seconds() -> int:
    return get_settings().access_token_ttl_minutes * 60
