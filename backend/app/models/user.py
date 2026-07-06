"""User + Session ORM models.

Security notes (Law 3): the TOTP secret lives in ``User.mfa_secret`` and is *never*
exposed by any schema, serialized into a response, or written to a log. It appears to
the client exactly once — inside the ``otpauth://`` URI returned by enrolment.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    # Null when the account is OAuth-only (no local password).
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="FRAUD_ANALYST")

    # MFA — secret is write-once from the app's perspective and never serialized.
    mfa_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mfa_active: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_active_since: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    sessions: Mapped[list[Session]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Session(Base):
    """A refresh-token session. The refresh token's ``jti`` is stored here so it can
    be rotated (issue new, revoke old) and individually revoked from the profile."""

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    refresh_jti: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    device: Mapped[str] = mapped_column(String(255), default="unknown")
    ip: Mapped[str] = mapped_column(String(64), default="unknown")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="sessions")
