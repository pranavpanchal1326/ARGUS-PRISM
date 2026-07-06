"""Shared domain vocabulary: WarmthScore bands, account status, response tiers.

The band names are the product's visual signature (engraved around the dial). The
7-tier graduated response is the proven V2 IP (old PRD §8.2) — graduated freezes that
protect innocent customers instead of a binary freeze. Bands map onto tiers here so
the two vocabularies stay consistent.
"""

from __future__ import annotations

from enum import Enum

from app.core.config import get_settings


class Severity(str, Enum):
    CLEAN = "CLEAN"
    WARMING = "WARMING"
    HOT = "HOT"
    CRITICAL = "CRITICAL"
    IMMINENT = "IMMINENT"


class AccountStatus(str, Enum):
    ACTIVE = "ACTIVE"
    WATCH = "WATCH"
    KYC_HOLD = "KYC_HOLD"
    RESTRICTED = "RESTRICTED"   # debits blocked, credits allowed (partial freeze)
    FROZEN = "FROZEN"           # all transactions blocked


class AlertStatus(str, Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    ASSIGNED = "ASSIGNED"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


def band_for(score: float) -> Severity:
    """Map a 0–100 WarmthScore to its severity band."""
    s = get_settings()
    if score >= s.warmth_threshold_imminent:
        return Severity.IMMINENT
    if score >= s.warmth_threshold_critical:
        return Severity.CRITICAL
    if score >= s.warmth_threshold_hot:
        return Severity.HOT
    if score >= s.warmth_threshold_warming:
        return Severity.WARMING
    return Severity.CLEAN


# Response tier (0–6) — graduated action. Only the top bands freeze, and only a
# partial freeze (credits still land) until IMMINENT, protecting salary/medical cases.
_BAND_TIER = {
    Severity.CLEAN: 0,
    Severity.WARMING: 2,
    Severity.HOT: 3,
    Severity.CRITICAL: 5,
    Severity.IMMINENT: 6,
}


def response_tier(score: float) -> int:
    return _BAND_TIER[band_for(score)]


def recommended_status(score: float) -> AccountStatus:
    """The account status a given score recommends (before human review)."""
    band = band_for(score)
    if band == Severity.IMMINENT:
        return AccountStatus.FROZEN
    if band == Severity.CRITICAL:
        return AccountStatus.RESTRICTED
    if band == Severity.HOT:
        return AccountStatus.KYC_HOLD
    if band == Severity.WARMING:
        return AccountStatus.WATCH
    return AccountStatus.ACTIVE


def alert_worthy(score: float) -> bool:
    """Whether a score should raise an alert (WARMING and above)."""
    return band_for(score) != Severity.CLEAN
