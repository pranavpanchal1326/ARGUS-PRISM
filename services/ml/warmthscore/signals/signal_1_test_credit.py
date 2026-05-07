import logging
import datetime
from dataclasses import dataclass
from typing import Dict, List, Any, Tuple
import numpy as np
from sklearn.ensemble import IsolationForest

logger = logging.getLogger("prism.signals.signal_1")



def _build_reference_profiles() -> np.ndarray:
    """Builds 25 reference clean profiles as a numpy array with shape (25, 8)."""
    np.random.seed(42)
    profiles = []
    for _ in range(25):
        mc_cnt = float(np.random.randint(0, 3))
        mc_amt = float(np.random.uniform(0.0, 50.0) if np.random.rand() > 0.5 else np.random.uniform(400.0, 500.0))
        age = float(np.random.randint(180, 2000))
        dorm = float(np.random.uniform(0.0, 0.05))
        var = float(np.random.uniform(3600.0, 86400.0))
        dst_cnt = float(1 if np.random.rand() > 0.5 else np.random.randint(8, 16))
        gap = -1.0
        acc_age = float(np.random.uniform(72.0, 720.0))
        profiles.append([mc_cnt, mc_amt, age, dorm, var, dst_cnt, gap, acc_age])
    return np.array(profiles)


def _load_signal_model() -> IsolationForest:
    """Fits IsolationForest on reference profiles."""
    model = IsolationForest(
        n_estimators=100,
        contamination=0.15,
        max_samples="auto",
        random_state=42,
        max_features=1.0
    )
    profiles = _build_reference_profiles()
    model.fit(profiles)
    return model

_REFERENCE_PROFILES = _build_reference_profiles()
_SIGNAL_1_MODEL = _load_signal_model()


def extract_features(transactions: List[Dict[str, Any]], account_meta: Dict[str, Any]) -> Dict[str, float]:
    """Extracts all 8 features from raw transaction list."""
    if "account_opened_at" not in account_meta:
        raise KeyError("account_opened_at is required in account_meta")
        
    feats = {
        "micro_credit_count": 0.0,
        "micro_credit_avg_amount": 0.0,
        "source_account_age_days": 0.0,
        "source_account_dormancy_flag": 0.0,
        "inter_credit_timing_variance": 0.0,
        "distinct_source_count": 0.0,
        "credits_to_large_transfer_gap_hours": -1.0,
        "account_age_at_first_credit_hours": -1.0
    }

    if not transactions:
        return feats

    acc_open_at = account_meta.get("account_opened_at")
    cutoff = acc_open_at + datetime.timedelta(hours=48) if acc_open_at else None

    micro_credits = []
    large_credits = []
    for tx in transactions:
        if tx.get("direction") == "CREDIT":
            amt = float(tx.get("amount", 0.0))
            ts = tx.get("timestamp")
            if cutoff and ts and ts <= cutoff and 1.0 <= amt <= 500.0:
                micro_credits.append(tx)
            elif amt > 10000.0:
                large_credits.append(tx)

    # Sort micro_credits by timestamp
    micro_credits.sort(key=lambda x: x["timestamp"])
    large_credits.sort(key=lambda x: x["timestamp"])

    mc_count = len(micro_credits)
    feats["micro_credit_count"] = float(mc_count)

    if mc_count == 0:
        return feats

    feats["micro_credit_avg_amount"] = sum(float(x.get("amount", 0.0)) for x in micro_credits) / mc_count
    feats["source_account_age_days"] = sum(float(x.get("source_account_age_days", 0.0)) for x in micro_credits) / mc_count
    
    dormant_count = sum(1.0 for x in micro_credits if x.get("source_account_dormant", False))
    feats["source_account_dormancy_flag"] = dormant_count / mc_count

    distinct_sources = set(x.get("source_account_id") for x in micro_credits if x.get("source_account_id"))
    feats["distinct_source_count"] = float(len(distinct_sources))

    if mc_count > 1:
        intervals = []
        for i in range(1, mc_count):
            diff = (micro_credits[i]["timestamp"] - micro_credits[i-1]["timestamp"]).total_seconds()
            intervals.append(diff)
        feats["inter_credit_timing_variance"] = float(np.std(intervals))
    else:
        feats["inter_credit_timing_variance"] = 0.0

    first_mc_ts = micro_credits[0]["timestamp"]
    last_mc_ts = micro_credits[-1]["timestamp"]

    if acc_open_at and first_mc_ts:
        feats["account_age_at_first_credit_hours"] = (first_mc_ts - acc_open_at).total_seconds() / 3600.0

    valid_large_credits = [lc for lc in large_credits if lc["timestamp"] >= last_mc_ts]
    if valid_large_credits:
        gap = (valid_large_credits[0]["timestamp"] - last_mc_ts).total_seconds() / 3600.0
        feats["credits_to_large_transfer_gap_hours"] = gap
    else:
        feats["credits_to_large_transfer_gap_hours"] = -1.0

    return feats


def compute_signal_score(features: Dict[str, float]) -> Tuple[float, float]:
    """Runs Isolation Forest on feature vector and applies rule-based override."""
    f_arr = np.array([[
        features["micro_credit_count"],
        features["micro_credit_avg_amount"],
        features["source_account_age_days"],
        features["source_account_dormancy_flag"],
        features["inter_credit_timing_variance"],
        features["distinct_source_count"],
        features["credits_to_large_transfer_gap_hours"],
        features["account_age_at_first_credit_hours"]
    ]])

    raw_score = float(_SIGNAL_1_MODEL.decision_function(f_arr)[0])
    
    if features["micro_credit_count"] == 0:
        return 0.0, raw_score
        
    if features["micro_credit_count"] > 8:
        # Cashback/legitimate heavy usage
        return 0.2, raw_score
    
    # flip: anomalous -> high score
    normalised = 1.0 - (raw_score + 0.5)
    signal_score = max(0.0, min(1.0, normalised))

    # Rule-based override
    cond1 = 3.0 <= features["micro_credit_count"] <= 8.0
    cond2 = features["source_account_age_days"] < 30.0
    cond3 = features["inter_credit_timing_variance"] < 300.0
    cond4 = features["account_age_at_first_credit_hours"] < 24.0
    
    # Ensure timing variance isn't 0.0 just because there was 1 transaction 
    # (cond1 handles this by requiring 3-8, so it's safe)

    if cond1 and cond2 and cond3 and cond4:
        signal_score = max(0.75, signal_score)

    return signal_score, raw_score


def compute_confidence(features: Dict[str, float]) -> float:
    """Counts triggered mule-pattern features and returns confidence."""
    triggers = 0
    if 3.0 <= features["micro_credit_count"] <= 8.0:
        triggers += 1
    if features["source_account_age_days"] < 30.0:
        triggers += 1
    if features["source_account_dormancy_flag"] > 0.5:
        triggers += 1
    if features["inter_credit_timing_variance"] < 300.0:
        triggers += 1
    if 2.0 <= features["distinct_source_count"] <= 5.0:
        triggers += 1
    if 0.0 <= features["account_age_at_first_credit_hours"] < 24.0:
        triggers += 1
    if 12.0 <= features["credits_to_large_transfer_gap_hours"] <= 72.0:
        triggers += 1
    if 50.0 <= features["micro_credit_avg_amount"] <= 300.0:
        triggers += 1

    return triggers / 8.0


def generate_explanation(features: Dict[str, float], signal_score: float, pattern_detected: bool) -> str:
    """Returns MLRO-readable explanation string."""
    mc_cnt = int(features["micro_credit_count"])
    avg_amt = features["micro_credit_avg_amount"]
    age = features["source_account_age_days"]
    var = features["inter_credit_timing_variance"]

    reasons = []
    if 3.0 <= mc_cnt <= 8.0:
        reasons.append("suspicious number of micro-credits")
    if age < 30.0:
        reasons.append("source accounts are very new")
    if var < 300.0 and mc_cnt > 1:
        reasons.append("abnormally low timing variance indicating scripted behaviour")
    if features["account_age_at_first_credit_hours"] < 24.0 and mc_cnt > 0:
        reasons.append("credits arrived suspiciously soon after account opening")

    reason_str = " Multiple suspicious indicators present."
    if reasons:
        reason_str = f" Top triggering reason: {reasons[0].capitalize()}."

    return (f"Signal 1 detected pattern_detected={pattern_detected}. "
            f"Found {mc_cnt} micro-credits averaging ₹{avg_amt:.2f}. "
            f"Source accounts averaged {age:.1f} days old. "
            f"Timing variance: {var:.1f}s.{reason_str}")


def evaluate(transactions: List[Dict[str, Any]], account_meta: Dict[str, Any]) -> Dict[str, Any]:
    """Orchestrates feature extraction and scoring. Handles all exceptions safely."""
    try:
        features = extract_features(transactions, account_meta)
        signal_score, raw_score = compute_signal_score(features)
        
        triggered = signal_score >= 0.35
        
        confidence = compute_confidence(features)
        explanation = generate_explanation(features, signal_score, triggered) if triggered else ""

        mc_count = features.get("micro_credit_count", 0.0)
        mc_total = mc_count * features.get("micro_credit_avg_amount", 0.0)
        
        shap_vector = [
            float(mc_count),
            float(mc_total),
            float(features.get("source_account_age_days", 0.0)),
            float(features.get("inter_credit_timing_variance", 0.0)),
            float(features.get("source_account_dormancy_flag", 0.0)),
            float(raw_score),
            float(confidence)
        ]

        return {
            "signal_id": "S1",
            "signal_name": "test_credit_pattern",
            "raw_score": signal_score,
            "confidence": confidence,
            "weight": 0.18,
            "weighted_score": round(signal_score * 0.18, 4),
            "triggered": triggered,
            "trigger_reason": explanation,
            "features": features,
            "shap_ready_vector": shap_vector
        }
    except Exception as e:
        logger.error(f"Signal 1 evaluation failed: {e}", exc_info=True)
        return {
            "signal_id": "S1",
            "signal_name": "test_credit_pattern",
            "raw_score": 0.0,
            "confidence": 0.0,
            "weight": 0.18,
            "weighted_score": 0.0,
            "triggered": False,
            "trigger_reason": f"Signal 1 evaluation failed: {e}",
            "features": {},
            "shap_ready_vector": [0.0] * 7
        }
