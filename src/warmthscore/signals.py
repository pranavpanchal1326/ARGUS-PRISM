"""
ARGUS-PRISM WarmthScore Signals 4, 5, 6
=========================================
Aditya's three WarmthScore signal scorers as per WORKFLOW_ADITYA.md Phase 4.

Signal 4 — Dormant Reactivation + Device Change
  Account dormant 90+ days, reactivated with a NEW device IMEI.
  Score: min(1.0, dormant_days / 180 + 0.3)

Signal 5 — FRI Contradiction
  DoT FRI score < 30 BUT internal partial warmth already > 60.
  Indicates a "clean SIM" masking an already-hot account.
  Score: 0.85 (fixed — high confidence cross-signal contradiction)

Signal 6 — SIM Swap Velocity
  2+ SIM swap events on the same account within 72 hours.
  Each swap adds 0.35, capped at 1.0.
  Score: min(1.0, num_swaps * 0.35)

Scoring conventions:
  - All signals return float in [0.0, 1.0]
  - 0.0 = signal not triggered
  - The WarmthEngine weights and combines all signals into 0–100 WarmthScore
"""

import logging
import os
import sys
from datetime import datetime, timezone, timedelta
from typing import Optional

# Allow running from src/warmthscore or repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'services', 'pipeline'))

try:
    from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
except ImportError:
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

from neo4j import GraphDatabase
from mock_dip_api import get_dip_client

log = logging.getLogger("prism.warmthscore.signals")


# ── Neo4j helpers ─────────────────────────────────────────────────────────────

def _get_driver():
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


def get_account_properties(account_id: str) -> Optional[dict]:
    """Fetch account node properties from Neo4j."""
    driver = _get_driver()
    try:
        with driver.session() as session:
            result = session.run(
                "MATCH (a:Account {account_id: $id}) RETURN a",
                id=account_id
            )
            record = result.single()
            return dict(record["a"]) if record else None
    finally:
        driver.close()


def get_device_events(account_id: str) -> list[dict]:
    """Fetch USES_DEVICE relationships for the account from Neo4j."""
    driver = _get_driver()
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (a:Account {account_id: $id})-[r:USES_DEVICE]->(d:Device)
                RETURN d.imei AS imei, r.event_type AS event_type,
                       r.registered_at AS registered_at
                ORDER BY r.registered_at DESC
                """,
                id=account_id
            )
            return [dict(r) for r in result]
    finally:
        driver.close()


def get_partial_warmth(account_id: str) -> float:
    """Return current warmth_score from Neo4j (0.0 if not yet set)."""
    props = get_account_properties(account_id)
    if not props:
        return 0.0
    return float(props.get("warmth_score", 0.0))


def get_dormant_period_days(account_id: str) -> float:
    """
    Return how many days the account was dormant before reactivation.
    Reads last_active from Neo4j Account node.
    Returns 0.0 if account was not dormant.
    """
    props = get_account_properties(account_id)
    if not props:
        return 0.0
    last_active = props.get("last_active")
    if last_active is None:
        return 0.0

    now = datetime.now(timezone.utc)
    # last_active may be a Neo4j DateTime object or epoch ms int
    if hasattr(last_active, "to_native"):
        last_active_dt = last_active.to_native().replace(tzinfo=timezone.utc)
    elif isinstance(last_active, (int, float)):
        last_active_dt = datetime.fromtimestamp(last_active / 1000, tz=timezone.utc)
    else:
        return 0.0

    return (now - last_active_dt).total_seconds() / 86400


def has_device_changed_on_reactivation(account_id: str) -> bool:
    """
    Returns True if the account has more than one device event,
    indicating a device fingerprint change on reactivation.
    """
    events = get_device_events(account_id)
    if len(events) < 2:
        return False
    # Check for UPI_DEVICE_CHANGED or multiple distinct IMEIs
    imeis = list({e["imei"] for e in events if e.get("imei")})
    change_events = [e for e in events if e.get("event_type") == "UPI_DEVICE_CHANGED"]
    return len(imeis) > 1 or len(change_events) > 0


# ── Signal 4: Dormant Reactivation + Device Change ────────────────────────────

def signal_4_dormant_device_change(account_id: str) -> float:
    """
    PS3 / WarmthScore Signal 4.

    Triggered when:
      - Account was dormant for 90+ days (last_active > 90 days ago)
      - AND device fingerprint changed on reactivation (new IMEI)

    Score formula (from WORKFLOW_ADITYA.md):
      min(1.0, dormant_days / 180 + 0.3)

    Returns float in [0.0, 1.0]. 0.0 = not triggered.
    """
    dormant_days = get_dormant_period_days(account_id)
    device_changed = has_device_changed_on_reactivation(account_id)

    if dormant_days > 90 and device_changed:
        score = min(1.0, dormant_days / 180 + 0.3)
        log.warning(
            "[S4] DORMANT_DEVICE_CHANGE: %s — dormant=%.1fd, score=%.3f",
            account_id, dormant_days, score
        )
        return score

    return 0.0


# ── Signal 5: FRI Contradiction ───────────────────────────────────────────────

def signal_5_fri_contradiction(account_id: str) -> float:
    """
    PS3 / WarmthScore Signal 5.

    Triggered when:
      - DoT FRI score < 30 (low-risk SIM on paper)
      - BUT internal partial warmth > 60 (already flagged by other signals)

    This cross-signal contradiction is a strong indicator of mule use.
    Score: 0.85 (fixed, high-confidence).

    Returns float in [0.0, 1.0]. 0.0 = not triggered.
    """
    dip = get_dip_client()
    fri_score = dip.get_fri_score(account_id)
    internal_warmth = get_partial_warmth(account_id)

    if fri_score < 30 and internal_warmth > 60:
        log.warning(
            "[S5] FRI_CONTRADICTION: %s — FRI=%d, warmth=%.1f, score=0.85",
            account_id, fri_score, internal_warmth
        )
        return 0.85

    log.debug(
        "[S5] No contradiction: %s — FRI=%d, warmth=%.1f",
        account_id, fri_score, internal_warmth
    )
    return 0.0


# ── Signal 6: SIM Swap Velocity ───────────────────────────────────────────────

def signal_6_sim_swap_velocity(account_id: str,
                                window_hours: int = 72) -> float:
    """
    PS3 / WarmthScore Signal 6.

    Triggered when:
      - 2+ SIM swap events detected on this account within the time window

    Score formula (from WORKFLOW_ADITYA.md):
      min(1.0, num_swaps * 0.35)

    Returns float in [0.0, 1.0]. 0.0 = not triggered.
    """
    dip = get_dip_client()
    swaps = dip.get_sim_swap_events(account_id, window_hours=window_hours)

    if len(swaps) >= 2:
        score = min(1.0, len(swaps) * 0.35)
        log.warning(
            "[S6] SIM_SWAP_VELOCITY: %s — %d swaps in %dhr, score=%.3f",
            account_id, len(swaps), window_hours, score
        )
        return score

    return 0.0


# ── Combined scorer (Signals 4+5+6 only) ─────────────────────────────────────

# Weights for combining signals into WarmthScore contribution
# (Signals 1–3 are Pranav's — this engine only handles 4, 5, 6)
SIGNAL_WEIGHTS = {
    "signal_4": 25.0,   # Max 25 warmth points
    "signal_5": 30.0,   # Max 30 warmth points
    "signal_6": 20.0,   # Max 20 warmth points
}


def compute_warmth_contribution(account_id: str) -> dict:
    """
    Compute WarmthScore contribution from Signals 4, 5, 6.

    Returns dict with individual scores and total contribution (0–75 range).
    Combined with Pranav's Signals 1–3 (0–25 range) = full 0–100 WarmthScore.
    """
    s4 = signal_4_dormant_device_change(account_id)
    s5 = signal_5_fri_contradiction(account_id)
    s6 = signal_6_sim_swap_velocity(account_id)

    contribution = (
        s4 * SIGNAL_WEIGHTS["signal_4"] +
        s5 * SIGNAL_WEIGHTS["signal_5"] +
        s6 * SIGNAL_WEIGHTS["signal_6"]
    )
    contribution = min(75.0, contribution)

    return {
        "account_id": account_id,
        "signal_4_raw": s4,
        "signal_5_raw": s5,
        "signal_6_raw": s6,
        "signals_456_contribution": round(contribution, 2),
        "signals_fired": [
            name for name, raw in
            [("signal_4", s4), ("signal_5", s5), ("signal_6", s6)]
            if raw > 0
        ],
    }
