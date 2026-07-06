"""Role-based access control.

Roles and their permissions come straight from PRD §3. Permissions are enforced
server-side on every protected endpoint (never trust the UI) and also drive UI
visibility via ``GET /auth/me`` → role. SYS_ADMIN is deliberately walled off from
customer data — a talking point: *admins can't see alerts, cases, or PII*.
"""

from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    MLRO = "MLRO"
    FRAUD_ANALYST = "FRAUD_ANALYST"
    COMPLIANCE_AUDITOR = "COMPLIANCE_AUDITOR"
    SYS_ADMIN = "SYS_ADMIN"


class Permission(str, Enum):
    # Investigation
    VIEW_ALERTS = "view_alerts"
    VIEW_ACCOUNTS = "view_accounts"
    VIEW_GRAPH = "view_graph"
    VIEW_CASES = "view_cases"
    ANNOTATE_CASE = "annotate_case"
    ESCALATE = "escalate"
    RUN_ASSISTANT = "run_assistant"
    # Privileged actions
    FREEZE = "freeze"
    APPROVE_STR = "approve_str"
    VIEW_PII = "view_pii"
    CLOSE_CASE = "close_case"
    # Compliance
    VIEW_AUDIT = "view_audit"
    VIEW_REPORTS = "view_reports"
    # Administration
    MANAGE_USERS = "manage_users"
    VIEW_SYSTEM_HEALTH = "view_system_health"
    CONTROL_SIMULATOR = "control_simulator"


_ROLE_PERMISSIONS: dict[Role, set[Permission]] = {
    Role.MLRO: {
        # Everything on the investigation + compliance side.
        Permission.VIEW_ALERTS,
        Permission.VIEW_ACCOUNTS,
        Permission.VIEW_GRAPH,
        Permission.VIEW_CASES,
        Permission.ANNOTATE_CASE,
        Permission.ESCALATE,
        Permission.RUN_ASSISTANT,
        Permission.FREEZE,
        Permission.APPROVE_STR,
        Permission.VIEW_PII,
        Permission.CLOSE_CASE,
        Permission.VIEW_AUDIT,
        Permission.VIEW_REPORTS,
    },
    Role.FRAUD_ANALYST: {
        Permission.VIEW_ALERTS,
        Permission.VIEW_ACCOUNTS,
        Permission.VIEW_GRAPH,
        Permission.VIEW_CASES,
        Permission.ANNOTATE_CASE,
        Permission.ESCALATE,
        Permission.RUN_ASSISTANT,
        # No freeze, no STR approval, sees masked PII only.
    },
    Role.COMPLIANCE_AUDITOR: {
        Permission.VIEW_AUDIT,
        Permission.VIEW_REPORTS,
        Permission.VIEW_CASES,  # read-only case history
    },
    Role.SYS_ADMIN: {
        Permission.MANAGE_USERS,
        Permission.VIEW_SYSTEM_HEALTH,
        Permission.CONTROL_SIMULATOR,
        # Deliberately no VIEW_ALERTS / VIEW_ACCOUNTS / VIEW_PII / VIEW_CASES.
    },
}


def permissions_for(role: Role | str) -> set[Permission]:
    if isinstance(role, str):
        role = Role(role)
    return _ROLE_PERMISSIONS.get(role, set())


def role_has(role: Role | str, permission: Permission) -> bool:
    return permission in permissions_for(role)


def mfa_mandatory(role: Role | str) -> bool:
    """TOTP is mandatory for MLRO & SYS_ADMIN, optional-but-nagged for others."""
    if isinstance(role, str):
        role = Role(role)
    return role in {Role.MLRO, Role.SYS_ADMIN}
