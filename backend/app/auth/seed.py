"""Seed the four RBAC roles as demo users (development only).

These are *operator* accounts for the demo, not customer data. In production users
are created by SYS_ADMIN invite (POST /auth/register), never seeded. The seed runs
only outside production and only fills gaps — it never overwrites an existing user.
"""

from __future__ import annotations

import logging

from sqlalchemy import select

from app.auth.rbac import Role
from app.auth.security import hash_password
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.user import User

log = logging.getLogger("prism.auth.seed")

# Dev-only default password for every seeded operator account.
DEV_PASSWORD = "Prism@2026"

_SEED_USERS = [
    {"email": "mlro@unionbank.co.in", "name": "Kavya Rao (MLRO)", "role": Role.MLRO},
    {"email": "analyst@unionbank.co.in", "name": "Arjun Mehta (Analyst)", "role": Role.FRAUD_ANALYST},
    {"email": "auditor@unionbank.co.in", "name": "Neha Iyer (Auditor)", "role": Role.COMPLIANCE_AUDITOR},
    {"email": "admin@unionbank.co.in", "name": "Ops Admin", "role": Role.SYS_ADMIN},
]


def seed_users() -> None:
    settings = get_settings()
    if settings.is_production:
        return

    db = SessionLocal()
    try:
        created = 0
        for spec in _SEED_USERS:
            exists = db.execute(
                select(User).where(User.email == spec["email"])
            ).scalar_one_or_none()
            if exists:
                continue
            db.add(
                User(
                    email=spec["email"],
                    name=spec["name"],
                    role=spec["role"].value,
                    hashed_password=hash_password(DEV_PASSWORD),
                )
            )
            created += 1
        if created:
            db.commit()
            log.info(
                "Seeded %d operator accounts (dev password: %s). Emails: %s",
                created,
                DEV_PASSWORD,
                ", ".join(u["email"] for u in _SEED_USERS),
            )
    finally:
        db.close()
