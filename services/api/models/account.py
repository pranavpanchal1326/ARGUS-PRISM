from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

from .warmthscore import RiskLevel


class AccountStatus(str, Enum):
    ACTIVE = "ACTIVE"
    WARMING = "WARMING"            # WarmthScore 40-60, internal flag
    FLAGGED = "FLAGGED"            # WarmthScore 60-75, KYC triggered
    RESTRICTED = "RESTRICTED"      # WarmthScore 75+, outbound UPI blocked
    FROZEN = "FROZEN"              # WarmthScore 85+, full restriction
    CLEARED = "CLEARED"            # MLRO reviewed, false positive confirmed
    CONFIRMED_MULE = "CONFIRMED_MULE"  # Confirmed. STR filed. CBI package generated.


class AccountRiskProfile(BaseModel):
    """
    Risk snapshot for an account. Embedded in account responses.
    Sourced from WarmthScore engine output.
    """
    current_warmth_score: float = Field(ge=0.0, le=100.0)
    risk_level: RiskLevel
    taint_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    last_scored_at: Optional[datetime] = None
    restriction_active: bool = False
    autostr_filed: bool = False
    cbi_package_generated: bool = False


class AccountBase(BaseModel):
    account_id: str = Field(
        min_length=1, max_length=100,
        example="UBI-2026-DEMO-001"
    )
    branch_code: str = Field(
        min_length=4, max_length=20,
        example="UBI-MUM-042"
    )
    account_type: str = Field(
        pattern="^(SAVINGS|CURRENT|JAN_DHAN|NRI|OVERDRAFT)$",
        example="SAVINGS"
    )
    kyc_status: str = Field(
        pattern="^(COMPLETE|PENDING|REVERIFICATION_REQUIRED|FAILED)$",
        example="COMPLETE"
    )
    declared_occupation: Optional[str] = Field(
        default=None,
        description="Declared occupation from KYC. Used by Profile Mismatch Detector (Aditya).",
        example="Vegetable vendor"
    )
    mobile_number_hash: str = Field(
        description="SHA-256 hash of registered mobile. Raw mobile never stored in PRISM.",
        example="a3f2c1..."
    )
    created_at: datetime
    status: AccountStatus = AccountStatus.ACTIVE


class AccountResponse(AccountBase):
    risk_profile: AccountRiskProfile
    updated_at: datetime
