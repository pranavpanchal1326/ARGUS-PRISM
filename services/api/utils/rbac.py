"""
services/api/utils/rbac.py

Role-Based Access Control for ARGUS-PRISM.

Four roles per the PRISM security architecture (Section 6.2, Layer 3):
    MLRO          — Read cases, approve STR, escalate to CBI, freeze campaigns
    FRAUD_ANALYST — Read cases and alerts, cannot approve or take legal action
    ADMIN         — Configuration only, cannot read case data
    AUDIT         — Immutable audit log access only

Auth mechanism:
    Demo/hackathon: HTTP headers X-PRISM-User and X-PRISM-Role
    Production: Bearer JWT (drop-in replacement — swap get_current_user impl only)

Usage in routes:
    from services.api.utils.rbac import require_role, UserRole

    @router.get("/cases")
    async def list_cases(user = Depends(require_role(UserRole.MLRO, UserRole.FRAUD_ANALYST))):
        ...
"""

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request, status

logger = logging.getLogger("prism.rbac")


# ---------------------------------------------------------------------------
# Role definitions
# ---------------------------------------------------------------------------

class UserRole(str, Enum):
    """
    PRISM RBAC roles.
    Stored as strings so they serialise cleanly to JSON logs.
    """
    MLRO          = "MLRO"           # Money Laundering Reporting Officer
    FRAUD_ANALYST = "FRAUD_ANALYST"  # Read-only investigation
    ADMIN         = "ADMIN"          # System configuration only
    AUDIT         = "AUDIT"          # Audit trail access only


# ---------------------------------------------------------------------------
# Role → permission matrix
# ---------------------------------------------------------------------------

class Permission(str, Enum):
    READ_CASES          = "read_cases"
    READ_ALERTS         = "read_alerts"
    APPROVE_STR         = "approve_str"
    CONFIRM_MULE        = "confirm_mule"
    FREEZE_CAMPAIGN     = "freeze_campaign"
    CONFIGURE_SYSTEM    = "configure_system"
    READ_AUDIT_LOG      = "read_audit_log"
    READ_RECRUITER_MAP  = "read_recruiter_map"
    READ_TIMELINE       = "read_timeline"
    DECRYPT_PII         = "decrypt_pii"


_ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.MLRO: {
        Permission.READ_CASES,
        Permission.READ_ALERTS,
        Permission.APPROVE_STR,
        Permission.CONFIRM_MULE,
        Permission.FREEZE_CAMPAIGN,
        Permission.READ_RECRUITER_MAP,
        Permission.READ_TIMELINE,
        Permission.DECRYPT_PII,
    },
    UserRole.FRAUD_ANALYST: {
        Permission.READ_CASES,
        Permission.READ_ALERTS,
        Permission.READ_RECRUITER_MAP,
        Permission.READ_TIMELINE,
    },
    UserRole.ADMIN: {
        Permission.CONFIGURE_SYSTEM,
    },
    UserRole.AUDIT: {
        Permission.READ_AUDIT_LOG,
        Permission.READ_CASES,   # Read-only, no PII
        Permission.READ_ALERTS,
    },
}


def has_permission(role: UserRole, permission: Permission) -> bool:
    return permission in _ROLE_PERMISSIONS.get(role, set())


# ---------------------------------------------------------------------------
# Current user extraction
# ---------------------------------------------------------------------------

@dataclass
class RBACUser:
    """Authenticated request principal."""
    username:   str
    role:       UserRole
    session_id: Optional[str] = None


async def get_current_user(
    x_prism_user: str = Header(default="anonymous", alias="X-PRISM-User"),
    x_prism_role: str = Header(default="FRAUD_ANALYST", alias="X-PRISM-Role"),
    x_prism_session: Optional[str] = Header(default=None, alias="X-PRISM-Session"),
) -> RBACUser:
    """
    Extract authenticated user from request headers.

    In production, replace this with JWT validation:
        token = Header(alias="Authorization")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["RS256"])
        return RBACUser(username=payload["sub"], role=UserRole(payload["role"]))

    Demo mode: headers are trusted as-is. No signature verification.
    """
    try:
        role = UserRole(x_prism_role.upper())
    except ValueError:
        logger.warning(f"Unknown role attempted: {x_prism_role!r} by user {x_prism_user!r}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unknown role: {x_prism_role!r}. Valid roles: {[r.value for r in UserRole]}",
        )

    return RBACUser(
        username=x_prism_user,
        role=role,
        session_id=x_prism_session,
    )


# ---------------------------------------------------------------------------
# Dependency factory
# ---------------------------------------------------------------------------

def require_role(*allowed_roles: UserRole):
    """
    FastAPI dependency factory that enforces role-based access.

    Usage:
        @router.post("/approve")
        async def approve_str(user = Depends(require_role(UserRole.MLRO))):
            ...

    Multiple roles = OR logic (any of the listed roles is permitted).
    """
    async def _check_role(user: RBACUser = Depends(get_current_user)) -> RBACUser:
        if user.role not in allowed_roles:
            logger.warning(
                f"RBAC DENIED — user={user.username!r} role={user.role.value} "
                f"attempted action requiring {[r.value for r in allowed_roles]}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Insufficient permissions",
                    "your_role": user.role.value,
                    "required_roles": [r.value for r in allowed_roles],
                },
            )
        logger.debug(
            f"RBAC ALLOWED — user={user.username!r} role={user.role.value}"
        )
        return user

    return _check_role


def require_permission(permission: Permission):
    """
    FastAPI dependency factory that enforces a specific permission.
    More granular than role checking when needed.
    """
    async def _check_permission(user: RBACUser = Depends(get_current_user)) -> RBACUser:
        if not has_permission(user.role, permission):
            logger.warning(
                f"PERMISSION DENIED — user={user.username!r} role={user.role.value} "
                f"missing permission={permission.value}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Permission denied",
                    "required_permission": permission.value,
                    "your_role": user.role.value,
                },
            )
        return user

    return _check_permission
