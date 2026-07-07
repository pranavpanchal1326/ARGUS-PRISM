"""The 6 WarmthScore signals (proven V2 IP), as pure functions over ScoreInput.

Shared by the rule-based scorer, the feature extractor (model input), and the SHAP
labels. Each returns (raw 0..1, human label).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.engines.warmthscore.types import ScoreInput

STRUCTURING_THRESHOLD = 50_000.0

# Rule-based fallback weights (sum to 100).
WEIGHTS = {
    "S1": ("velocity", 20.0),
    "S2": ("round_trip", 30.0),
    "S3": ("structuring", 14.0),
    "S4": ("dormant_device", 14.0),
    "S5": ("profile_mismatch", 12.0),
    "S6": ("sim_swap", 10.0),
}

_SEGMENT_EXPECTED = {
    "salary": 150_000.0,
    "retail": 80_000.0,
    "student": 30_000.0,
    "business": 1_500_000.0,
    "senior": 60_000.0,
}


def _now() -> datetime:
    return datetime.now(UTC)


def _sig_velocity(inp: ScoreInput) -> tuple[float, str]:
    recent = [t for t in inp.transactions if _now() - t.ts < timedelta(hours=48)]
    n = len(recent)
    return max(0.0, min(1.0, (n - 3) / 12.0)), f"{n} txns / 48h"


def _sig_round_trip(inp: ScoreInput) -> tuple[float, str]:
    inflow = sum(t.amount for t in inp.transactions if t.direction == "IN")
    outflow = sum(t.amount for t in inp.transactions if t.direction == "OUT")
    if inflow <= 0:
        return 0.0, "no inflow"
    ratio = min(1.0, outflow / inflow)
    raw = max(0.0, (ratio - 0.5) / 0.5) if ratio > 0.5 else 0.0
    return min(1.0, raw), f"round-trip {ratio:.0%}"


def _sig_structuring(inp: ScoreInput) -> tuple[float, str]:
    near = [t for t in inp.transactions if 0.5 * STRUCTURING_THRESHOLD <= t.amount < STRUCTURING_THRESHOLD]
    return max(0.0, min(1.0, (len(near) - 2) / 6.0)), f"{len(near)} sub-threshold transfers"


def _sig_dormant_device(inp: ScoreInput) -> tuple[float, str]:
    dormant_days = (_now() - inp.last_active).total_seconds() / 86400
    if inp.dormant_reactivated_new_device and dormant_days > 90:
        return min(1.0, dormant_days / 180 + 0.3), f"dormant {int(dormant_days)}d + new device"
    return 0.0, "active / same device"


def _sig_profile_mismatch(inp: ScoreInput) -> tuple[float, str]:
    expected = _SEGMENT_EXPECTED.get(inp.segment, 80_000.0)
    throughput = sum(t.amount for t in inp.transactions)
    ratio = throughput / expected if expected else 0.0
    return max(0.0, min(1.0, (ratio - 1.5) / 4.5)), f"{ratio:.1f}x {inp.segment} profile"


def _sig_sim_swap(inp: ScoreInput) -> tuple[float, str]:
    if inp.sim_swaps_72h >= 2:
        return min(1.0, inp.sim_swaps_72h * 0.35), f"{inp.sim_swaps_72h} SIM swaps / 72h"
    return 0.0, "no SIM velocity"


_SCORERS = {
    "S1": _sig_velocity,
    "S2": _sig_round_trip,
    "S3": _sig_structuring,
    "S4": _sig_dormant_device,
    "S5": _sig_profile_mismatch,
    "S6": _sig_sim_swap,
}


def raw_signals(inp: ScoreInput) -> dict[str, tuple[float, str]]:
    """{code: (raw, label)} for all six signals."""
    return {code: scorer(inp) for code, scorer in _SCORERS.items()}
