from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

from ..config import get_settings


class SignalName(str, Enum):
    """
    Canonical signal identifiers used across PRISM.
    These string values appear in SHAP output, audit logs,
    MLRO dashboard, and CBI evidence packages.
    Never rename after deployment — they become legal identifiers.
    """
    TEST_CREDIT_PATTERN = "test_credit_pattern"
    DEVICE_FINGERPRINT = "device_fingerprint"
    VELOCITY_DERIVATIVE = "velocity_derivative"
    DORMANT_REACTIVATION = "dormant_reactivation"
    FRI_CONTRADICTION = "fri_contradiction"
    SIM_SWAP_VELOCITY = "sim_swap_velocity"


class SignalStatus(str, Enum):
    FIRED = "FIRED"
    CLEAN = "CLEAN"
    PENDING = "PENDING"
    ERROR = "ERROR"


class SignalResult(BaseModel):
    """
    Result of evaluating a single WarmthScore signal.
    Produced by each signal processor. Consumed by XGBoost ensemble.
    """
    signal_name: SignalName = Field(
        description="Canonical signal identifier",
        example=SignalName.TEST_CREDIT_PATTERN
    )
    status: SignalStatus = Field(
        description="Whether this signal fired, was clean, or errored",
        example=SignalStatus.FIRED
    )
    raw_score: float = Field(
        ge=0.0, le=1.0,
        description="Raw signal score before ensemble weighting. 0.0=clean, 1.0=maximum anomaly.",
        example=0.82
    )
    weighted_contribution: float = Field(
        ge=0.0, le=100.0,
        description="This signal's contribution to final WarmthScore after weight applied.",
        example=14.76
    )
    weight: float = Field(
        ge=0.0, le=1.0,
        description="Signal weight in ensemble. Must match documented weights. Never change without MLRO approval.",
        example=0.18
    )
    evidence: Dict[str, Any] = Field(
        description="Signal-specific evidence fields. Contents vary by signal type. Used in CBI package.",
        example={"micro_credit_count": 5, "total_micro_amount": 1250.0, "time_window_hours": 36}
    )
    evaluated_at: datetime = Field(
        description="UTC timestamp when this signal was evaluated",
        example="2026-03-15T10:30:00Z"
    )
    error_detail: Optional[str] = Field(
        default=None,
        description="Populated only when status=ERROR. Human-readable error. Never expose raw exception.",
        example="DoT DIP API timeout after 5s"
    )

    @model_validator(mode="after")
    def validate_weighted_contribution(self) -> "SignalResult":
        expected = self.raw_score * self.weight * 100.0
        if abs(self.weighted_contribution - expected) > 0.01:
            raise ValueError(f"weighted_contribution ({self.weighted_contribution}) does not match raw_score * weight * 100 ({expected})")
        return self


class SHAPAttribution(BaseModel):
    """
    SHAP value for a single signal's contribution to WarmthScore.
    Mandatory for MLRO regulatory compliance and CBI evidence package.
    """
    signal_name: SignalName
    shap_value: float = Field(
        description="Raw SHAP value. Positive = increases score. Negative = decreases score.",
        example=14.32
    )
    abs_shap_value: float = Field(
        ge=0.0,
        description="Absolute SHAP value for ranking. Used to determine top-3 signals.",
        example=14.32
    )
    direction: str = Field(
        description="INCREASING or DECREASING — human readable direction for MLRO",
        pattern="^(INCREASING|DECREASING)$",
        example="INCREASING"
    )
    plain_english: str = Field(
        description="One sentence explanation for MLRO who is not a data scientist. Mandatory.",
        example="5 micro-credits totalling ₹1,250 from 3 dormant source accounts within 36 hours strongly indicates account warming."
    )


class SHAPExplanation(BaseModel):
    """
    Complete SHAP explanation for a WarmthScore computation.
    """
    top_3: List[SHAPAttribution] = Field(
        min_length=1, max_length=3,
        description="Top 3 signals by absolute SHAP value. Shown prominently in MLRO dashboard."
    )
    all_signals: List[SHAPAttribution] = Field(
        min_length=6, max_length=6,
        description="All 6 signal attributions. Always exactly 6. Used in CBI evidence package."
    )
    base_score: float = Field(
        ge=0.0, le=100.0,
        description="XGBoost base value before signal contributions. Typically near dataset mean.",
        example=23.4
    )
    model_version: str = Field(
        description="WarmthScore model version. Immutable once deployed. Used for audit trail.",
        example="warmthscore-xgb-v2.1.0"
    )

    @model_validator(mode="after")
    def validate_shap_signals(self) -> "SHAPExplanation":
        if len(self.all_signals) != 6:
            raise ValueError("SHAPExplanation requires exactly 6 signals in all_signals")
        seen = set()
        for attr in self.all_signals:
            if attr.signal_name in seen:
                raise ValueError(f"Duplicate signal_name {attr.signal_name} in SHAPExplanation")
            seen.add(attr.signal_name)
        return self


class RiskLevel(str, Enum):
    """
    WarmthScore risk classification.
    Maps directly to legal action thresholds.
    """
    CLEAN = "CLEAN"          # 0-40
    WARMING = "WARMING"      # 40-60
    HOT = "HOT"              # 60-75
    CRITICAL = "CRITICAL"    # 75-85
    IMMINENT = "IMMINENT"    # 85-100


class LegalAction(BaseModel):
    """
    Legal action triggered at this WarmthScore level.
    """
    action_code: str = Field(
        description="Machine-readable action identifier",
        example="KYC_REVERIFICATION"
    )
    description: str = Field(
        description="Human-readable action description for MLRO",
        example="KYC re-verification triggered. Branch call or Video KYC required."
    )
    legal_authority: str = Field(
        description="Specific legal provision authorising this action",
        example="RBI KYC Master Direction 2016, Section 38"
    )
    requires_court_order: bool = Field(
        description="Whether this action requires court authorisation. Below 85: always False.",
        example=False
    )
    requires_mlro_approval: bool = Field(
        description="Whether MLRO must approve before action executes",
        example=True
    )
    auto_executable: bool = Field(
        description="Whether PRISM can execute this automatically without human approval",
        example=False
    )


class WarmthScoreResponse(BaseModel):
    """
    Complete WarmthScore computation result.
    Primary output of the WarmthScore engine.
    """
    account_id: str = Field(
        description="Union Bank account identifier",
        example="UBI-2026-DEMO-001"
    )
    warmth_score: float = Field(
        ge=0.0, le=100.0,
        description="Final WarmthScore 0-100. Higher = greater mule probability.",
        example=84.0
    )
    risk_level: RiskLevel = Field(
        description="Risk classification derived from warmth_score",
        example=RiskLevel.CRITICAL
    )
    legal_actions: List[LegalAction] = Field(
        description="Legal actions triggered at this score level. Empty list for CLEAN.",
        min_length=0
    )
    signals: List[SignalResult] = Field(
        min_length=6, max_length=6,
        description="Results for all 6 signals. Always exactly 6 entries."
    )
    shap_explanation: SHAPExplanation = Field(
        description="SHAP attribution for regulatory compliance and CBI evidence"
    )
    fri_score: Optional[str] = Field(
        default=None,
        description="FRI risk tier from DoT DIP API. LOW/MEDIUM/HIGH/VERY_HIGH. Null if API unavailable.",
        example="LOW"
    )
    fri_contradiction_detected: bool = Field(
        description="True when FRI=LOW but WarmthScore>=60. This is Signal 5. The anti-evasion detector.",
        example=True
    )
    taint_score: Optional[float] = Field(
        default=None,
        ge=0.0, le=100.0,
        description="Taint score from Aditya's Taint Engine. Read-only. Never computed by Pranav's code.",
        example=75.0
    )
    taint_applied: bool = Field(
        description="Whether taint_score was used as WarmthScore starting point instead of 0",
        example=False
    )
    account_age_hours: float = Field(
        ge=0.0,
        description="Account age in hours at time of scoring. Critical for Signal 1 context.",
        example=71.5
    )
    computed_at: datetime = Field(
        description="UTC timestamp of this computation",
        example="2026-03-15T10:30:00Z"
    )
    computation_duration_ms: float = Field(
        ge=0.0,
        description="Time taken to compute this score in milliseconds. SLA target: < 200ms.",
        example=143.2
    )
    model_version: str = Field(
        description="WarmthScore model version for audit trail",
        example="warmthscore-xgb-v2.1.0"
    )

    @model_validator(mode="after")
    def validate_warmthscore(self) -> "WarmthScoreResponse":
        # Rule 1: Risk Level matches Warmth Score range
        settings = get_settings()
        expected_level = RiskLevel.CLEAN
        if self.warmth_score >= settings.warmth_threshold_autostr:
            expected_level = RiskLevel.IMMINENT
        elif self.warmth_score >= settings.warmth_threshold_restriction:
            expected_level = RiskLevel.CRITICAL
        elif self.warmth_score >= settings.warmth_threshold_kyc:
            expected_level = RiskLevel.HOT
        elif self.warmth_score >= settings.warmth_threshold_monitoring:
            expected_level = RiskLevel.WARMING

        if self.risk_level != expected_level:
            raise ValueError(f"risk_level {self.risk_level} does not match warmth_score {self.warmth_score}. Expected {expected_level}.")

        # Rule 2: Exactly 6 signals
        if len(self.signals) != 6:
            raise ValueError("WarmthScore requires exactly 6 signal results")

        # Rule 3: FRI Contradiction Logic
        if self.fri_score == "LOW" and self.warmth_score >= 60.0:
            if not self.fri_contradiction_detected:
                raise ValueError("fri_contradiction_detected must be True when fri_score is LOW and warmth_score >= 60")
        
        return self


class WarmthScoreTimelinePoint(BaseModel):
    """
    A single point in the WarmthScore timeline.
    """
    hour: int = Field(
        ge=0, le=720,
        description="Hour offset from account creation. 0=account created.",
        example=60
    )
    score: float = Field(
        ge=0.0, le=100.0,
        description="WarmthScore at this hour",
        example=77.0
    )
    risk_level: RiskLevel
    signals_fired: List[SignalName] = Field(
        description="Signals that fired or updated at this hour. Empty if no change.",
        example=[SignalName.DORMANT_REACTIVATION, SignalName.FRI_CONTRADICTION]
    )
    threshold_crossed: Optional[str] = Field(
        default=None,
        description="Name of threshold crossed at this hour, if any. Used for dashboard annotations.",
        example="RESTRICTION_THRESHOLD"
    )
    legal_action_triggered: Optional[str] = Field(
        default=None,
        description="Legal action triggered at this hour if threshold crossed",
        example="KYC_REVERIFICATION"
    )
    annotation: Optional[str] = Field(
        default=None,
        description="Human-readable annotation for MLRO. Shown as tooltip in dashboard.",
        example="Signal 4 fired: account dormant 14 months, new device detected"
    )


class WarmthScoreTimelineResponse(BaseModel):
    """
    Complete 72-hour WarmthScore timeline for an account.
    Powers the animated Account Timeline view in MLRO dashboard.
    """
    account_id: str
    timeline: List[WarmthScoreTimelinePoint] = Field(
        description="Chronological list of score points. Minimum 1, maximum 720.",
        min_length=1
    )
    account_created_at: datetime
    scoring_started_at: datetime
    current_score: float = Field(ge=0.0, le=100.0)
    current_risk_level: RiskLevel
    peak_score: float = Field(ge=0.0, le=100.0)
    peak_hour: int = Field(ge=0)
    restriction_triggered_at_hour: Optional[int] = Field(
        default=None,
        description="Hour at which account was restricted. Null if not yet restricted.",
        example=60
    )
    autostr_triggered_at_hour: Optional[int] = Field(
        default=None,
        description="Hour at which AutoSTR was initiated. Null if not yet initiated.",
        example=None
    )


class ComputeWarmthScoreRequest(BaseModel):
    """
    Request to trigger WarmthScore computation for an account.
    """
    account_id: str = Field(
        min_length=1, max_length=100,
        description="Account to score",
        example="UBI-2026-DEMO-001"
    )
    trigger_reason: str = Field(
        description="Why this computation was triggered. Mandatory for audit trail.",
        example="TRANSACTION_EVENT",
        pattern="^(TRANSACTION_EVENT|DEVICE_EVENT|KYC_EVENT|MANUAL_MLRO|SCHEDULED)$"
    )
    triggered_by: str = Field(
        description="System or user that triggered this computation",
        example="flink-stream-processor"
    )
    include_taint: bool = Field(
        default=True,
        description="Whether to fetch and apply taint score from Aditya's Taint Engine"
    )
    force_recompute: bool = Field(
        default=False,
        description="If True, bypass Redis cache and recompute from scratch. Use sparingly."
    )
