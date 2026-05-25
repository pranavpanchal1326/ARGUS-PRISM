"""
PRISM V1 — Signal Extractor
Orchestrates S1-S6 signal extraction from Neo4j/PostgreSQL.

This is the bridge between raw database data and the signal evaluation modules.
Each function queries the appropriate database, formats the data, and pipes it
through the existing signal evaluators to produce shap_ready_vectors.

Fallback strategy: if any database query fails, return zero vectors — never crash.
The WarmthScore API should never 500 on signal extraction failures.

Usage:
    signals = await extract_all_signals("ACC-001", neo4j_driver, db_session)
    # signals = {"S1": {..., "shap_ready_vector": [...]}, "S2": {...}, ...}
"""

import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("prism.pipeline.signal_extractor")

# Signal module imports
from services.ml.warmthscore.signals.signal_1_test_credit import evaluate as s1_evaluate
from services.ml.warmthscore.signals.signal2_device_fingerprint import detect_device_fingerprint as s2_evaluate
from services.ml.warmthscore.signals.signal3_velocity_derivative import detect_velocity_convexity as s3_evaluate
from services.ml.warmthscore.signals.signal4_dormant_reactivation import DormantReactivationSignal
from services.ml.warmthscore.signals.signal5_fri_contradiction import FRIContradictionSignal
from services.ml.warmthscore.signals.signal6_sim_swap import SIMSwapSignal

# Query layer imports
from services.pipeline.neo4j_queries import (
    get_recent_credits,
    get_device_events,
    get_transaction_velocity,
)
from services.pipeline.pg_queries import (
    get_account_metadata,
    get_fri_data,
    get_sim_swap_data,
)

# Signal module singletons (S4, S5, S6 are class-based)
_s4_signal = DormantReactivationSignal()
_s5_signal = FRIContradictionSignal()
_s6_signal = SIMSwapSignal()

# Expected vector lengths per signal
SIGNAL_LENGTHS = {"S1": 7, "S2": 9, "S3": 8, "S4": 7, "S5": 6, "S6": 6}


def _zero_result(signal_id: str, signal_name: str, reason: str = "EXTRACTION_FAILED") -> Dict[str, Any]:
    """Returns a safe zero-score result that won't crash the predictor."""
    n = SIGNAL_LENGTHS[signal_id]
    return {
        "signal_id": signal_id,
        "signal_name": signal_name,
        "raw_score": 0.0,
        "confidence": 0.0,
        "weight": 0.0,
        "weighted_score": 0.0,
        "triggered": False,
        "trigger_reason": reason,
        "features": {},
        "shap_ready_vector": [0.0] * n,
    }


# ─── S1: Test Credit Pattern ────────────────────────────────────────────────

async def extract_s1_test_credits(
    account_id: str,
    neo4j_driver=None,
    db: AsyncSession = None,
) -> Dict[str, Any]:
    """
    S1 — Test Credits
    Query Neo4j for credits to this account in last 72 hours
    where amount < 500 AND source_account has no prior relationship.
    Pipe through signal_1_test_credit.evaluate().
    """
    try:
        if neo4j_driver is None:
            logger.debug(f"S1: No Neo4j driver — returning zeros for {account_id}")
            return _zero_result("S1", "test_credit_pattern", "NO_NEO4J_DRIVER")

        # Query Neo4j for credit transactions
        credits = await get_recent_credits(account_id, neo4j_driver, hours=72, max_amount=500.0)

        # Get account metadata for opened_at timestamp
        account_meta = {"account_opened_at": None}
        if db:
            meta = await get_account_metadata(account_id, db)
            if meta.get("account_opened_at"):
                account_meta["account_opened_at"] = datetime.fromisoformat(
                    meta["account_opened_at"].replace("Z", "+00:00")
                )

        if account_meta["account_opened_at"] is None:
            account_meta["account_opened_at"] = datetime.now(timezone.utc)

        # Format transactions for signal_1 evaluate()
        transactions = []
        for cr in credits:
            tx = {
                "direction": "CREDIT",
                "amount": float(cr.get("amount", 0.0)),
                "timestamp": cr.get("timestamp"),
                "source_account_id": cr.get("source_account_id", ""),
                "source_account_age_days": float(cr.get("source_account_age_days", 0)),
                "source_account_dormant": bool(cr.get("source_account_dormant", False)),
            }
            # Parse timestamp if it's a string
            if isinstance(tx["timestamp"], str):
                tx["timestamp"] = datetime.fromisoformat(tx["timestamp"].replace("Z", "+00:00"))
            transactions.append(tx)

        # Evaluate through signal module
        result = s1_evaluate(transactions, account_meta)
        return result

    except Exception as e:
        logger.error(f"S1 extraction failed for {account_id}: {e}", exc_info=True)
        return _zero_result("S1", "test_credit_pattern", f"ERROR: {e}")


# ─── S2: Device Fingerprint ──────────────────────────────────────────────────

async def extract_s2_device_fingerprint(
    account_id: str,
    neo4j_driver=None,
) -> Dict[str, Any]:
    """
    S2 — Device Fingerprint
    Query Neo4j for device events and shared IMEI data.
    Pipe through signal2_device_fingerprint.detect_device_fingerprint().
    """
    try:
        if neo4j_driver is None:
            return _zero_result("S2", "device_fingerprint_mismatch", "NO_NEO4J_DRIVER")

        device_data = await get_device_events(account_id, neo4j_driver)
        shared_imeis = device_data.pop("shared_imeis", set())

        result = s2_evaluate(device_data, known_shared_imeis=shared_imeis)
        return result

    except Exception as e:
        logger.error(f"S2 extraction failed for {account_id}: {e}", exc_info=True)
        return _zero_result("S2", "device_fingerprint_mismatch", f"ERROR: {e}")


# ─── S3: Velocity Derivative ─────────────────────────────────────────────────

async def extract_s3_velocity_derivative(
    account_id: str,
    neo4j_driver=None,
) -> Dict[str, Any]:
    """
    S3 — Velocity Derivative
    Get transaction counts per hour for last 72 hours as a time series.
    Pipe through signal3_velocity_derivative.detect_velocity_convexity().
    """
    try:
        if neo4j_driver is None:
            return _zero_result("S3", "velocity_derivative_convexity", "NO_NEO4J_DRIVER")

        velocity_data = await get_transaction_velocity(account_id, neo4j_driver, hours=72)
        result = s3_evaluate(velocity_data)
        return result

    except Exception as e:
        logger.error(f"S3 extraction failed for {account_id}: {e}", exc_info=True)
        return _zero_result("S3", "velocity_derivative_convexity", f"ERROR: {e}")


# ─── S4: Dormant Reactivation ────────────────────────────────────────────────

async def extract_s4_dormant_reactivation(
    account_id: str,
    db: AsyncSession = None,
) -> Dict[str, Any]:
    """
    S4 — Dormant Reactivation
    Check last_active_timestamp in PostgreSQL.
    Pipe through DormantReactivationSignal.compute().

    Note: S4 returns 'features' (list of 7 floats) not 'shap_ready_vector'.
    The FeatureEngineer handles both keys.
    """
    try:
        if db is None:
            return _zero_result("S4", "dormant_reactivation", "NO_DB_SESSION")

        account_data = await get_account_metadata(account_id, db)
        result = _s4_signal.compute(account_data)

        # Normalize output: S4 returns {features: [...]} but predictor expects shap_ready_vector
        if "features" in result and "shap_ready_vector" not in result:
            result["shap_ready_vector"] = result["features"]

        return result

    except Exception as e:
        logger.error(f"S4 extraction failed for {account_id}: {e}", exc_info=True)
        return _zero_result("S4", "dormant_reactivation", f"ERROR: {e}")


# ─── S5: FRI Contradiction ───────────────────────────────────────────────────

async def extract_s5_fri_contradiction(
    account_id: str,
    partial_signals: Dict[str, Any] = None,
    db: AsyncSession = None,
) -> Dict[str, Any]:
    """
    S5 — FRI Contradiction
    Pull FRI score from account metadata, compare with internal signals S1-S4.
    Pipe through FRIContradictionSignal.compute().

    Requires partial_signals dict containing S1-S4 results from earlier extraction.
    """
    try:
        if db is None:
            return _zero_result("S5", "fri_contradiction", "NO_DB_SESSION")

        if partial_signals is None:
            partial_signals = {}

        fri_data = await get_fri_data(account_id, db)

        # Build partial signals in the format S5 expects:
        # {signal_id: {features: [list of N floats]}}
        formatted_partials = {}
        for sig_id in ["S1", "S2", "S3", "S4"]:
            sig = partial_signals.get(sig_id, {})
            vec = sig.get("shap_ready_vector") or sig.get("features", [])
            expected = {"S1": 7, "S2": 9, "S3": 8, "S4": 7}[sig_id]
            if len(vec) != expected:
                vec = [0.0] * expected
            formatted_partials[sig_id] = {"features": vec}

        result = _s5_signal.compute(fri_data, formatted_partials)

        # Normalize: S5 returns 'features' not 'shap_ready_vector'
        if "features" in result and "shap_ready_vector" not in result:
            result["shap_ready_vector"] = result["features"]

        return result

    except Exception as e:
        logger.error(f"S5 extraction failed for {account_id}: {e}", exc_info=True)
        return _zero_result("S5", "fri_contradiction", f"ERROR: {e}")


# ─── S6: SIM Swap ────────────────────────────────────────────────────────────

async def extract_s6_sim_swap(
    account_id: str,
    db: AsyncSession = None,
) -> Dict[str, Any]:
    """
    S6 — SIM Swap Velocity
    Query device_events for SIM swap history and compare with UPI registration.
    Pipe through SIMSwapSignal.compute().
    """
    try:
        if db is None:
            return _zero_result("S6", "sim_swap_velocity", "NO_DB_SESSION")

        swap_data = await get_sim_swap_data(account_id, db)
        result = _s6_signal.compute(swap_data)

        # Normalize: S6 returns 'features' not 'shap_ready_vector'
        if "features" in result and "shap_ready_vector" not in result:
            result["shap_ready_vector"] = result["features"]

        return result

    except Exception as e:
        logger.error(f"S6 extraction failed for {account_id}: {e}", exc_info=True)
        return _zero_result("S6", "sim_swap_velocity", f"ERROR: {e}")


# ─── Main Orchestrator ───────────────────────────────────────────────────────

async def extract_all_signals(
    account_id: str,
    neo4j_driver=None,
    db: AsyncSession = None,
) -> Dict[str, Any]:
    """
    Extract all 6 signals for a given account.

    Execution order matters: S5 depends on S1-S4 results (partial signals).
    S1-S4 are independent and could be parallelized, but for simplicity
    we run them sequentially to avoid connection pool contention.

    Returns a dict with keys S1-S6, each containing signal-specific data
    including shap_ready_vector for the FeatureEngineer.
    """
    start_time = time.monotonic()
    logger.info(f"Extracting all signals for account {account_id}")

    # Phase 1: Extract S1-S4 (independent)
    s1 = await extract_s1_test_credits(account_id, neo4j_driver, db)
    s2 = await extract_s2_device_fingerprint(account_id, neo4j_driver)
    s3 = await extract_s3_velocity_derivative(account_id, neo4j_driver)
    s4 = await extract_s4_dormant_reactivation(account_id, db)

    # Phase 2: Extract S5 (depends on S1-S4 partial signals)
    partial_signals = {"S1": s1, "S2": s2, "S3": s3, "S4": s4}
    s5 = await extract_s5_fri_contradiction(account_id, partial_signals, db)

    # Phase 3: Extract S6 (independent)
    s6 = await extract_s6_sim_swap(account_id, db)

    elapsed = time.monotonic() - start_time
    logger.info(
        f"Signal extraction complete for {account_id} in {elapsed:.3f}s — "
        f"S1={s1.get('triggered', False)} S2={s2.get('triggered', False)} "
        f"S3={s3.get('triggered', False)} S4={bool(s4.get('shap_ready_vector', []))} "
        f"S5={bool(s5.get('shap_ready_vector', []))} S6={bool(s6.get('shap_ready_vector', []))}"
    )

    return {
        "S1": s1,
        "S2": s2,
        "S3": s3,
        "S4": s4,
        "S5": s5,
        "S6": s6,
    }
