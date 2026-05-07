"""
Signal 6: SIM Swap Velocity.
Weight in XGBoost Ensemble: 10%
Context: DoT DIP API integration. SIM swap within 7 days of UPI registration is a precursor to takeover.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

logger = logging.getLogger("prism.ml.signal6")

class SIMSwapSignal:
    def __init__(self):
        pass

    def compute(self, swap_data: dict) -> dict:
        """
        Calculates S6 signal features based on SIM swap events and UPI registration.
        """
        try:
            account_id = swap_data.get("account_id")
            upi_reg_str = swap_data.get("upi_registration_date")
            swap_events = swap_data.get("swap_events", [])
            txn_post_swap_24h = swap_data.get("transactions_post_swap_24h", 0)

            if txn_post_swap_24h < 0:
                raise ValueError("Post-swap transaction velocity must be >= 0")

            # 1. s6_swap_frequency_norm
            s6_swap_frequency_norm = 0.0
            if swap_events:
                # Convert all swap dates
                swap_dates = []
                for event in swap_events:
                    dt = datetime.fromisoformat(event["swap_date"].replace("Z", "+00:00"))
                    swap_dates.append(dt)
                
                latest_swap = max(swap_dates)
                recent_swaps = sum(1 for d in swap_dates if (latest_swap - d).days <= 30)
                s6_swap_frequency_norm = min(recent_swaps / 5.0, 1.0)

            # 2. s6_days_to_upi_reg_norm & 5. s6_swap_to_fraud_window_score
            s6_days_to_upi_reg_norm = 0.0
            s6_swap_to_fraud_window_score = 0.0
            min_days_to_upi = float('inf')

            if upi_reg_str and swap_events:
                upi_reg_dt = datetime.fromisoformat(upi_reg_str.replace("Z", "+00:00"))
                for event in swap_events:
                    sd = datetime.fromisoformat(event["swap_date"].replace("Z", "+00:00"))
                    diff_days = abs((upi_reg_dt - sd).days)
                    if diff_days < min_days_to_upi:
                        min_days_to_upi = diff_days
                
                s6_days_to_upi_reg_norm = 1.0 - min(min_days_to_upi / 7.0, 1.0)
                
                if min_days_to_upi <= 7:
                    s6_swap_to_fraud_window_score = 1.0
                elif min_days_to_upi <= 14:
                    s6_swap_to_fraud_window_score = 0.5
                else:
                    s6_swap_to_fraud_window_score = 0.0

            # 3. s6_iccid_change_score
            s6_iccid_change_score = 0.0
            if swap_events:
                unique_changes = 0
                seen_changes = set()
                for event in swap_events:
                    change = (event.get("old_iccid"), event.get("new_iccid"))
                    if change[0] != change[1] and change not in seen_changes:
                        unique_changes += 1
                        seen_changes.add(change)
                
                if unique_changes == 0:
                    s6_iccid_change_score = 0.0
                elif unique_changes == 1:
                    s6_iccid_change_score = 0.5
                else:
                    s6_iccid_change_score = 1.0

            # 4. s6_post_swap_txn_velocity_norm
            s6_post_swap_txn_velocity_norm = min(txn_post_swap_24h / 20.0, 1.0)

            # 6. s6_pattern_confidence
            if s6_swap_to_fraud_window_score == 1.0 and s6_swap_frequency_norm >= 0.2:
                s6_pattern_confidence = 1.0
            elif s6_swap_to_fraud_window_score >= 0.5:
                s6_pattern_confidence = 0.6
            elif s6_iccid_change_score >= 0.5:
                s6_pattern_confidence = 0.3
            else:
                s6_pattern_confidence = 0.0

            features = [
                float(s6_days_to_upi_reg_norm),
                float(s6_swap_frequency_norm),
                float(s6_iccid_change_score),
                float(s6_post_swap_txn_velocity_norm),
                float(s6_swap_to_fraud_window_score),
                float(s6_pattern_confidence)
            ]

            return {
                "signal_id": "S6",
                "weight": 0.10,
                "features": features,
                "feature_names": [
                    "s6_days_to_upi_reg_norm",
                    "s6_swap_frequency_norm",
                    "s6_iccid_change_score",
                    "s6_post_swap_txn_velocity_norm",
                    "s6_swap_to_fraud_window_score",
                    "s6_pattern_confidence"
                ],
                "raw_inputs": {
                    "min_days_to_upi": min_days_to_upi if min_days_to_upi != float('inf') else None,
                    "swap_count_30d": s6_swap_frequency_norm * 5.0,
                    "iccid_changes": s6_iccid_change_score * 2.0,
                    "txn_post_swap": txn_post_swap_24h
                },
                "computed_at": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error computing S6 for {swap_data.get('account_id')}: {str(e)}")
            raise

    def compute_batch(self, batch: List[dict]) -> List[dict]:
        results = []
        for item in batch:
            try:
                results.append(self.compute(item))
            except Exception as e:
                account_id = item.get("account_id", "unknown")
                results.append({
                    "signal_id": "S6",
                    "weight": 0.10,
                    "features": [0.0] * 6,
                    "error": str(e),
                    "account_id": account_id,
                    "computed_at": datetime.now(timezone.utc).isoformat()
                })
        return results
