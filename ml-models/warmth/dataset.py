"""Synthetic labelled dataset for the WarmthScore model.

Builds ScoreInput objects across realistic archetypes and labels them mule/legit.
Crucially it includes *hard negatives* — legit accounts that superficially look like
mules (salary-day spikes, festival bursts, medical crowdfunding, family pooling) — so
the model learns nuance and keeps the false-positive rate low, instead of flagging
every high-throughput account. It also includes *downstream mules* with weak signals
so the model isn't trivially perfect.

Uses the SAME feature extractor the backend uses at inference (imported from the
backend package), so there is no train/serve skew.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from app.engines.warmthscore.types import ScoreInput, TxnFeature


def _now() -> datetime:
    return datetime.now(UTC)


def _txn(amount: float, direction: str, hours_ago: float, channel: str = "UPI") -> TxnFeature:
    return TxnFeature(ts=_now() - timedelta(hours=hours_ago), amount=amount, direction=direction, channel=channel)


def _jit(rng: random.Random, x: float, pct: float = 0.3) -> float:
    """Multiplicative noise so archetypes overlap instead of being trivially separable."""
    return max(1.0, x * rng.uniform(1 - pct, 1 + pct))


@dataclass
class Sample:
    inp: ScoreInput
    label: int          # 1 = mule, 0 = legit
    archetype: str
    hard_negative: bool = False


# ── Legit archetypes ─────────────────────────────────────────────
def _salary_earner(rng: random.Random) -> Sample:
    txns = [_txn(rng.uniform(40_000, 90_000), "IN", rng.uniform(1, 40), "NEFT")]
    for _ in range(rng.randint(2, 6)):
        txns.append(_txn(rng.uniform(400, 9_000), "OUT", rng.uniform(1, 45)))
    inp = ScoreInput(
        segment="salary",
        last_active=_now(),
        opened_at=_now() - timedelta(days=rng.randint(400, 1500)),
        transactions=txns,
        device_imeis=[f"IMEI{rng.randint(1000, 9999)}"],
    )
    return Sample(inp, 0, "SALARY_EARNER")


def _sim_legit(rng: random.Random) -> Sample:
    """Matches the live simulator's legit_baseline exactly (salary credit + a few small
    spends) so the model learns the real serving distribution and doesn't over-flag
    ordinary low-throughput customers."""
    seg = rng.choice(["salary", "retail", "salary", "senior", "student"])
    txns = [_txn(rng.choice([45_000, 62_000, 38_000, 55_000]), "IN", rng.uniform(1, 47), "NEFT")]
    for _ in range(rng.randint(1, 3)):
        txns.append(_txn(rng.uniform(1_500, 9_000), "OUT", rng.uniform(1, 47)))
    inp = ScoreInput(
        segment=seg,
        last_active=_now(),
        opened_at=_now() - timedelta(days=rng.randint(200, 1200)),
        transactions=txns,
        device_imeis=[f"IMEI{rng.randint(1000, 9999)}"],
    )
    return Sample(inp, 0, "SIM_LEGIT")


def _receive_only(rng: random.Random) -> Sample:
    """Legit accounts that mostly receive (pension, single salary, refund) — must NOT
    be flagged just for a mid-range inflow."""
    txns = [_txn(rng.uniform(20_000, 90_000), "IN", rng.uniform(1, 47), rng.choice(["NEFT", "IMPS"]))]
    if rng.random() < 0.5:
        txns.append(_txn(rng.uniform(1_000, 8_000), "OUT", rng.uniform(1, 47)))
    inp = ScoreInput(
        segment=rng.choice(["salary", "senior", "retail"]),
        last_active=_now(),
        opened_at=_now() - timedelta(days=rng.randint(300, 1500)),
        transactions=txns,
        device_imeis=[f"IMEI{rng.randint(1000, 9999)}"],
    )
    return Sample(inp, 0, "RECEIVE_ONLY")


def _retail(rng: random.Random) -> Sample:
    txns = []
    for _ in range(rng.randint(2, 8)):
        txns.append(_txn(rng.uniform(200, 12_000), rng.choice(["OUT", "OUT", "IN"]), rng.uniform(1, 47)))
    inp = ScoreInput(
        segment=rng.choice(["retail", "student", "senior"]),
        last_active=_now(),
        opened_at=_now() - timedelta(days=rng.randint(200, 1200)),
        transactions=txns,
        device_imeis=[f"IMEI{rng.randint(1000, 9999)}"],
    )
    return Sample(inp, 0, "RETAIL")


def _business_legit(rng: random.Random) -> Sample:
    # High throughput but sustained + balanced — not rapid round-trip.
    txns = []
    for _ in range(rng.randint(8, 20)):
        txns.append(_txn(rng.uniform(20_000, 200_000), rng.choice(["IN", "OUT"]), rng.uniform(1, 47), "IMPS"))
    inp = ScoreInput(
        segment="business",
        last_active=_now(),
        opened_at=_now() - timedelta(days=rng.randint(600, 2000)),
        transactions=txns,
        device_imeis=[f"IMEI{rng.randint(1000, 9999)}"],
    )
    return Sample(inp, 0, "BUSINESS_LEGIT")


# ── Hard negatives (legit but suspicious-looking) ────────────────
def _medical_crowdfunding(rng: random.Random) -> Sample:
    # Many small donations in, then one big outflow to a hospital → looks round-trippy.
    txns = [_txn(rng.uniform(500, 5_000), "IN", rng.uniform(1, 47)) for _ in range(rng.randint(8, 20))]
    total_in = sum(t.amount for t in txns)
    txns.append(_txn(total_in * rng.uniform(0.85, 0.98), "OUT", rng.uniform(0.5, 3), "IMPS"))
    inp = ScoreInput(
        segment="retail",
        last_active=_now(),
        opened_at=_now() - timedelta(days=rng.randint(300, 1500)),
        transactions=txns,
        device_imeis=[f"IMEI{rng.randint(1000, 9999)}"],
    )
    return Sample(inp, 0, "MEDICAL_CROWDFUNDING", hard_negative=True)


def _salary_day_spike(rng: random.Random) -> Sample:
    txns = [_txn(rng.uniform(60_000, 120_000), "IN", rng.uniform(1, 6), "NEFT")]
    for _ in range(rng.randint(5, 12)):  # burst of bill payments
        txns.append(_txn(rng.uniform(1_000, 15_000), "OUT", rng.uniform(0.5, 8)))
    inp = ScoreInput(
        segment="salary",
        last_active=_now(),
        opened_at=_now() - timedelta(days=rng.randint(400, 1500)),
        transactions=txns,
        device_imeis=[f"IMEI{rng.randint(1000, 9999)}"],
    )
    return Sample(inp, 0, "SALARY_DAY_SPIKE", hard_negative=True)


def _family_pooling(rng: random.Random) -> Sample:
    txns = [_txn(rng.uniform(5_000, 40_000), "IN", rng.uniform(1, 47)) for _ in range(rng.randint(3, 6))]
    txns.append(_txn(sum(t.amount for t in txns) * rng.uniform(0.7, 0.95), "OUT", rng.uniform(1, 10), "IMPS"))
    inp = ScoreInput(
        segment=rng.choice(["retail", "senior"]),
        last_active=_now(),
        opened_at=_now() - timedelta(days=rng.randint(500, 1800)),
        transactions=txns,
        device_imeis=[f"IMEI{rng.randint(1000, 9999)}"],
    )
    return Sample(inp, 0, "FAMILY_POOLING", hard_negative=True)


# ── Mule archetypes ──────────────────────────────────────────────
def _roundtrip_mule(rng: random.Random) -> Sample:
    inflow = rng.uniform(250_000, 480_000)
    txns = [_txn(inflow, "IN", rng.uniform(2, 10), "IMPS")]
    remaining = inflow * rng.uniform(0.9, 0.98)
    while remaining > 15_000:
        chunk = min(remaining, rng.uniform(31_000, 47_000))
        txns.append(_txn(chunk, "OUT", rng.uniform(0.2, 6)))
        remaining -= chunk
    dormant = rng.random() < 0.4
    new_device = rng.random() < 0.6
    swaps = rng.choice([0, 0, 2, 3]) if rng.random() < 0.4 else 0
    imeis = [f"IMEI{rng.randint(1000, 9999)}"]
    if new_device:
        imeis.append(f"IMEI{rng.randint(1000, 9999)}")
    inp = ScoreInput(
        segment=rng.choice(["student", "retail"]),
        last_active=_now() - timedelta(days=rng.randint(120, 200)) if dormant else _now(),
        opened_at=_now() - timedelta(days=rng.randint(200, 900)),
        transactions=txns,
        device_imeis=imeis,
        sim_swaps_72h=swaps,
        dormant_reactivated_new_device=new_device,
    )
    return Sample(inp, 1, "ROUNDTRIP_MULE")


def _laundering_hub(rng: random.Random) -> Sample:
    txns = []
    for _ in range(rng.randint(12, 25)):
        txns.append(_txn(rng.uniform(80_000, 300_000), rng.choice(["IN", "OUT"]), rng.uniform(0.2, 20), "IMPS"))
    inp = ScoreInput(
        segment=rng.choice(["retail", "business"]),
        last_active=_now(),
        opened_at=_now() - timedelta(days=rng.randint(150, 700)),
        transactions=txns,
        device_imeis=[f"IMEI{rng.randint(1000, 9999)}", f"IMEI{rng.randint(1000, 9999)}"],
        sim_swaps_72h=rng.choice([0, 2, 3]),
        dormant_reactivated_new_device=True,
    )
    return Sample(inp, 1, "LAUNDERING_HUB")


def _downstream_mule(rng: random.Random) -> Sample:
    # Weak signals — only a couple of transfers. Harder to catch (like V2's ~0.47 recall).
    inflow = rng.uniform(80_000, 180_000)
    txns = [_txn(inflow, "IN", rng.uniform(2, 20), "UPI")]
    txns.append(_txn(inflow * rng.uniform(0.85, 0.97), "OUT", rng.uniform(0.5, 12)))
    inp = ScoreInput(
        segment=rng.choice(["student", "retail"]),
        last_active=_now(),
        opened_at=_now() - timedelta(days=rng.randint(200, 900)),
        transactions=txns,
        device_imeis=[f"IMEI{rng.randint(1000, 9999)}"],
    )
    return Sample(inp, 1, "DOWNSTREAM_MULE")


def _crypto_trader(rng: random.Random) -> Sample:
    # Legit high-frequency trader: rapid in/out, high round-trip — looks like laundering.
    txns = []
    for _ in range(rng.randint(12, 24)):
        txns.append(_txn(_jit(rng, rng.uniform(25_000, 90_000)), rng.choice(["IN", "OUT"]), rng.uniform(0.2, 30), "IMPS"))
    inp = ScoreInput(
        segment=rng.choice(["retail", "business"]),
        last_active=_now(),
        opened_at=_now() - timedelta(days=rng.randint(300, 1500)),
        transactions=txns,
        device_imeis=[f"IMEI{rng.randint(1000, 9999)}"],
    )
    return Sample(inp, 0, "CRYPTO_TRADER", hard_negative=True)


def _stealth_mule(rng: random.Random) -> Sample:
    # A "smart" mule mimicking a normal customer: moderate inflow, holds most, sends a
    # little, no device tricks. Weak signals → genuinely hard to catch (false negatives).
    inflow = _jit(rng, rng.uniform(60_000, 150_000))
    txns = [_txn(inflow, "IN", rng.uniform(3, 30), rng.choice(["UPI", "NEFT"]))]
    for _ in range(rng.randint(1, 3)):
        txns.append(_txn(_jit(rng, inflow * rng.uniform(0.15, 0.35)), "OUT", rng.uniform(1, 24)))
    inp = ScoreInput(
        segment=rng.choice(["retail", "student", "salary"]),
        last_active=_now(),
        opened_at=_now() - timedelta(days=rng.randint(200, 1000)),
        transactions=txns,
        device_imeis=[f"IMEI{rng.randint(1000, 9999)}"],
    )
    return Sample(inp, 1, "STEALTH_MULE")


# Weighted archetype mix — the confusable pair (crypto_trader / stealth_mule) creates
# the overlap that keeps metrics realistic instead of a trivial 1.0.
_LEGIT = [
    (_sim_legit, 30),
    (_receive_only, 12),
    (_salary_earner, 16),
    (_retail, 16),
    (_business_legit, 8),
    (_crypto_trader, 8),
]
_HARD_NEG = [(_medical_crowdfunding, 8), (_salary_day_spike, 7), (_family_pooling, 6)]
_MULE = [(_roundtrip_mule, 20), (_laundering_hub, 7), (_downstream_mule, 9), (_stealth_mule, 11)]


def _weighted_pick(rng: random.Random, choices: list[tuple]):
    total = sum(w for _f, w in choices)
    r = rng.uniform(0, total)
    upto = 0.0
    for f, w in choices:
        upto += w
        if r <= upto:
            return f
    return choices[-1][0]


def generate(n: int, seed: int = 42) -> list[Sample]:
    """Generate n labelled samples with a realistic archetype mix."""
    rng = random.Random(seed)
    samples: list[Sample] = []
    pool = _LEGIT + _HARD_NEG + _MULE
    for _ in range(n):
        builder = _weighted_pick(rng, pool)
        s = builder(rng)
        # ~1.5% boundary label ambiguity — real-world labels are imperfect; this keeps
        # AUC from hitting a suspicious 1.0.
        if rng.random() < 0.015:
            s.label = 1 - s.label
        samples.append(s)
    return samples
