"""
Signal 4: Dormant Reactivation.
Weight in XGBoost Ensemble: 20%
Legal Basis: RBI KYC Master Direction 2016 S.38 - Monitoring of transactions in dormant accounts.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

logger = logging.getLogger("prism.ml.signal4")

class DormantReactivationSignal:
    def __init__(self):
        pass

    def compute(self, account_data: dict) -> dict:
        """
        Calculates S4 signal features based on dormancy and reactivation behavior.
        """
        try:
            account_id = account_data.get("account_id")
            last_tx_str = account_data.get("last_transaction_date")
            reactivation_str = account_data.get("reactivation_date")
            last_device_id = account_data.get("last_session_device_id")
            current_device_id = account_data.get("current_device_id")
            last_imei_prefix = account_data.get("last_session_imei_prefix")
            current_imei_prefix = account_data.get("current_imei_prefix")
            reactivation_amt = account_data.get("first_reactivation_amount", 0.0)
            last_kyc_str = account_data.get("last_kyc_date")
            historical_channels = account_data.get("historical_channels", [])
            current_channel = account_data.get("current_channel")

            if reactivation_amt < 0:
                raise ValueError("Reactivation amount must be >= 0.0")

            reactivation_dt = datetime.fromisoformat(reactivation_str.replace("Z", "+00:00"))
            
            # 1. s4_dormancy_days_norm
            if last_tx_str:
                last_tx_dt = datetime.fromisoformat(last_tx_str.replace("Z", "+00:00"))
                dormancy_days = (reactivation_dt - last_tx_dt).days
            else:
                dormancy_days = 730
            s4_dormancy_days_norm = min(max(dormancy_days, 0) / 730.0, 1.0)

            # 2. s4_device_delta_score
            if last_device_id is None:
                s4_device_delta_score = 1.0
            elif current_device_id == last_device_id:
                s4_device_delta_score = 0.0
            elif current_imei_prefix == last_imei_prefix:
                s4_device_delta_score = 0.5
            else:
                s4_device_delta_score = 1.0

            # 3. s4_reactivation_amount_norm
            s4_reactivation_amount_norm = min(reactivation_amt / 500000.0, 1.0)

            # 4. s4_time_since_kyc_norm
            if last_kyc_str:
                last_kyc_dt = datetime.fromisoformat(last_kyc_str.replace("Z", "+00:00"))
                kyc_days = (reactivation_dt - last_kyc_dt).days
            else:
                kyc_days = 1095
            s4_time_since_kyc_norm = min(max(kyc_days, 0) / 1095.0, 1.0)

            # 5. s4_channel_switch_score
            if current_channel in historical_channels:
                s4_channel_switch_score = 0.0
            elif len(historical_channels) > 0:
                if len(set(historical_channels) & {current_channel}) == 0:
                    s4_channel_switch_score = 0.5 if len(historical_channels) >= 2 else 1.0
                else:
                    # Should not happen based on logic but for safety
                    s4_channel_switch_score = 0.0
            else:
                s4_channel_switch_score = 1.0

            # 6. s4_combined_signal_score
            s4_combined_signal_score = (
                (s4_dormancy_days_norm * 0.30) +
                (s4_device_delta_score * 0.35) +
                (s4_reactivation_amount_norm * 0.15) +
                (s4_time_since_kyc_norm * 0.10) +
                (s4_channel_switch_score * 0.10)
            )

            # 7. s4_pattern_confidence
            if dormancy_days >= 180 and s4_device_delta_score >= 0.5:
                s4_pattern_confidence = 1.0
            elif dormancy_days >= 90 and s4_device_delta_score >= 0.5:
                s4_pattern_confidence = 0.6
            elif dormancy_days >= 90:
                s4_pattern_confidence = 0.3
            else:
                s4_pattern_confidence = 0.0

            features = [
                float(s4_dormancy_days_norm),
                float(s4_device_delta_score),
                float(s4_reactivation_amount_norm),
                float(s4_time_since_kyc_norm),
                float(s4_channel_switch_score),
                float(s4_combined_signal_score),
                float(s4_pattern_confidence)
            ]

            return {
                "signal_id": "S4",
                "weight": 0.20,
                "features": features,
                "feature_names": [
                    "s4_dormancy_days_norm",
                    "s4_device_delta_score",
                    "s4_reactivation_amount_norm",
                    "s4_time_since_kyc_norm",
                    "s4_channel_switch_score",
                    "s4_combined_signal_score",
                    "s4_pattern_confidence"
                ],
                "raw_inputs": {
                    "dormancy_days": dormancy_days,
                    "device_delta_score": s4_device_delta_score,
                    "reactivation_amount": reactivation_amt,
                    "kyc_days": kyc_days,
                    "channel_switch_score": s4_channel_switch_score
                },
                "computed_at": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error computing S4 for {account_data.get('account_id')}: {str(e)}")
            raise

    def compute_batch(self, accounts: List[dict]) -> List[dict]:
        results = []
        for account in accounts:
            try:
                results.append(self.compute(account))
            except Exception as e:
                account_id = account.get("account_id", "unknown")
                results.append({
                    "signal_id": "S4",
                    "weight": 0.20,
                    "features": [0.0] * 7,
                    "error": str(e),
                    "account_id": account_id,
                    "computed_at": datetime.now(timezone.utc).isoformat()
                })
        return results
