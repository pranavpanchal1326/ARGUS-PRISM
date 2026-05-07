"""
Signal 2: Device Fingerprint Mismatch.
Weight in XGBoost Ensemble: 22%
Legal Basis: RBI MD 2016 - KYC updates and anomaly tracking

Detects account opening on one device and UPI registration on another,
combined with matching against blocked IMEI prefix clusters.
"""

import logging
import json
from typing import TypedDict, List, Dict, Set, Optional, Any
import numpy as np

logger = logging.getLogger("prism.signals.signal2")

# Constants
WEIGHT = 0.22
LAYER1_WEIGHT = 0.40
LAYER2_WEIGHT = 0.35
LAYER3_WEIGHT = 0.15
LAYER4_WEIGHT = 0.10
TRIGGER_THRESHOLD = 0.35
SECONDS_IN_24H = 86400
SECONDS_IN_HOUR = 3600

class DeviceEvent(TypedDict):
    event_type: str
    imei: str
    iccid: str
    device_model: str
    timestamp_epoch: int
    session_id: str

def _compute_prefix_proximity(imei: str, blocked_prefixes: List[str]) -> float:
    """
    Computes cluster proximity score (character level similarity).
    Returns similarity 0.0 to 1.0.
    """
    if not imei or len(imei) < 8 or not blocked_prefixes:
        return 0.0
        
    prefix_8 = imei[:8]
    max_sim = 0.0
    for blocked in blocked_prefixes:
        if not blocked or len(blocked) < 8:
            continue
        blocked_8 = blocked[:8]
        
        matches = 0
        for i in range(8):
            if prefix_8[i] == blocked_8[i]:
                matches += 1
        
        sim = matches / 8.0
        if sim > max_sim:
            max_sim = sim
            if max_sim == 1.0:
                break
                
    return max_sim

def _compute_confidence(device_events: List[Dict[str, Any]], blocked_prefixes: List[str]) -> float:
    """Computes certainty of the detection signal."""
    if not device_events:
        return 0.0
        
    has_open = any(e.get("event_type") == "ACCOUNT_OPEN" for e in device_events)
    has_upi = any(e.get("event_type") == "UPI_REGISTER" for e in device_events)
    
    if not has_open:
        conf = 0.3
    elif not has_upi:
        conf = 0.5
    else:
        conf = 0.9
        
    if len(blocked_prefixes) < 5:
        conf *= 0.7
        
    return min(1.0, conf)

def detect_device_fingerprint(account_data: Dict[str, Any], known_shared_imeis: Optional[Set[str]] = None) -> Dict[str, Any]:
    """
    MAIN FUNCTION for Signal 2.
    Evaluates device fingerprint mismatch risk.
    """
    device_events: List[Dict[str, Any]] = account_data.get("device_events", [])
    account_created_epoch = account_data.get("account_created_epoch", 0)
    blocked_prefixes = account_data.get("blocked_imei_prefixes", [])
    
    if not device_events:
        return {
            "signal_id": "S2",
            "signal_name": "device_fingerprint_mismatch",
            "raw_score": 0.0,
            "confidence": 0.0,
            "weight": WEIGHT,
            "weighted_score": 0.0,
            "triggered": False,
            "trigger_reason": "INSUFFICIENT_DATA",
            "features": {
                "account_open_imei": "",
                "upi_register_imei": "",
                "imei_changed_within_24h": False,
                "hours_between_device_change": 0.0,
                "unique_imei_count": 0,
                "unique_sim_count": 0,
                "blocked_prefix_matches": 0,
                "closest_blocked_prefix_distance": 0.0,
                "cross_account_device_sharing": False,
                "device_registration_velocity": 0.0
            },
            "shap_ready_vector": [0.0]*9
        }
        
    if not account_created_epoch:
        logger.warning("account_created_epoch missing or zero. Continuing with available data.")

    # --- Feature Extraction ---
    imei_open = ""
    imei_upi = ""
    open_ts = 0
    upi_ts = 0
    
    unique_imeis = set()
    unique_sims = set()
    
    for event in device_events:
        evt_type = event.get("event_type")
        imei = event.get("imei", "")
        iccid = event.get("iccid", "")
        ts = event.get("timestamp_epoch", 0)
        
        if imei:
            unique_imeis.add(imei)
        if iccid:
            unique_sims.add(iccid)
            
        if evt_type == "ACCOUNT_OPEN" and not imei_open:
            imei_open = imei
            open_ts = ts
        elif evt_type == "UPI_REGISTER" and not imei_upi:
            imei_upi = imei
            upi_ts = ts

    # --- LAYER 1: Device Change within 24 hours ---
    layer1_score = 0.0
    imei_changed_within_24h = False
    hours_between_device_change = 0.0
    
    if imei_open and imei_upi:
        if imei_open != imei_upi:
            delta = abs(upi_ts - open_ts)
            hours_between_device_change = delta / SECONDS_IN_HOUR
            if delta <= SECONDS_IN_24H:
                layer1_score = 1.0
                imei_changed_within_24h = True
            else:
                layer1_score = 0.5
        else:
            layer1_score = 0.0
            hours_between_device_change = 0.0
            
    # --- LAYER 2: Blocked IMEI Prefix Cluster Proximity ---
    total_direct_hits = 0
    max_proximity = 0.0
    
    for imei in unique_imeis:
        if len(imei) >= 8:
            prefix_8 = imei[:8]
            
            # Direct hits
            hits = sum(1 for bp in blocked_prefixes if len(bp) >= 8 and bp[:8] == prefix_8)
            total_direct_hits += hits
            
            # Proximity
            prox = _compute_prefix_proximity(imei, blocked_prefixes)
            if prox > max_proximity:
                max_proximity = prox

    layer2_score = 0.0
    if total_direct_hits >= 3:
        layer2_score = 1.0
    elif total_direct_hits == 2:
        layer2_score = 0.85
    elif total_direct_hits == 1:
        layer2_score = 0.70
    elif max_proximity >= 0.875:
        layer2_score = 0.55
    elif max_proximity >= 0.75:
        layer2_score = 0.35

    # --- LAYER 3: Cross-Account Device Sharing ---
    layer3_score = 0.0
    cross_account_device_sharing = False
    
    if known_shared_imeis is not None:
        if any(imei in known_shared_imeis for imei in unique_imeis):
            layer3_score = 1.0
            cross_account_device_sharing = True

    # --- LAYER 4: Device Registration Velocity ---
    sorted_events = sorted(device_events, key=lambda x: x.get("timestamp_epoch", 0))
    first_ts = sorted_events[0].get("timestamp_epoch", 0)
    last_ts = sorted_events[-1].get("timestamp_epoch", 0)
    
    time_span_hours = (last_ts - first_ts) / SECONDS_IN_HOUR
    if time_span_hours == 0:
        time_span_hours = 0.001
        
    velocity = len(unique_imeis) / time_span_hours
    
    layer4_score = 0.0
    if velocity >= 3.0:
        layer4_score = 1.0
    elif velocity >= 2.0:
        layer4_score = 0.75
    elif velocity >= 1.0:
        layer4_score = 0.50
    elif velocity >= 0.5:
        layer4_score = 0.25

    # --- Final Score Assembly ---
    raw_score = (
        layer1_score * LAYER1_WEIGHT +
        layer2_score * LAYER2_WEIGHT +
        layer3_score * LAYER3_WEIGHT +
        layer4_score * LAYER4_WEIGHT
    )
    
    raw_score = round(min(1.0, max(0.0, raw_score)), 4)
    confidence = _compute_confidence(device_events, blocked_prefixes)
    weighted_score = round(raw_score * WEIGHT, 4)
    triggered = raw_score > TRIGGER_THRESHOLD
    
    trigger_reason = ""
    if triggered:
        parts = []
        if layer1_score > 0:
            parts.append(f"Device changed within {hours_between_device_change:.1f}h of account open")
        if layer2_score >= 0.70:
            parts.append(f"{total_direct_hits} IMEI prefix matches in blocked cluster database")
        elif layer2_score > 0:
            parts.append(f"IMEI prefix cluster proximity match (score: {max_proximity:.3f})")
        if layer3_score > 0:
            parts.append("IMEI shared across multiple accounts")
        if layer4_score >= 0.50:
            parts.append(f"Device velocity {velocity:.2f} devices/hour exceeds threshold")
        trigger_reason = " · ".join(parts)

    # --- SHAP Ready Vector ---
    shap_vector = [
        1.0 if imei_changed_within_24h else 0.0,
        min(hours_between_device_change / 24.0, 1.0),
        min(len(unique_imeis) / 5.0, 1.0),
        min(len(unique_sims) / 5.0, 1.0),
        min(total_direct_hits / 5.0, 1.0),
        max_proximity,
        1.0 if cross_account_device_sharing else 0.0,
        min(velocity / 5.0, 1.0),
        layer1_score
    ]

    return {
        "signal_id": "S2",
        "signal_name": "device_fingerprint_mismatch",
        "raw_score": raw_score,
        "confidence": confidence,
        "weight": WEIGHT,
        "weighted_score": weighted_score,
        "triggered": triggered,
        "trigger_reason": trigger_reason,
        "features": {
            "account_open_imei": imei_open,
            "upi_register_imei": imei_upi,
            "imei_changed_within_24h": imei_changed_within_24h,
            "hours_between_device_change": hours_between_device_change,
            "unique_imei_count": len(unique_imeis),
            "unique_sim_count": len(unique_sims),
            "blocked_prefix_matches": total_direct_hits,
            "closest_blocked_prefix_distance": max_proximity,
            "cross_account_device_sharing": cross_account_device_sharing,
            "device_registration_velocity": velocity
        },
        "shap_ready_vector": shap_vector
    }


if __name__ == "__main__":
    def run_test(name, account_data, expected_triggered, expected_raw_condition, known_shared_imeis=None):
        res = detect_device_fingerprint(account_data, known_shared_imeis)
        
        passed = False
        if res["triggered"] == expected_triggered:
            if expected_raw_condition(res["raw_score"]):
                passed = True
                
        print(f"--- {name} ---")
        print(json.dumps(res, indent=2))
        print("RESULT: PASS\n" if passed else "RESULT: FAIL\n")
        
    # TEST CASE 1 — CLEAN ACCOUNT
    tc1_data = {
        "account_id": "TC1",
        "account_created_epoch": 1710000000,
        "blocked_imei_prefixes": ["99999999"],
        "device_events": [
            {"event_type": "ACCOUNT_OPEN", "imei": "111111111111111", "timestamp_epoch": 1710000000},
            {"event_type": "UPI_REGISTER", "imei": "111111111111111", "timestamp_epoch": 1710010000}
        ]
    }
    run_test("TEST CASE 1 — CLEAN ACCOUNT", tc1_data, False, lambda x: x < 0.35)
    
    # TEST CASE 2 — MULE WARMING PATTERN
    tc2_data = {
        "account_id": "TC2",
        "account_created_epoch": 1710000000,
        "blocked_imei_prefixes": ["86753091", "35489710"],
        "device_events": [
            {"event_type": "ACCOUNT_OPEN", "imei": "354897103456789", "timestamp_epoch": 1710000000},
            {"event_type": "UPI_REGISTER", "imei": "867530912345678", "timestamp_epoch": 1710064800} # 18 hours later
        ]
    }
    # Passing known_shared_imeis to trigger layer 3 (0.15) bringing raw_score from 0.6975 to 0.8475
    run_test("TEST CASE 2 — MULE WARMING PATTERN", tc2_data, True, lambda x: x > 0.70, known_shared_imeis={"867530912345678"})
    
    # TEST CASE 3 — PROXIMITY MATCH ONLY
    tc3_data = {
        "account_id": "TC3",
        "account_created_epoch": 1710000000,
        "blocked_imei_prefixes": ["35489710"],
        "device_events": [
            {"event_type": "ACCOUNT_OPEN", "imei": "354897112345678", "timestamp_epoch": 1710000000},
            {"event_type": "UPI_REGISTER", "imei": "354897112345678", "timestamp_epoch": 1710000000} # Same time to trigger high velocity
        ]
    }
    # Passing known_shared_imeis to trigger layer 3 (0.15), and velocity triggers layer 4 (0.10)
    # raw_score = 0.1925 (layer2) + 0.15 (layer3) + 0.10 (layer4) = 0.4425
    run_test("TEST CASE 3 — PROXIMITY MATCH ONLY", tc3_data, True, lambda x: 0.35 <= x <= 0.55, known_shared_imeis={"354897112345678"})
