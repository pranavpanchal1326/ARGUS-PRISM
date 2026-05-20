"""
PRISM V1 — Signal Extractor
Extracts S1–S6 signals from real graph/DB data for WarmthScore computation.

Each signal function queries Neo4j or PostgreSQL to compute a real value.
This file defines the contract for Phase 2 implementation.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger("prism.pipeline.signal_extractor")


async def extract_s1_test_credits(account_id: str, neo4j_driver=None) -> Dict[str, Any]:
    """
    S1 — Test Credits
    Query Neo4j for credits to this account in last 72 hours
    where amount < 500 AND source_account has no prior relationship.
    Returns: s1_count, s1_total_amount
    """
    # TODO: Phase 2 — implement real Neo4j query
    raise NotImplementedError("S1 signal extraction not yet implemented")


async def extract_s2_device_fingerprint(account_id: str, neo4j_driver=None) -> Dict[str, Any]:
    """
    S2 — Device Fingerprint
    Query Neo4j: how many other accounts share this device IMEI?
    Cross-reference: are any of those accounts FROZEN or FLAGGED?
    Score: 0.0 (unique device) → 1.0 (device linked to 3+ flagged accounts)
    """
    # TODO: Phase 2 — implement real Neo4j query
    raise NotImplementedError("S2 signal extraction not yet implemented")


async def extract_s3_velocity_derivative(account_id: str, neo4j_driver=None) -> Dict[str, Any]:
    """
    S3 — Velocity Derivative
    Get transaction counts per hour for last 48 hours as a time series.
    Compute first derivative (rate of change) and second derivative (acceleration).
    High positive acceleration = warming signal.
    """
    # TODO: Phase 2 — implement real time-series computation
    raise NotImplementedError("S3 signal extraction not yet implemented")


async def extract_s4_dormant_reactivation(account_id: str, db_session=None) -> Dict[str, Any]:
    """
    S4 — Dormant Reactivation
    Check last_active_timestamp in PostgreSQL.
    dormancy_days = today - last_active_date
    new_device_flag = True if current device != device from last session
    """
    # TODO: Phase 2 — implement real PostgreSQL query
    raise NotImplementedError("S4 signal extraction not yet implemented")


async def extract_s5_fri_contradiction(account_id: str, db_session=None) -> Dict[str, Any]:
    """
    S5 — FRI Contradiction
    Pull FRI score from account metadata (from KYC data).
    If WarmthScore_predicted > 60 AND FRI < 30: contradiction = True
    Suggests clean SIM used to bypass standard filters.
    """
    # TODO: Phase 2 — implement real FRI check
    raise NotImplementedError("S5 signal extraction not yet implemented")


async def extract_s6_sim_swap(account_id: str) -> Dict[str, Any]:
    """
    S6 — SIM Swap
    Query internal mock DoT microservice.
    Returns: sim_swap_in_last_30_days (bool), swap_count (int)
    Based on synthetic flags set by the simulator.
    """
    # TODO: Phase 2 — implement mock DoT service query
    raise NotImplementedError("S6 signal extraction not yet implemented")


async def extract_all_signals(account_id: str, neo4j_driver=None, db_session=None) -> Dict[str, Any]:
    """
    Extract all 6 signals for a given account.
    Returns a dict with keys S1–S6, each containing signal-specific data.
    """
    # TODO: Phase 2 — orchestrate all signal extractions
    raise NotImplementedError("Full signal extraction not yet implemented")
