# ═══════════════════════════════════════
# ARGUS-PRISM | warmthscore.py
# Engine: WarmthScore
# Branch: pranav/api
# ═══════════════════════════════════════
from typing import List, Optional

from pydantic import BaseModel


class SignalBreakdown(BaseModel):
    signal_id: int
    signal_name: str
    score: float
    weighted_contribution: float
    fired: bool
    description: str


class SHAPAttribution(BaseModel):
    signal_name: str
    impact: float
    direction: str


class WarmthScoreResponse(BaseModel):
    account_id: str
    warmth_score: float
    risk_level: str
    signals: List[SignalBreakdown]
    shap_top3: List[SHAPAttribution]
    taint_score: float
    effective_score: float
    legal_action: str
    legal_authority: str
    timestamp: str


class WarmthTimelinePoint(BaseModel):
    hour: int
    score: float
    event: Optional[str]


class WarmthTimelineResponse(BaseModel):
    account_id: str
    timeline: List[WarmthTimelinePoint]
    signals_fired: List[str]
    final_score: float
    restriction_hour: Optional[int]
