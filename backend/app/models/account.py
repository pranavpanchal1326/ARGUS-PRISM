"""Account, Transaction, Device, ScoreHistory ORM models.

These hold the *real* (simulated) banking data. Every WarmthScore, alert, and graph
node is computed from rows here — nothing is hardcoded (Law 2).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(UTC)


class Account(Base):
    __tablename__ = "accounts"

    # Human account reference, e.g. UBI-2026-000042. Also the masked ref shown in UI.
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    holder_name: Mapped[str] = mapped_column(String(255))
    branch: Mapped[str] = mapped_column(String(120), default="Mumbai Main")
    ifsc: Mapped[str] = mapped_column(String(16), default="UBIN0000001")
    segment: Mapped[str] = mapped_column(String(40), default="retail")  # salary/business/…
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_active: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    kyc_status: Mapped[str] = mapped_column(String(40), default="VERIFIED")
    status: Mapped[str] = mapped_column(String(24), default="ACTIVE")
    status_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Scoring state (recomputed by the engine; never hand-set).
    warmth_score: Mapped[float] = mapped_column(Float, default=0.0)
    severity: Mapped[str] = mapped_column(String(16), default="CLEAN")
    response_tier: Mapped[int] = mapped_column(Integer, default=0)
    signals: Mapped[dict] = mapped_column(JSON, default=dict)  # S1..S6 raw
    shap: Mapped[list] = mapped_column(JSON, default=list)     # top contributions

    # Taint propagation state.
    tainted: Mapped[bool] = mapped_column(Boolean, default=False)
    taint_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Simulator provenance (which campaign minted this account); null for legit pop.
    campaign: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_ground_truth_mule: Mapped[bool] = mapped_column(Boolean, default=False)

    devices: Mapped[list[Device]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    src_account: Mapped[str | None] = mapped_column(
        ForeignKey("accounts.id"), nullable=True, index=True
    )
    dst_account: Mapped[str | None] = mapped_column(
        ForeignKey("accounts.id"), nullable=True, index=True
    )
    amount: Mapped[float] = mapped_column(Float)
    channel: Mapped[str] = mapped_column(String(24), default="UPI")  # UPI/IMPS/NEFT/CASH
    direction: Mapped[str] = mapped_column(String(8), default="OUT")  # IN/OUT (rel to src)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    imei: Mapped[str] = mapped_column(String(32))
    event_type: Mapped[str] = mapped_column(String(40), default="REGISTERED")  # SIM_SWAP…
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    account: Mapped[Account] = relationship(back_populates="devices")


class ScoreHistory(Base):
    """A point on an account's WarmthScore trajectory, with signals + SHAP snapshot."""

    __tablename__ = "score_history"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    score: Mapped[float] = mapped_column(Float)
    severity: Mapped[str] = mapped_column(String(16))
    signals: Mapped[dict] = mapped_column(JSON, default=dict)
    shap: Mapped[list] = mapped_column(JSON, default=list)
