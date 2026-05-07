"""
SHAP Explainer utilities for PRISM.
Generates human-readable, regulatory-grade audit trails.
"""

import logging
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Any
import uuid

logger = logging.getLogger("prism.ml.shap")

class SHAPExplainer:
    def __init__(self, feature_names: List[str]):
        self.feature_names = feature_names
        self.signal_names = {
            "S1": "Test Credit Pattern",
            "S2": "Device Fingerprint Mismatch",
            "S3": "Velocity Derivative Convexity",
            "S4": "Dormant Reactivation",
            "S5": "FRI Contradiction",
            "S6": "SIM Swap Velocity"
        }
        
        # Mapping for plain english explanations
        self.feature_descriptions = {
            "s1_pattern_confidence": "Multiple small test deposits detected from dormant source accounts",
            "s4_device_delta_score": "Account reactivated on a completely new device with no prior history",
            "s5_contradiction_magnitude": "Internal risk signals are HIGH despite FRI classifying this number as LOW risk",
            "s6_swap_to_fraud_window_score": "SIM swap occurred within 7 days of UPI registration",
            "s1_micro_credit_count": "Abnormally high frequency of low-value incoming credits",
            "s3_zc_before_48": "Sudden acceleration in transaction velocity during 72-hour warming window",
            "s4_dormancy_days_norm": "Extended period of account dormancy followed by sudden activity",
            "s6_post_swap_txn_velocity_norm": "High transaction volume immediately following a SIM swap event"
        }

    def _get_plain_english(self, feature_name: str, signal_id: str) -> str:
        if feature_name in self.feature_descriptions:
            return self.feature_descriptions[feature_name]
        
        if signal_id == "S2":
            return "Device fingerprint anomaly detected"
        if signal_id == "S3":
            return "Transaction velocity anomaly detected"
            
        return f"Suspicious behavior detected in {self.signal_names.get(signal_id, signal_id)}"

    def generate_mlro_explanation(self, result: Any) -> Dict[str, Any]:
        """
        Produces human-readable explanation for MLRO dashboard.
        """
        top = result.top_3_features
        if not top:
            return {"error": "No features found"}
            
        # Format drivers
        drivers = []
        for i, f in enumerate(top):
            drivers.append({
                "feature_name": f["feature_name"],
                "signal_id": f["signal_id"],
                "contribution_points": f["shap_value"] * 10, # arbitrary scaling for visual points
                "plain_english": self._get_plain_english(f["feature_name"], f["signal_id"])
            })

        # Summary text
        summary = (
            f"WarmthScore: {result.warmth_score}. "
            f"PRIMARY: {drivers[0]['plain_english']} ({drivers[0]['signal_id']}) — {drivers[0]['contribution_points']:.1f} pts. "
            f"SECONDARY: {drivers[1]['plain_english']} ({drivers[1]['signal_id']}) — {drivers[1]['contribution_points']:.1f} pts. "
            f"TERTIARY: {drivers[2]['plain_english']} ({drivers[2]['signal_id']}) — {drivers[2]['contribution_points']:.1f} pts."
        )

        signal_summary = []
        for sig in result.signal_contributions:
            direction = "NEUTRAL"
            if sig["shap_contribution"] > 0.01: direction = "INCREASES"
            elif sig["shap_contribution"] < -0.01: direction = "DECREASES"
            
            signal_summary.append({
                "signal_id": sig["signal_id"],
                "signal_name": self.signal_names.get(sig["signal_id"]),
                "shap_contribution": sig["shap_contribution"],
                "risk_direction": direction
            })

        return {
            "account_id": result.account_id,
            "warmth_score": result.warmth_score,
            "risk_level": result.risk_level,
            "explanation_text": summary,
            "primary_driver": drivers[0],
            "secondary_driver": drivers[1],
            "tertiary_driver": drivers[2],
            "signal_summary": signal_summary,
            "legal_basis": result.threshold_actions[-1] if "LEGAL_BASIS" in result.threshold_actions[-1] else result.threshold_actions,
            "recommended_action": result.threshold_actions[0],
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    def generate_audit_trail(self, result: Any) -> Dict[str, Any]:
        """
        Creates immutable audit record for compliance.
        """
        fv_hash = hashlib.sha256(json.dumps(result.feature_vector, sort_keys=True).encode()).hexdigest()
        
        return {
            "audit_id": str(uuid.uuid4()),
            "account_id": result.account_id,
            "scored_at": result.scored_at,
            "warmth_score": result.warmth_score,
            "risk_level": result.risk_level,
            "probability": result.probability,
            "feature_vector_hash": fv_hash,
            "feature_vector": result.feature_vector,
            "shap_values": [f["shap_value"] for f in result.top_3_features], # actually should be all 43, simplified for now
            "signal_contributions": result.signal_contributions,
            "top_3_features": result.top_3_features,
            "threshold_actions": result.threshold_actions,
            "model_version": "1.0.0",
            "explainer_version": "1.0.0"
        }
