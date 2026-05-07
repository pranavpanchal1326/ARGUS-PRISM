"""
Feature Engineer for PRISM WarmthScore.
Assembles 43-float feature matrix from S1-S6 signal outputs.
"""

import logging
import numpy as np
from typing import Dict, List, Any

logger = logging.getLogger("prism.ml.feature_engineer")

# MASTER FEATURE NAME LIST
FEATURE_NAMES = [
    # S1: Test Credit Pattern (7)
    "s1_micro_credit_count", "s1_micro_credit_total",
    "s1_source_account_age_days", "s1_inter_credit_timing_var",
    "s1_source_dormancy_score", "s1_isolation_anomaly_score",
    "s1_pattern_confidence",
    
    # S2: Device Fingerprint (9)
    "s2_imei_changed_24h", "s2_hours_between_change_norm",
    "s2_unique_imei_count_norm", "s2_unique_sim_count_norm",
    "s2_blocked_prefix_matches_norm", "s2_max_proximity",
    "s2_shared_device_flag", "s2_device_velocity_norm",
    "s2_layer1_score",
    
    # S3: Velocity Derivative (8)
    "s3_zc_before_48", "s3_zc_hour_proximity",
    "s3_curve_shape_score", "s3_max_acceleration_norm",
    "s3_acceleration_ratio_norm", "s3_total_tx_norm",
    "s3_observation_age_norm", "s3_mean_velocity_norm",
    
    # S4: Dormant Reactivation (7)
    "s4_dormancy_days_norm", "s4_device_delta_score",
    "s4_reactivation_amount_norm", "s4_time_since_kyc_norm",
    "s4_channel_switch_score", "s4_combined_signal_score",
    "s4_pattern_confidence",
    
    # S5: FRI Contradiction (6)
    "s5_fri_score_norm", "s5_internal_partial_score_norm",
    "s5_contradiction_magnitude", "s5_sim_age_days_norm",
    "s5_complaint_history_norm", "s5_pattern_confidence",
    
    # S6: SIM Swap Velocity (6)
    "s6_days_to_upi_reg_norm", "s6_swap_frequency_norm",
    "s6_iccid_change_score", "s6_post_swap_txn_velocity_norm",
    "s6_swap_to_fraud_window_score", "s6_pattern_confidence"
]

SIGNAL_LENGTHS = {"S1": 7, "S2": 9, "S3": 8, "S4": 7, "S5": 6, "S6": 6}
SIGNAL_ORDER = ["S1", "S2", "S3", "S4", "S5", "S6"]
TOTAL_FEATURES = 43

class FeatureEngineer:
    def __init__(self):
        pass

    def assemble(self, signal_outputs: Dict[str, Any]) -> np.ndarray:
        """
        Concatenates all signal feature vectors into a single 43-float array.
        """
        vector = []
        
        for sig_id in SIGNAL_ORDER:
            if sig_id not in signal_outputs:
                logger.warning(f"Missing signal {sig_id} in assembly. Filling with zeros.")
                vector.extend([0.0] * SIGNAL_LENGTHS[sig_id])
                continue
                
            sig_res = signal_outputs[sig_id]
            # Use 'shap_ready_vector' for S1, S2, S3 and 'features' for S4, S5, S6
            # Actually, per refactor, all should have 'shap_ready_vector' or 'features'
            # Let's check both keys
            features = sig_res.get("shap_ready_vector") or sig_res.get("features", [])
            
            if len(features) != SIGNAL_LENGTHS[sig_id]:
                logger.error(f"Signal {sig_id} features length mismatch. Expected {SIGNAL_LENGTHS[sig_id]}, got {len(features)}. Padding/Clipping.")
                if len(features) < SIGNAL_LENGTHS[sig_id]:
                    features = list(features) + [0.0] * (SIGNAL_LENGTHS[sig_id] - len(features))
                else:
                    features = features[:SIGNAL_LENGTHS[sig_id]]
            
            # Clip to [0.0, 1.0]
            cleaned_features = [max(0.0, min(1.0, float(v))) for v in features]
            vector.extend(cleaned_features)
            
        final_vector = np.array(vector, dtype=np.float32)
        
        logger.debug(f"Assembled feature vector: shape={final_vector.shape}, min={np.min(final_vector):.4f}, max={np.max(final_vector):.4f}, mean={np.mean(final_vector):.4f}")
        return final_vector

    def assemble_batch(self, batch: List[Dict[str, Any]]) -> np.ndarray:
        """
        Processes a list of signal output dictionaries into a (N, 43) matrix.
        """
        matrix = []
        for i, item in enumerate(batch):
            try:
                matrix.append(self.assemble(item))
            except Exception as e:
                logger.error(f"Failed to assemble row {i}: {str(e)}")
                matrix.append(np.zeros(TOTAL_FEATURES, dtype=np.float32))
                
        return np.array(matrix, dtype=np.float32)

    def validate_feature_matrix(self, X: np.ndarray) -> Dict[str, Any]:
        """
        Validates feature matrix integrity.
        """
        errors = []
        if X.ndim != 2 or X.shape[1] != TOTAL_FEATURES:
            errors.append(f"Invalid shape: {X.shape}. Expected (n, {TOTAL_FEATURES})")
            
        nan_count = int(np.isnan(X).sum())
        inf_count = int(np.isinf(X).sum())
        out_of_range = int(((X < 0.0) | (X > 1.0)).sum())
        
        if nan_count > 0: errors.append(f"Found {nan_count} NaN values")
        if inf_count > 0: errors.append(f"Found {inf_count} Inf values")
        
        return {
            "valid": len(errors) == 0,
            "shape": X.shape,
            "nan_count": nan_count,
            "inf_count": inf_count,
            "out_of_range_count": out_of_range,
            "errors": errors
        }
