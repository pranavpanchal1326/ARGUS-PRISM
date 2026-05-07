"""
Signal 5: FRI Contradiction.
Weight in XGBoost Ensemble: 15%
Context: FRI = Financial Fraud Risk Indicator from DoT. 
Catching contradictions between external low risk (FRI) and internal high suspicion (S1-S4).
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import numpy as np

logger = logging.getLogger("prism.ml.signal5")

class FRIContradictionSignal:
    def __init__(self):
        pass

    def compute(self, fri_data: dict, partial_signals: dict) -> dict:
        """
        Calculates S5 signal features based on FRI and internal signal contradiction.
        """
        try:
            account_id = fri_data.get("account_id")
            fri_tier = fri_data.get("fri_tier")
            sim_activation_str = fri_data.get("sim_activation_date")
            complaint_count = fri_data.get("complaint_count", 0)

            if fri_tier not in [1, 2, 3, 4]:
                raise ValueError(f"Invalid FRI tier: {fri_tier}")
            if complaint_count < 0:
                raise ValueError("Complaint count must be >= 0")

            # Validate partial signals
            required_signals = ["S1", "S2", "S3", "S4"]
            for sig_id in required_signals:
                if sig_id not in partial_signals:
                    raise ValueError(f"Missing required partial signal: {sig_id}")
                features = partial_signals[sig_id].get("features", [])
                expected_len = {"S1": 7, "S2": 9, "S3": 8, "S4": 7}[sig_id]
                if len(features) != expected_len:
                    raise ValueError(f"Wrong feature length for {sig_id}: expected {expected_len}, got {len(features)}")

            # 1. s5_fri_score_norm
            s5_fri_score_norm = (fri_tier - 1) / 3.0

            # 2. s5_internal_partial_score_norm (mean of pattern_confidence)
            # S1 confidence = [6], S2 = [8], S3 = [7], S4 = [6]
            s1_conf = partial_signals["S1"]["features"][6]
            s2_conf = partial_signals["S2"]["features"][8]
            s3_conf = partial_signals["S3"]["features"][7]
            s4_conf = partial_signals["S4"]["features"][6]
            
            s5_internal_partial_score_norm = float(np.mean([s1_conf, s2_conf, s3_conf, s4_conf]))

            # 3. s5_contradiction_magnitude
            s5_contradiction_magnitude = max(0.0, s5_internal_partial_score_norm - s5_fri_score_norm)

            # 4. s5_sim_age_days_norm
            sim_activation_dt = datetime.fromisoformat(sim_activation_str.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            sim_age_days = (now - sim_activation_dt).days
            s5_sim_age_days_norm = 1.0 - min(max(sim_age_days, 0) / 90.0, 1.0)

            # 5. s5_complaint_history_norm
            s5_complaint_history_norm = min(complaint_count / 5.0, 1.0)

            # 6. s5_pattern_confidence
            if fri_tier == 1 and s5_internal_partial_score_norm >= 0.6:
                s5_pattern_confidence = 1.0
            elif fri_tier == 1 and s5_internal_partial_score_norm >= 0.4:
                s5_pattern_confidence = 0.7
            elif fri_tier <= 2 and s5_internal_partial_score_norm >= 0.6:
                s5_pattern_confidence = 0.5
            else:
                s5_pattern_confidence = s5_contradiction_magnitude * 0.5

            features = [
                float(s5_fri_score_norm),
                float(s5_internal_partial_score_norm),
                float(s5_contradiction_magnitude),
                float(s5_sim_age_days_norm),
                float(s5_complaint_history_norm),
                float(s5_pattern_confidence)
            ]

            return {
                "signal_id": "S5",
                "weight": 0.15,
                "features": features,
                "feature_names": [
                    "s5_fri_score_norm",
                    "s5_internal_partial_score_norm",
                    "s5_contradiction_magnitude",
                    "s5_sim_age_days_norm",
                    "s5_complaint_history_norm",
                    "s5_pattern_confidence"
                ],
                "raw_inputs": {
                    "fri_tier": fri_tier,
                    "internal_partial": s5_internal_partial_score_norm,
                    "sim_age_days": sim_age_days,
                    "complaint_count": complaint_count
                },
                "computed_at": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error computing S5 for {fri_data.get('account_id')}: {str(e)}")
            raise

    def compute_batch(self, fri_batch: List[dict], partial_signals_batch: List[dict]) -> List[dict]:
        results = []
        for fri, partial in zip(fri_batch, partial_signals_batch):
            try:
                results.append(self.compute(fri, partial))
            except Exception as e:
                account_id = fri.get("account_id", "unknown")
                results.append({
                    "signal_id": "S5",
                    "weight": 0.15,
                    "features": [0.0] * 6,
                    "error": str(e),
                    "account_id": account_id,
                    "computed_at": datetime.now(timezone.utc).isoformat()
                })
        return results
