"""Shared WarmthScore dataclasses (no cycles: signals/features/model/engine import here)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class TxnFeature:
    ts: datetime
    amount: float
    direction: str  # "IN" | "OUT" relative to the account
    channel: str = "UPI"


@dataclass
class ScoreInput:
    segment: str
    last_active: datetime
    opened_at: datetime
    transactions: list[TxnFeature] = field(default_factory=list)
    device_imeis: list[str] = field(default_factory=list)
    sim_swaps_72h: int = 0
    dormant_reactivated_new_device: bool = False


@dataclass
class ScoreResult:
    score: float
    signals: dict[str, float]           # raw 0..1 per signal code
    shap: list[dict]                    # [{code,label,contribution}] desc
    signals_fired: list[str]
    model: str = "rules"                # "xgboost" | "rules"
