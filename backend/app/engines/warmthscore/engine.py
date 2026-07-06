"""WarmthScore engine — the 6-signal ensemble (proven V2 IP, re-homed off Kafka).

Computes a 0–100 risk score from an account's own transaction/device features, with a
per-signal SHAP-style contribution breakdown so every score is explainable. Legit
accounts score near 0; mule-warming accounts climb toward 100 as signals stack.

Signals (weights sum to 100):
  S1 velocity              20   rapid, high-count movement
  S2 round_trip            28   funds out shortly after in (layering)
  S3 structuring           15   many just-below-reporting-threshold credits
  S4 dormant_device        15   dormant 90d+ then reactivated on a new device
  S5 profile_mismatch      12   throughput far above the account's declared segment
  S6 sim_swap              10   2+ SIM swaps in 72h
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

STRUCTURING_THRESHOLD = 50_000.0   # ₹ — just below the ₹10L CTR line, layered small
_WEIGHTS = {
    "S1": ("velocity", 20.0),
    "S2": ("round_trip", 30.0),
    "S3": ("structuring", 14.0),
    "S4": ("dormant_device", 14.0),
    "S5": ("profile_mismatch", 12.0),
    "S6": ("sim_swap", 10.0),
}

# Rough monthly-throughput expectation per segment (₹), for profile mismatch.
_SEGMENT_EXPECTED = {
    "salary": 150_000.0,
    "retail": 80_000.0,
    "student": 30_000.0,
    "business": 1_500_000.0,
    "senior": 60_000.0,
}


@dataclass
class TxnFeature:
    ts: datetime
    amount: float
    direction: str  # "IN" | "OUT" relative to the account


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


def _now() -> datetime:
    return datetime.now(UTC)


def _sig_velocity(inp: ScoreInput) -> tuple[float, str]:
    recent = [t for t in inp.transactions if _now() - t.ts < timedelta(hours=48)]
    n = len(recent)
    # 0 at <=3 txns, saturates at ~15 txns / 48h.
    raw = max(0.0, min(1.0, (n - 3) / 12.0))
    return raw, f"{n} txns / 48h"


def _sig_round_trip(inp: ScoreInput) -> tuple[float, str]:
    inflow = sum(t.amount for t in inp.transactions if t.direction == "IN")
    outflow = sum(t.amount for t in inp.transactions if t.direction == "OUT")
    if inflow <= 0:
        return 0.0, "no inflow"
    ratio = min(1.0, outflow / inflow)
    # Only suspicious once a large fraction cycles straight back out.
    raw = max(0.0, (ratio - 0.5) / 0.5) if ratio > 0.5 else 0.0
    return min(1.0, raw), f"round-trip {ratio:.0%}"


def _sig_structuring(inp: ScoreInput) -> tuple[float, str]:
    # Many transfers just below the reporting threshold, in either direction.
    near = [
        t
        for t in inp.transactions
        if 0.5 * STRUCTURING_THRESHOLD <= t.amount < STRUCTURING_THRESHOLD
    ]
    raw = max(0.0, min(1.0, (len(near) - 2) / 6.0))
    return raw, f"{len(near)} sub-threshold transfers"


def _sig_dormant_device(inp: ScoreInput) -> tuple[float, str]:
    dormant_days = (_now() - inp.last_active).total_seconds() / 86400
    if inp.dormant_reactivated_new_device and dormant_days > 90:
        raw = min(1.0, dormant_days / 180 + 0.3)
        return raw, f"dormant {int(dormant_days)}d + new device"
    return 0.0, "active / same device"


def _sig_profile_mismatch(inp: ScoreInput) -> tuple[float, str]:
    expected = _SEGMENT_EXPECTED.get(inp.segment, 80_000.0)
    throughput = sum(t.amount for t in inp.transactions)
    ratio = throughput / expected if expected else 0.0
    # 0 up to 1.5x expected, saturates by ~6x.
    raw = max(0.0, min(1.0, (ratio - 1.5) / 4.5))
    return raw, f"{ratio:.1f}x {inp.segment} profile"


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


def score(inp: ScoreInput) -> ScoreResult:
    signals: dict[str, float] = {}
    shap: list[dict] = []
    fired: list[str] = []
    total = 0.0
    for code, (_name, weight) in _WEIGHTS.items():
        raw, label = _SCORERS[code](inp)
        signals[code] = round(raw, 3)
        contribution = raw * weight
        total += contribution
        if raw > 0:
            fired.append(code)
            shap.append(
                {"code": code, "label": label, "contribution": round(contribution, 2)}
            )
    shap.sort(key=lambda s: s["contribution"], reverse=True)
    return ScoreResult(
        score=round(min(100.0, total), 2),
        signals=signals,
        shap=shap,
        signals_fired=fired,
    )
