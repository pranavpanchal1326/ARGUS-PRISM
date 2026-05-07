"""
Signal 3: Velocity Derivative Convexity
Weight in XGBoost Ensemble: 15%
Mathematical Basis: Acceleration of transaction velocity crossing zero indicating a pre-crime warming pipeline.
Legal Basis: BioCatch 2023 validates 72hr warming phase.
"""

import logging
import json
from typing import TypedDict, List, Dict, Optional, Any
import numpy as np

logger = logging.getLogger("prism.signals.signal3")

# Constants
BUCKET_SIZE_HOURS = 4.0
NUM_BUCKETS = 18
ZERO_CROSSING_THRESHOLD = 0.10
SIGNAL_WEIGHT = 0.15
TRIGGER_THRESHOLD = 0.35
MIN_TRANSACTIONS_FOR_ANALYSIS = 3

class Transaction(TypedDict):
    transaction_id: str
    amount: float
    direction: str
    timestamp_epoch: int
    channel: str
    counterparty_account_id: str

def _build_velocity_buckets(
    transactions: List[Dict[str, Any]], 
    account_created_epoch: int, 
    observation_window_hours: float
) -> Tuple[List[float], int, float]:
    """
    Filters credits and buckets them over the observation window.
    Returns: (credit_only_velocity, total_transactions, max_hour_seen)
    """
    velocity = [0.0] * NUM_BUCKETS
    total_tx = 0
    max_hr = 0.0
    
    for tx in transactions:
        total_tx += 1
        if tx.get("direction") != "CREDIT":
            continue
            
        ts = tx.get("timestamp_epoch", 0)
        hrs = (ts - account_created_epoch) / 3600.0
        
        if hrs < 0.0 or hrs > observation_window_hours:
            continue
            
        if hrs > max_hr:
            max_hr = hrs
            
        b_idx = int(hrs / BUCKET_SIZE_HOURS)
        if b_idx >= NUM_BUCKETS:
            b_idx = NUM_BUCKETS - 1
            
        velocity[b_idx] += 1.0
        
    return velocity, total_tx, max_hr

def _compute_derivatives(velocity: List[float]) -> Tuple[List[float], List[float]]:
    """Computes first and second derivatives of velocity."""
    first = []
    for i in range(1, len(velocity)):
        first.append(float(velocity[i] - velocity[i-1]))
        
    second = []
    for i in range(1, len(first)):
        second.append(float(first[i] - first[i-1]))
        
    return first, second

def _find_zero_crossing(second_derivative: List[float]) -> Tuple[Optional[float], bool]:
    """Finds the hour where acceleration crosses threshold."""
    zc_idx = None
    for i in range(1, len(second_derivative)):
        if second_derivative[i] > ZERO_CROSSING_THRESHOLD and second_derivative[i-1] <= ZERO_CROSSING_THRESHOLD:
            zc_idx = i
            break
            
    if zc_idx is None:
        return None, False
        
    zc_hour = (zc_idx + 2) * BUCKET_SIZE_HOURS
    zc_before_48 = zc_hour < 48.0
    
    return float(zc_hour), zc_before_48

def _classify_curve_shape(second_derivative: List[float]) -> Tuple[str, float, float]:
    """Classifies overall acceleration curve."""
    pos_count = sum(1 for v in second_derivative if v > ZERO_CROSSING_THRESHOLD)
    neg_count = sum(1 for v in second_derivative if v < -ZERO_CROSSING_THRESHOLD)
    total_nz = pos_count + neg_count
    
    n_len = len(second_derivative)
    if n_len == 0:
        return "LINEAR", 0.0, 0.0
        
    if total_nz == 0:
        shape = "LINEAR"
    elif pos_count / n_len >= 0.50:
        shape = "CONVEX"
    elif neg_count / n_len >= 0.50:
        shape = "CONCAVE"
    else:
        shape = "LINEAR"
        
    early = second_derivative[:8]
    late = second_derivative[8:]
    
    e_mean = float(np.mean(early)) if early else 0.0
    l_mean = float(np.mean(late)) if late else 0.0
    
    acc_ratio = 0.0
    if l_mean != 0.0:
        acc_ratio = e_mean / l_mean
        
    max_sd = float(np.max(second_derivative)) if second_derivative else 0.0
    return shape, float(acc_ratio), max_sd

def _compute_confidence(total_tx: int, sd_len: int, obs_hrs: float) -> float:
    """Computes certainty of the detection signal."""
    base = 0.5
    if total_tx >= 8:
        base += 0.3
    elif total_tx >= 4:
        base += 0.15
        
    if sd_len >= 10:
        base += 0.15
        
    if obs_hrs >= 48:
        base += 0.05
        
    return round(min(1.0, base), 4)

def detect_velocity_convexity(account_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    MAIN FUNCTION for Signal 3.
    Evaluates velocity derivative convexity.
    """
    if "transactions" not in account_data or "account_created_epoch" not in account_data:
        return _build_insufficient_result()
        
    obs_win = float(account_data.get("observation_window_hours", 72.0))
    if obs_win <= 0:
        raise ValueError("observation_window_hours must be > 0")
        
    epoch = int(account_data["account_created_epoch"])
    txs = account_data["transactions"]
    
    vel_bucket, total_tx, max_hr = _build_velocity_buckets(txs, epoch, obs_win)
    total_credits = sum(vel_bucket)
    
    if total_credits < MIN_TRANSACTIONS_FOR_ANALYSIS:
        return _build_insufficient_result(total_tx, max_hr, obs_win, vel_bucket)
        
    first_deriv, sec_deriv = _compute_derivatives(vel_bucket)
    zc_hr, zc_before_48 = _find_zero_crossing(sec_deriv)
    shape, acc_ratio, max_sd = _classify_curve_shape(sec_deriv)
    
    # COMPONENT A
    comp_a = 0.0
    if zc_before_48:
        comp_a = 1.0
    elif zc_hr is not None and zc_hr < 60.0:
        comp_a = 0.60
    elif zc_hr is not None:
        comp_a = 0.30
        
    # COMPONENT B
    comp_b = 0.0
    if shape == "CONVEX":
        comp_b = 1.0
    elif shape == "LINEAR":
        comp_b = 0.20
        
    # COMPONENT C
    comp_c = 0.0
    if max_sd >= 5.0:
        comp_c = 1.0
    elif max_sd >= 3.0:
        comp_c = 0.75
    elif max_sd >= 1.5:
        comp_c = 0.50
    elif max_sd >= 0.5:
        comp_c = 0.25
        
    # COMPONENT D
    comp_d = 0.0
    if acc_ratio >= 3.0:
        comp_d = 1.0
    elif acc_ratio >= 2.0:
        comp_d = 0.75
    elif acc_ratio >= 1.0:
        comp_d = 0.40
        
    raw_score = (
        comp_a * 0.45 +
        comp_b * 0.30 +
        comp_c * 0.15 +
        comp_d * 0.10
    )
    raw_score = round(min(1.0, max(0.0, raw_score)), 4)
    conf = _compute_confidence(total_tx, len(sec_deriv), max_hr)
    w_score = round(raw_score * SIGNAL_WEIGHT, 4)
    triggered = raw_score > TRIGGER_THRESHOLD
    
    reason = ""
    if triggered:
        parts = []
        if zc_before_48:
            parts.append(f"Velocity acceleration zero-crossing at hour {zc_hr:.1f} \u2014 before 48h threshold")
        if shape == "CONVEX":
            parts.append("Transaction velocity curve is convex \u2014 recruiter pipeline pattern")
        if max_sd >= 3.0:
            parts.append(f"Peak acceleration {max_sd:.2f} transactions/bucket\u00b2 exceeds mule threshold")
        if acc_ratio >= 2.0:
            parts.append(f"Early-phase acceleration ratio {acc_ratio:.2f}x \u2014 front-loaded warming pattern")
        reason = " \u00b7 ".join(parts)
        
    zc_hr_val = zc_hr if zc_hr is not None else 0.0
    shap = [
        1.0 if zc_before_48 else 0.0,
        float(max(0.0, (72.0 - zc_hr_val) / 72.0)) if zc_hr_val > 0 else 0.0,
        1.0 if shape == "CONVEX" else (0.2 if shape == "LINEAR" else 0.0),
        min(max_sd / 10.0, 1.0),
        min(acc_ratio / 5.0, 1.0),
        min(total_tx / 20.0, 1.0),
        max_hr / 72.0,
        min(float(np.mean(vel_bucket)) / 5.0, 1.0)
    ]
    
    return {
        "signal_id": "S3",
        "signal_name": "velocity_derivative_convexity",
        "raw_score": raw_score,
        "confidence": conf,
        "weight": SIGNAL_WEIGHT,
        "weighted_score": w_score,
        "triggered": triggered,
        "trigger_reason": reason,
        "features": {
            "total_transactions": total_tx,
            "observation_hours_actual": max_hr,
            "bucket_size_hours": BUCKET_SIZE_HOURS,
            "velocity_per_bucket": vel_bucket,
            "first_derivative": first_deriv,
            "second_derivative": sec_deriv,
            "curve_shape": shape,
            "zero_crossing_hour": zc_hr,
            "zero_crossing_before_48h": zc_before_48,
            "max_second_derivative": max_sd,
            "acceleration_ratio": acc_ratio,
            "credit_only_velocity": vel_bucket
        },
        "shap_ready_vector": shap
    }

def _build_insufficient_result(tot=0, mhr=0.0, obs=72.0, vb=None) -> Dict[str, Any]:
    return {
        "signal_id": "S3",
        "signal_name": "velocity_derivative_convexity",
        "raw_score": 0.0,
        "confidence": 0.2,
        "weight": SIGNAL_WEIGHT,
        "weighted_score": 0.0,
        "triggered": False,
        "trigger_reason": "INSUFFICIENT_DATA",
        "features": {
            "total_transactions": tot,
            "observation_hours_actual": mhr,
            "bucket_size_hours": BUCKET_SIZE_HOURS,
            "velocity_per_bucket": vb or [],
            "first_derivative": [],
            "second_derivative": [],
            "curve_shape": "INSUFFICIENT_DATA",
            "zero_crossing_hour": None,
            "zero_crossing_before_48h": False,
            "max_second_derivative": 0.0,
            "acceleration_ratio": 0.0,
            "credit_only_velocity": vb or []
        },
        "shap_ready_vector": [0.0]*8
    }

if __name__ == "__main__":
    def run_test(name, account_data, expected_triggered, expected_shape, expected_raw=None):
        try:
            res = detect_velocity_convexity(account_data)
        except Exception as e:
            res = {"error": str(e), "triggered": False, "features": {"curve_shape": "ERROR"}}
            
        passed = True
        if res.get("triggered") != expected_triggered:
            passed = False
        if res.get("features", {}).get("curve_shape") not in expected_shape:
            passed = False
        if expected_raw is not None and not expected_raw(res.get("raw_score", 0.0)):
            passed = False
            
        print(f"--- {name} ---")
        print(json.dumps(res, indent=2))
        print("RESULT: PASS\n" if passed else "RESULT: FAIL\n")
        
    # TEST CASE 1: CLEAN LEGITIMATE ACCOUNT (must NOT trigger)
    tc1_data = {
        "account_id": "TC1",
        "account_created_epoch": 0,
        "observation_window_hours": 72.0,
        "transactions": []
    }
    # 18 transactions, exactly 1 per bucket to ensure 0 second derivative
    for i in range(18):
        tc1_data["transactions"].append({
            "transaction_id": f"tx_{i}",
            "amount": 1000.0,
            "direction": "CREDIT",
            "timestamp_epoch": i * 4 * 3600 + 10, # middle of bucket
            "channel": "UPI",
            "counterparty_account_id": f"acc_{i}"
        })
    run_test("TEST CASE 1 — CLEAN LEGITIMATE ACCOUNT", tc1_data, False, ["LINEAR", "CONCAVE"])

    # TEST CASE 2: MULE WARMING PATTERN (must trigger HIGH)
    tc2_data = {
        "account_id": "TC2",
        "account_created_epoch": 0,
        "observation_window_hours": 72.0,
        "transactions": []
    }
    # Quadratic acceleration to guarantee CONVEX shape (>50% positive second derivatives)
    tx_id = 0
    for b in range(1, 10):
        count = b * b
        for _ in range(count):
            tc2_data["transactions"].append({
                "transaction_id": f"tx_{tx_id}",
                "amount": 200.0,
                "direction": "CREDIT",
                "timestamp_epoch": b * 4 * 3600 + 10,
                "channel": "UPI",
                "counterparty_account_id": f"acc_{tx_id}"
            })
            tx_id += 1
            
    run_test("TEST CASE 2 — MULE WARMING PATTERN", tc2_data, True, ["CONVEX"], lambda x: x > 0.70)

    # TEST CASE 3: INSUFFICIENT DATA
    tc3_data = {
        "account_id": "TC3",
        "account_created_epoch": 0,
        "observation_window_hours": 72.0,
        "transactions": [
            {"transaction_id": "tx_0", "amount": 100.0, "direction": "CREDIT", "timestamp_epoch": 3600, "channel": "UPI", "counterparty_account_id": "c_1"},
            {"transaction_id": "tx_1", "amount": 100.0, "direction": "CREDIT", "timestamp_epoch": 7200, "channel": "UPI", "counterparty_account_id": "c_2"}
        ]
    }
    run_test("TEST CASE 3 — INSUFFICIENT DATA", tc3_data, False, ["INSUFFICIENT_DATA"], lambda x: x == 0.0)
