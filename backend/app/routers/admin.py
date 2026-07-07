"""Administration — user management + system health (PRD §5.10).

SYS_ADMIN only, and deliberately walled off from customer data. User invites are the
only way accounts are created (no public signup). Force-MFA-reset clears the secret so
the user re-enrols (a fresh, different secret) on next login.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import CurrentUser, require
from app.auth.rbac import Permission, Role
from app.auth.security import hash_password
from app.core.health import gather_health
from app.core.response import ProblemException, envelope
from app.db.session import get_db
from app.models.user import User
from app.services import audit
from app.simulator.engine import simulator

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


def _user_dict(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "role": u.role,
        "disabled": u.disabled,
        "mfa_active": u.mfa_active,
        "created_at": u.created_at.isoformat(),
    }


@router.get("/users")
def list_users(
    _user: CurrentUser = Depends(require(Permission.MANAGE_USERS)),
    db: DbSession = Depends(get_db),
) -> dict:
    rows = db.execute(select(User).order_by(User.created_at.asc())).scalars().all()
    return envelope([_user_dict(u) for u in rows])


class UserInvite(BaseModel):
    email: EmailStr
    name: str
    role: Role
    temp_password: str | None = None


@router.post("/users", status_code=201)
def invite_user(
    body: UserInvite,
    actor: CurrentUser = Depends(require(Permission.MANAGE_USERS)),
    db: DbSession = Depends(get_db),
) -> dict:
    existing = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if existing is not None:
        raise ProblemException(409, "User already exists", code="conflict")
    user = User(
        email=body.email,
        name=body.name,
        role=body.role.value,
        hashed_password=hash_password(body.temp_password) if body.temp_password else None,
    )
    db.add(user)
    audit.record(db, actor=actor.email, action="user.invite", target=body.email, detail={"role": body.role.value})
    db.commit()
    return envelope(_user_dict(user))


class UserUpdate(BaseModel):
    role: Role | None = None
    disabled: bool | None = None
    force_mfa_reset: bool | None = None


@router.patch("/users/{user_id}")
def update_user(
    user_id: str,
    body: UserUpdate,
    actor: CurrentUser = Depends(require(Permission.MANAGE_USERS)),
    db: DbSession = Depends(get_db),
) -> dict:
    user = db.get(User, user_id)
    if user is None:
        raise ProblemException(404, "User not found", code="not_found")
    changes: dict = {}
    if body.role is not None:
        user.role = body.role.value
        changes["role"] = body.role.value
    if body.disabled is not None:
        user.disabled = body.disabled
        changes["disabled"] = body.disabled
    if body.force_mfa_reset:
        # Clear MFA so the user re-enrols a fresh (different) secret next login.
        user.mfa_secret = None
        user.mfa_active = False
        user.mfa_active_since = None
        changes["mfa_reset"] = True
    audit.record(db, actor=actor.email, action="user.update", target=user.email, detail=changes)
    db.commit()
    return envelope(_user_dict(user))


@router.get("/health")
def admin_health(
    _user: CurrentUser = Depends(require(Permission.VIEW_SYSTEM_HEALTH)),
) -> dict:
    """Service status strip (brass lamps): API · Pipeline · Graph DB · Cache · Stream."""
    deps = gather_health()["dependencies"]
    return envelope(
        {
            "api": {"status": "up", "detail": "ok"},
            "pipeline": {
                "status": "up" if simulator.state != "idle" else "up",
                "detail": simulator.state,
            },
            "graph_db": deps.get("graph", {"status": "down", "detail": ""}),
            "cache": deps.get("redis", {"status": "down", "detail": ""}),
            "database": deps.get("database", {"status": "down", "detail": ""}),
            "assistant": deps.get("assistant", {"status": "disabled", "detail": ""}),
        }
    )
