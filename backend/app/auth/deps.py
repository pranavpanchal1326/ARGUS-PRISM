"""FastAPI dependencies for authentication and authorization.

``get_current_user`` decodes the access token and loads the user. ``require`` builds
a dependency that enforces a permission server-side — the UI's greyed-out buttons are
a courtesy; this is the real gate.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Depends, Request
from sqlalchemy.orm import Session as DbSession

from app.auth.rbac import Permission, permissions_for
from app.auth.security import TokenError, decode_token
from app.core.response import ProblemException
from app.db.session import get_db
from app.models.user import User


@dataclass
class CurrentUser:
    id: str
    email: str
    name: str
    role: str
    permissions: set[Permission]
    sid: str | None = None

    def can(self, permission: Permission) -> bool:
        return permission in self.permissions


def _bearer_token(request: Request) -> str:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise ProblemException(401, "Not authenticated", code="not_authenticated")
    return header[7:].strip()


def get_current_user(
    request: Request, db: DbSession = Depends(get_db)
) -> CurrentUser:
    token = _bearer_token(request)
    try:
        payload = decode_token(token, "access")
    except TokenError as exc:
        raise ProblemException(401, "Invalid or expired token", code="invalid_token") from exc

    user = db.get(User, payload["sub"])
    if user is None or user.disabled:
        raise ProblemException(401, "User not found or disabled", code="invalid_user")

    return CurrentUser(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        permissions=permissions_for(user.role),
        sid=payload.get("sid"),
    )


def require(permission: Permission) -> Callable[..., CurrentUser]:
    """Dependency factory enforcing a single permission."""

    def _dep(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not user.can(permission):
            raise ProblemException(
                403,
                "Insufficient role",
                detail=f"This action requires the '{permission.value}' permission.",
                code="forbidden",
            )
        return user

    return _dep
