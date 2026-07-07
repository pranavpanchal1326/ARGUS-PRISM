"""AutoSTR job + package models.

Law 3 is enforced at the schema boundary: ``Package.signature`` (the HMAC seal) is
stored server-side and is NEVER serialized to any response. The UI only ever sees the
``fingerprint`` (last 8 chars of the content SHA-256), labelled "Document fingerprint".
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, ForeignKey, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(UTC)


class StrJob(Base):
    __tablename__ = "autostr_jobs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="ASSEMBLING")  # ..SIGNING..SEALED..FAILED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    package_ids: Mapped[list] = mapped_column(JSON, default=list)
    error: Mapped[str | None] = mapped_column(String(255), nullable=True)


class Package(Base):
    __tablename__ = "autostr_packages"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    job_id: Mapped[str] = mapped_column(String(32), index=True)
    type: Mapped[str] = mapped_column(String(24))  # FIU_STR_XML | CBI_PDF | RBI_JSON
    filename: Mapped[str] = mapped_column(String(120))
    mime: Mapped[str] = mapped_column(String(80))
    content: Mapped[bytes] = mapped_column(LargeBinary)  # streamed on download (no filesystem)
    fingerprint: Mapped[str] = mapped_column(String(64))  # full SHA-256; only last 8 exposed
    # HMAC seal over the content. Stored, verified server-side, NEVER returned. (Law 3)
    signature: Mapped[str] = mapped_column(String(64))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    status: Mapped[str] = mapped_column(String(24), default="SEALED")  # SEALED | SUBMITTED
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
