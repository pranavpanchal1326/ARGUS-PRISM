"""Append-only, HMAC-chained audit ledger + Case models.

Each audit entry chains to the previous via an HMAC, so any tampering (edit, delete,
reorder) breaks the chain and is caught by /audit/verify. The HMAC key lives only in
the backend env and never crosses the API boundary (Law 3) — the UI only ever sees the
*result* of the check ("Ledger intact ✓"), never the key.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(UTC)


class AuditEntry(Base):
    __tablename__ = "audit_log"

    seq: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    actor: Mapped[str] = mapped_column(String(255), index=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    target: Mapped[str] = mapped_column(String(255), default="")
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    prev_hash: Mapped[str] = mapped_column(String(64), default="")
    entry_hash: Mapped[str] = mapped_column(String(64), default="")


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="OPEN", index=True)
    account_ids: Mapped[list] = mapped_column(JSON, default=list)
    alert_ids: Mapped[list] = mapped_column(JSON, default=list)
    evidence: Mapped[list] = mapped_column(JSON, default=list)  # graph snapshots / exports
    created_by: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    notes: Mapped[list[CaseNote]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    activity: Mapped[list[CaseActivity]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )


class CaseNote(Base):
    __tablename__ = "case_notes"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    author: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    case: Mapped[Case] = relationship(back_populates="notes")


class CaseActivity(Base):
    __tablename__ = "case_activity"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    actor: Mapped[str] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(80))
    from_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    to_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    case: Mapped[Case] = relationship(back_populates="activity")
