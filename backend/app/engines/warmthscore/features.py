"""Feature extraction for the WarmthScore model.

ONE definition of the feature vector, imported by both the training pipeline
(ml-models) and inference (this backend) — so there is no train/serve skew. Every
feature is computable from a ScoreInput at request time.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.engines.warmthscore.signals import raw_signals
from app.engines.warmthscore.types import ScoreInput

# Ordered feature names. The trained booster is bound to this exact order.
FEATURE_NAMES: list[str] = [
    # Six signals (raw 0..1)
    "s1_velocity",
    "s2_round_trip",
    "s3_structuring",
    "s4_dormant_device",
    "s5_profile_mismatch",
    "s6_sim_swap",
    # Transaction aggregates
    "tx_count",
    "sent_count",
    "recv_count",
    "sent_sum",
    "recv_sum",
    "sent_mean",
    "recv_mean",
    "sent_max",
    "recv_max",
    "round_trip_ratio",
    "net_flow",
    "sub_threshold_count",
    # Device / temporal / profile
    "n_devices",
    "sim_swaps_72h",
    "dormant_days",
    "account_age_days",
    "segment_code",
]

# Human labels for SHAP display of the non-signal features.
FEATURE_LABELS: dict[str, str] = {
    "tx_count": "transaction volume",
    "sent_count": "outgoing count",
    "recv_count": "incoming count",
    "sent_sum": "total sent",
    "recv_sum": "total received",
    "sent_mean": "avg sent",
    "recv_mean": "avg received",
    "sent_max": "largest sent",
    "recv_max": "largest received",
    "round_trip_ratio": "round-trip ratio",
    "net_flow": "net flow",
    "sub_threshold_count": "sub-threshold transfers",
    "n_devices": "device count",
    "sim_swaps_72h": "SIM swaps / 72h",
    "dormant_days": "days since active",
    "account_age_days": "account age",
    "segment_code": "customer segment",
}

_SEGMENT_CODES = {"salary": 0, "retail": 1, "student": 2, "business": 3, "senior": 4}
_SUB_THRESHOLD = 50_000.0


def _now() -> datetime:
    return datetime.now(UTC)


def extract(inp: ScoreInput) -> dict[str, float]:
    """Return the full feature dict for a ScoreInput (keys == FEATURE_NAMES)."""
    sigs = {code: raw for code, (raw, _label) in raw_signals(inp).items()}
    sent = [t.amount for t in inp.transactions if t.direction == "OUT"]
    recv = [t.amount for t in inp.transactions if t.direction == "IN"]
    sent_sum, recv_sum = sum(sent), sum(recv)
    sub_threshold = sum(1 for t in inp.transactions if 0.5 * _SUB_THRESHOLD <= t.amount < _SUB_THRESHOLD)

    now = _now()
    last_active = inp.last_active if inp.last_active.tzinfo else inp.last_active.replace(tzinfo=UTC)
    opened = inp.opened_at if inp.opened_at.tzinfo else inp.opened_at.replace(tzinfo=UTC)

    feats = {
        "s1_velocity": sigs["S1"],
        "s2_round_trip": sigs["S2"],
        "s3_structuring": sigs["S3"],
        "s4_dormant_device": sigs["S4"],
        "s5_profile_mismatch": sigs["S5"],
        "s6_sim_swap": sigs["S6"],
        "tx_count": float(len(inp.transactions)),
        "sent_count": float(len(sent)),
        "recv_count": float(len(recv)),
        "sent_sum": sent_sum,
        "recv_sum": recv_sum,
        "sent_mean": (sent_sum / len(sent)) if sent else 0.0,
        "recv_mean": (recv_sum / len(recv)) if recv else 0.0,
        "sent_max": max(sent) if sent else 0.0,
        "recv_max": max(recv) if recv else 0.0,
        "round_trip_ratio": (sent_sum / recv_sum) if recv_sum > 0 else 0.0,
        "net_flow": recv_sum - sent_sum,
        "sub_threshold_count": float(sub_threshold),
        "n_devices": float(len(set(inp.device_imeis))),
        "sim_swaps_72h": float(inp.sim_swaps_72h),
        "dormant_days": max(0.0, (now - last_active).total_seconds() / 86400),
        "account_age_days": max(0.0, (now - opened).total_seconds() / 86400),
        "segment_code": float(_SEGMENT_CODES.get(inp.segment, 1)),
    }
    # Guard against NaN/inf from degenerate inputs.
    return {k: (v if isinstance(v, (int, float)) and v == v else 0.0) for k, v in feats.items()}


def vector(inp: ScoreInput) -> list[float]:
    feats = extract(inp)
    return [feats[name] for name in FEATURE_NAMES]
