# ═══════════════════════════════════════════════════════
# ARGUS-PRISM | recruiters.py
# Engine: WarmthScore — Synthetic Dataset Generator
# Branch: pranav/warmthscore
# Research basis: BioCatch 2023, NPCI UPI spec, DoT Chakshu,
#                 RBI KYC Master Direction 2016
# ═══════════════════════════════════════════════════════
from typing import Any, Dict, List
import uuid

import numpy as np


def generate_recruiters(mule_account_ids: List[str]) -> List[Dict[str, Any]]:
    """Purpose: Generate recruiter accounts that seed mule test credits.

    Parameters:
        mule_account_ids: Mule account IDs targeted by recruiter campaigns.
    Returns:
        List of recruiter dictionaries with tier, targets, and funding data.
    PRISM signal: Signal 1 (test credit source simulation).
    """
    tiers = [
        ("CAMPAIGN_COORDINATOR", 12, (5, 15)),
        ("INDUSTRIAL_ORCHESTRATOR", 6, (15, 40)),
        ("PLATFORM_SCALE", 2, (40, 60)),
    ]

    recruiters: List[Dict[str, Any]] = []
    for tier_name, tier_count, target_range in tiers:
        for _ in range(tier_count):
            target_count = int(np.random.randint(target_range[0], target_range[1] + 1))
            targets = list(
                np.random.choice(mule_account_ids, size=target_count, replace=False)
            )

            recruiters.append(
                {
                    "recruiter_id": f"REC-{uuid.uuid4()}",
                    "recruiter_account_id": f"UBI-2026-{int(np.random.randint(1, 999999)):06d}",
                    "recruiter_warmth_score": float(np.random.uniform(10.0, 20.0)),
                    "tier": tier_name,
                    "target_account_ids": targets,
                    "target_count": int(target_count),
                    "campaign_start_hour": int(np.random.randint(0, 25)),
                    "test_payment_amount_inr": float(np.random.uniform(50.0, 200.0)),
                    "funding_source_amount_inr": float(np.random.uniform(50000.0, 500000.0)),
                    "funding_source_pattern": str(
                        np.random.choice(
                            ["OFFSHORE_WIRE", "HAWALA_PATTERN", "UNKNOWN"], p=[0.4, 0.3, 0.3]
                        )
                    ),
                }
            )

    return recruiters
