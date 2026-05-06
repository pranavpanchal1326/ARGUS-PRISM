# ═══════════════════════════════════════════════════════
# ARGUS-PRISM | taint_network.py
# Engine: WarmthScore — Synthetic Dataset Generator
# Branch: pranav/warmthscore
# Research basis: BioCatch 2023, NPCI UPI spec, DoT Chakshu,
#                 RBI KYC Master Direction 2016
# ═══════════════════════════════════════════════════════
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple
import uuid

import numpy as np

IST = timezone(timedelta(hours=5, minutes=30))


TAINT_SCORES: Dict[int, int] = {1: 80, 2: 55, 3: 30, 4: 15}


def generate_taint_network(
    profile2_ids: List[str],
) -> Tuple[Dict[str, Any], Dict[str, float]]:
    """Purpose: Simulate historical mule taint cases and mapping to reactivations.

    Parameters:
        profile2_ids: Dormant reactivation mule account IDs.
    Returns:
        Taint network dictionary and taint score map for profile2 accounts.
    PRISM signal: Signal 4 (dormancy + taint inheritance).
    """
    target_count = int(np.floor(0.4 * len(profile2_ids)))
    selected_ids = list(np.random.choice(profile2_ids, size=target_count, replace=False))

    half = int(np.floor(len(selected_ids) / 2))
    one_hop_ids = selected_ids[:half]
    two_hop_ids = selected_ids[half:]

    taint_map: Dict[str, float] = {}
    for account_id in one_hop_ids:
        taint_map[account_id] = float(TAINT_SCORES[1])
    for account_id in two_hop_ids:
        taint_map[account_id] = float(TAINT_SCORES[2])

    reactivated_taint_map: List[Dict[str, Any]] = [
        {"account_id": account_id, "hop": 1, "taint_score": float(TAINT_SCORES[1])}
        for account_id in one_hop_ids
    ] + [
        {"account_id": account_id, "hop": 2, "taint_score": float(TAINT_SCORES[2])}
        for account_id in two_hop_ids
    ]

    cases: List[Dict[str, Any]] = []
    pending_ids = list(selected_ids)
    for _ in range(5):
        case_id = f"TAINT-{uuid.uuid4()}"
        confirmed_mule_id = f"UBI-2024-{int(np.random.randint(1, 999999)):06d}"
        confirmed_at = datetime(2025, 3, int(np.random.randint(1, 28)), tzinfo=IST).isoformat()

        connection_count = 12
        connections: List[Dict[str, Any]] = []

        hop_plan = [1] * 6 + [2] * 4 + [3] + [4]
        hop_plan = hop_plan[:connection_count]

        for hop in hop_plan:
            if pending_ids and hop in (1, 2):
                account_id = pending_ids.pop(0)
            else:
                account_id = f"UBI-2024-{int(np.random.randint(1, 999999)):06d}"
            connections.append(
                {
                    "account_id": account_id,
                    "hop": int(hop),
                    "taint_score": float(TAINT_SCORES[int(hop)]),
                }
            )

        cases.append(
            {
                "case_id": case_id,
                "confirmed_mule_id": confirmed_mule_id,
                "confirmed_at": confirmed_at,
                "connections": connections,
            }
        )

    network = {
        "cases": cases,
        "reactivated_taint_map": reactivated_taint_map,
    }

    return network, taint_map
