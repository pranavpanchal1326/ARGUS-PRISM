"""Alert + Event ORM models.

Alerts are raised by the scoring pipeline when an account crosses WARMING. Events are
the append-only, monotonically-numbered stream the Live Feed replays and backfills.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(UTC)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    account_ref: Mapped[str] = mapped_column(String(64))  # masked reference for UI
    warmth_score: Mapped[float] = mapped_column(Float)
    severity: Mapped[str] = mapped_column(String(16), index=True)
    status: Mapped[str] = mapped_column(String(24), default="NEW", index=True)
    top_signals: Mapped[list] = mapped_column(JSON, default=list)  # top-2 SHAP tags
    first_signal_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    sla_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    taint_linked: Mapped[bool] = mapped_column(Boolean, default=False)
    assignee: Mapped[str | None] = mapped_column(String(255), nullable=True)
    case_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


class Event(Base):
    """Append-only feed event. ``id`` is a monotonic integer so the client can detect
    gaps and backfill via /feed/recent?after_id=."""

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String(40), index=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
