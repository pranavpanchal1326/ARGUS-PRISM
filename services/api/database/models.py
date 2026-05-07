import os
from datetime import datetime
from typing import List, Optional, Any
import uuid

from sqlalchemy import (
    String, Boolean, Float, Integer, DateTime, ForeignKey, text, CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.dialects.postgresql import JSONB, UUID

# Environment configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://prism_user:prism_pass@localhost:5432/prism_db"
)

# Replace 'postgresql://' with 'postgresql+asyncpg://' if needed for async engine
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    """Dependency for FastAPI"""
    async with AsyncSessionLocal() as session:
        yield session

class Base(DeclarativeBase):
    pass


class Account(Base):
    __tablename__ = "accounts"

    account_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    account_holder_name: Mapped[str] = mapped_column(String(200), nullable=False)
    account_type: Mapped[str] = mapped_column(String(20), nullable=False)
    branch_code: Mapped[str] = mapped_column(String(10), nullable=False)
    ifsc_code: Mapped[str] = mapped_column(String(11), nullable=False)
    mobile_number: Mapped[str] = mapped_column(String(15), nullable=False)
    kyc_status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="COMPLETE")
    account_status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="ACTIVE")
    upi_registered: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    upi_device_imei: Mapped[Optional[str]] = mapped_column(String(15))
    upi_registered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    account_opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_transaction_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    dormancy_days: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    current_warmth_score: Mapped[float] = mapped_column(Float, server_default=text("0.0"))
    warmth_risk_level: Mapped[str] = mapped_column(String(20), server_default="CLEAN")
    taint_score: Mapped[float] = mapped_column(Float, server_default=text("0.0"))
    is_confirmed_mule: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))

    # Relationships
    warmth_scores: Mapped[List["WarmthScore"]] = relationship(back_populates="account")
    alerts: Mapped[List["Alert"]] = relationship(back_populates="account")
    cases: Mapped[List["Case"]] = relationship(back_populates="account")
    autostr_packages: Mapped[List["AutoSTRPackage"]] = relationship(back_populates="account")
    device_events: Mapped[List["DeviceEvent"]] = relationship(back_populates="account")

    def __repr__(self) -> str:
        return f"<Account {self.account_id} - {self.warmth_risk_level}>"


class WarmthScore(Base):
    __tablename__ = "warmth_scores"

    score_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    account_id: Mapped[str] = mapped_column(String(20), ForeignKey("accounts.account_id"), nullable=False)
    warmth_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)
    signal_1_score: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0.0"))
    signal_2_score: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0.0"))
    signal_3_score: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0.0"))
    signal_4_score: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0.0"))
    signal_5_score: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0.0"))
    signal_6_score: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0.0"))
    shap_top1_signal: Mapped[Optional[str]] = mapped_column(String(50))
    shap_top1_impact: Mapped[Optional[float]] = mapped_column(Float)
    shap_top2_signal: Mapped[Optional[str]] = mapped_column(String(50))
    shap_top2_impact: Mapped[Optional[float]] = mapped_column(Float)
    shap_top3_signal: Mapped[Optional[str]] = mapped_column(String(50))
    shap_top3_impact: Mapped[Optional[float]] = mapped_column(Float)
    fri_score_numeric: Mapped[Optional[int]] = mapped_column(Integer)
    fri_risk_tier: Mapped[Optional[str]] = mapped_column(String(20))
    sim_swap_detected: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    device_switch_detected: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    computation_duration_ms: Mapped[Optional[int]] = mapped_column(Integer)

    __table_args__ = (
        CheckConstraint("warmth_score >= 0 AND warmth_score <= 100", name="chk_warmth_score_range"),
    )

    # Relationships
    account: Mapped["Account"] = relationship(back_populates="warmth_scores")
    alerts: Mapped[List["Alert"]] = relationship(back_populates="score")

    def __repr__(self) -> str:
        return f"<WarmthScore {self.score_id} - Score: {self.warmth_score}>"


class Alert(Base):
    __tablename__ = "alerts"

    alert_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    account_id: Mapped[str] = mapped_column(String(20), ForeignKey("accounts.account_id"), nullable=False)
    score_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("warmth_scores.score_id"))
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    warmth_score_at_alert: Mapped[float] = mapped_column(Float, nullable=False)
    threshold_crossed: Mapped[float] = mapped_column(Float, nullable=False)
    primary_signal: Mapped[Optional[str]] = mapped_column(String(50))
    alert_message: Mapped[str] = mapped_column(String, nullable=False) # Changed from TEXT to String for SQLAlchemy
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(100))
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_false_positive: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    false_positive_reason: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))

    # Relationships
    account: Mapped["Account"] = relationship(back_populates="alerts")
    score: Mapped[Optional["WarmthScore"]] = relationship(back_populates="alerts")

    def __repr__(self) -> str:
        return f"<Alert {self.alert_id} - {self.alert_type}>"


class Case(Base):
    __tablename__ = "cases"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    account_id: Mapped[str] = mapped_column(String(20), ForeignKey("accounts.account_id"), nullable=False)
    case_status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="OPEN")
    assigned_mlro: Mapped[Optional[str]] = mapped_column(String(100))
    peak_warmth_score: Mapped[Optional[float]] = mapped_column(Float)
    peak_risk_level: Mapped[Optional[str]] = mapped_column(String(20))
    autostr_triggered: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    autostr_triggered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    fiu_str_filed: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    fiu_str_filed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    fiu_str_reference: Mapped[Optional[str]] = mapped_column(String(100))
    cbi_package_generated: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    cbi_package_generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    rbi_report_included: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    mlro_notes: Mapped[Optional[str]] = mapped_column(String)
    mlro_decision: Mapped[Optional[str]] = mapped_column(String(50))
    mlro_decision_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    legal_authority_used: Mapped[Optional[str]] = mapped_column(String(100))
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))

    # Relationships
    account: Mapped["Account"] = relationship(back_populates="cases")
    autostr_packages: Mapped[List["AutoSTRPackage"]] = relationship(back_populates="case")

    def __repr__(self) -> str:
        return f"<Case {self.case_id} - {self.case_status}>"


class AutoSTRPackage(Base):
    __tablename__ = "autostr_packages"

    package_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.case_id"), nullable=False)
    account_id: Mapped[str] = mapped_column(String(20), ForeignKey("accounts.account_id"), nullable=False)
    package_type: Mapped[str] = mapped_column(String(20), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_hash_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    generation_duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    warmth_score_at_generation: Mapped[float] = mapped_column(Float, nullable=False)
    legal_mandate: Mapped[Optional[str]] = mapped_column(String(200))
    is_submitted: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    submitted_by: Mapped[Optional[str]] = mapped_column(String(100))
    submission_reference: Mapped[Optional[str]] = mapped_column(String(200))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))

    __table_args__ = (
        UniqueConstraint("case_id", "package_type", name="autostr_packages_case_type_key"),
        CheckConstraint("length(file_hash_sha256) = 64", name="chk_file_hash_length")
    )

    # Relationships
    case: Mapped["Case"] = relationship(back_populates="autostr_packages")
    account: Mapped["Account"] = relationship(back_populates="autostr_packages")

    def __repr__(self) -> str:
        return f"<AutoSTRPackage {self.package_id} - {self.package_type}>"


class AuditLog(Base):
    __tablename__ = "audit_log"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    actor: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    target_type: Mapped[Optional[str]] = mapped_column(String(50))
    target_id: Mapped[Optional[str]] = mapped_column(String(100))
    details: Mapped[Optional[Any]] = mapped_column(JSONB)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    session_id: Mapped[Optional[str]] = mapped_column(String(100))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))

    def __repr__(self) -> str:
        return f"<AuditLog {self.log_id} - {self.action} by {self.actor}>"


class DeviceEvent(Base):
    __tablename__ = "device_events"

    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    account_id: Mapped[str] = mapped_column(String(20), ForeignKey("accounts.account_id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    imei: Mapped[Optional[str]] = mapped_column(String(15))
    iccid: Mapped[Optional[str]] = mapped_column(String(20))
    device_model: Mapped[Optional[str]] = mapped_column(String(100))
    sim_operator: Mapped[Optional[str]] = mapped_column(String(50))
    mobile_number: Mapped[Optional[str]] = mapped_column(String(15))
    imei_cluster_proximity_score: Mapped[float] = mapped_column(Float, server_default=text("0.0"))
    is_flagged: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"))
    flag_reason: Mapped[Optional[str]] = mapped_column(String(200))
    event_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))

    # Relationships
    account: Mapped["Account"] = relationship(back_populates="device_events")

    def __repr__(self) -> str:
        return f"<DeviceEvent {self.event_id} - {self.event_type}>"
