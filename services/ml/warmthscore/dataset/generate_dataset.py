import os
import json
import random
import datetime
from pathlib import Path
import numpy as np
import pandas as pd
from tqdm import tqdm

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

TOTAL_RECORDS = 400000
CHUNK_SIZE = 10000
FILE_NAME = "warmth_dataset.csv"
META_NAME = "dataset_metadata.json"

CLASS_DIST = {
    0: {"name": "CLEAN", "count": 280000},      # 70%
    1: {"name": "WARMING", "count": 60000},     # 15%
    2: {"name": "HOT", "count": 40000},         # 10%
    3: {"name": "CRITICAL", "count": 12000},    # 3%
    4: {"name": "IMMINENT", "count": 8000}      # 2%
}

def generate_imei() -> str:
    """Generate 15-digit numeric string"""
    return "".join(str(random.randint(0, 9)) for _ in range(15))

def generate_iccid() -> str:
    """Generate 19-digit numeric string"""
    return "".join(str(random.randint(0, 9)) for _ in range(19))

def generate_chunk(label: int, size: int, start_idx: int) -> pd.DataFrame:
    rows = []
    
    # Pre-compute noise limits
    # 8% of CLEAN accounts show false positive on Signal 1
    clean_noise_count = int(size * 0.08) if label == 0 else 0
    # 5% of IMMINENT accounts show evasion on Signal 5
    imminent_evasion_count = int(size * 0.05) if label == 4 else 0
    
    for i in range(size):
        account_idx = start_idx + i
        account_id = f"UBI-2026-{account_idx:06d}"
        
        # Determine specific conditions for this row
        is_clean_noise = (label == 0 and i < clean_noise_count)
        is_imminent_evasion = (label == 4 and i < imminent_evasion_count)
        
        # Baseline probability of malicious behavior based on label
        # 0=0%, 1=30%, 2=60%, 3=85%, 4=95% (roughly)
        mal_prob = {0: 0.0, 1: 0.3, 2: 0.6, 3: 0.85, 4: 0.95}[label]

        # ------------------- SIGNAL 1: Test Credit Pattern -------------------
        s1_active = is_clean_noise or (random.random() < mal_prob)
        if s1_active:
            micro_credit_count = random.randint(1, 8) if label <= 1 else random.randint(3, 8)
            micro_credit_avg_amount = round(random.uniform(1.0, 500.0), 2)
            source_account_age_days = random.randint(0, 15) if label >= 2 else random.randint(10, 365)
            inter_credit_timing_variance_seconds = round(random.uniform(10.0, 300.0), 2)
        else:
            micro_credit_count = 0
            micro_credit_avg_amount = 0.0
            source_account_age_days = random.randint(100, 3000)
            inter_credit_timing_variance_seconds = round(random.uniform(1000.0, 50000.0), 2)

        # ------------------- SIGNAL 2: Device Fingerprint Mismatch -------------------
        s2_active = random.random() < mal_prob
        if s2_active:
            device_switch_within_24h = True
            imei_cluster_proximity_score = round(random.uniform(0.6, 1.0), 4)
            cross_account_device_sharing = random.random() < 0.8
        else:
            device_switch_within_24h = random.random() < 0.1 # Normal device switches
            imei_cluster_proximity_score = round(random.uniform(0.0, 0.3), 4)
            cross_account_device_sharing = random.random() < 0.05

        # ------------------- SIGNAL 3: Velocity Derivative -------------------
        s3_active = random.random() < mal_prob
        if s3_active:
            velocity_curve_shape = "convex"
            convexity_detected = True
            velocity_second_derivative_max = round(random.uniform(1.0, 5.0), 4)
        else:
            velocity_curve_shape = random.choice(["flat", "linear"])
            convexity_detected = False
            velocity_second_derivative_max = round(random.uniform(-0.5, 0.5), 4)

        # ------------------- SIGNAL 4: Dormant Reactivation with Device Change -------------------
        s4_active = random.random() < mal_prob
        if s4_active:
            dormancy_duration_days = random.randint(180, 500)
            reactivation_device_changed = True
            days_since_reactivation = random.randint(0, 3)
        else:
            dormancy_duration_days = random.randint(0, 100)
            reactivation_device_changed = random.random() < 0.1
            days_since_reactivation = random.randint(0, 100)

        # ------------------- SIGNAL 5: FRI Contradiction -------------------
        # If evasion is true, the FRI tier is artificially LOW.
        # Otherwise, high label means high FRI tier.
        if is_imminent_evasion:
            fri_risk_tier = "LOW"
            fri_score_numeric = random.randint(1, 2)
            contradiction_magnitude = round(random.uniform(70.0, 100.0), 2)
            internal_signal_partial_score = round(random.uniform(85.0, 100.0), 2)
        else:
            if label >= 3:
                fri_risk_tier = random.choice(["HIGH", "VERY_HIGH"])
                fri_score_numeric = random.choice([3, 4])
                contradiction_magnitude = round(random.uniform(0.0, 20.0), 2)
                internal_signal_partial_score = round(random.uniform(60.0, 100.0), 2)
            elif label == 2:
                fri_risk_tier = random.choice(["MEDIUM", "HIGH"])
                fri_score_numeric = random.choice([2, 3])
                contradiction_magnitude = round(random.uniform(10.0, 40.0), 2)
                internal_signal_partial_score = round(random.uniform(40.0, 75.0), 2)
            else:
                fri_risk_tier = random.choice(["LOW", "MEDIUM"])
                fri_score_numeric = random.choice([1, 2])
                contradiction_magnitude = round(random.uniform(0.0, 20.0), 2)
                internal_signal_partial_score = round(random.uniform(0.0, 40.0), 2)

        # ------------------- SIGNAL 6: SIM Swap Velocity -------------------
        s6_active = random.random() < mal_prob
        if s6_active:
            sim_swap_within_7_days = True
            sim_swap_delta_hours = random.randint(0, 168)
            swap_frequency_30_days = random.randint(1, 3)
            iccid_changed = True
        else:
            sim_swap_within_7_days = False
            sim_swap_delta_hours = random.randint(200, 5000)
            swap_frequency_30_days = 0
            iccid_changed = False

        rows.append({
            "account_id": account_id,
            "label": label,
            "micro_credit_count": micro_credit_count,
            "micro_credit_avg_amount": micro_credit_avg_amount,
            "source_account_age_days": source_account_age_days,
            "inter_credit_timing_variance_seconds": inter_credit_timing_variance_seconds,
            "device_switch_within_24h": device_switch_within_24h,
            "imei_cluster_proximity_score": imei_cluster_proximity_score,
            "cross_account_device_sharing": cross_account_device_sharing,
            "velocity_second_derivative_max": velocity_second_derivative_max,
            "convexity_detected": convexity_detected,
            "velocity_curve_shape": velocity_curve_shape,
            "dormancy_duration_days": dormancy_duration_days,
            "reactivation_device_changed": reactivation_device_changed,
            "days_since_reactivation": days_since_reactivation,
            "fri_risk_tier": fri_risk_tier,
            "fri_score_numeric": fri_score_numeric,
            "internal_signal_partial_score": internal_signal_partial_score,
            "contradiction_magnitude": contradiction_magnitude,
            "sim_swap_within_7_days": sim_swap_within_7_days,
            "sim_swap_delta_hours": sim_swap_delta_hours,
            "swap_frequency_30_days": swap_frequency_30_days,
            "iccid_changed": iccid_changed
        })
    
    return pd.DataFrame(rows)


def main():
    out_dir = Path(__file__).parent
    out_dir.mkdir(parents=True, exist_ok=True)
    
    csv_path = out_dir / FILE_NAME
    meta_path = out_dir / META_NAME
    
    # Remove if exists
    if csv_path.exists():
        csv_path.unlink()

    print(f"Generating PRISM Synthetic Dataset (N={TOTAL_RECORDS})...")
    
    # Total chunks to generate
    total_chunks = sum(c["count"] for c in CLASS_DIST.values()) // CHUNK_SIZE
    
    current_account_idx = 1
    write_header = True
    
    with tqdm(total=TOTAL_RECORDS, desc="Generating accounts") as pbar:
        for label, dist in CLASS_DIST.items():
            count = dist["count"]
            
            for i in range(0, count, CHUNK_SIZE):
                current_size = min(CHUNK_SIZE, count - i)
                # Generate chunk
                df_chunk = generate_chunk(label, current_size, current_account_idx)
                
                # Append to CSV
                df_chunk.to_csv(csv_path, mode="a", index=False, header=write_header)
                write_header = False
                
                current_account_idx += current_size
                pbar.update(current_size)

    print("Generation complete. Writing metadata...")
    
    # Write metadata
    metadata = {
        "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "total_records": TOTAL_RECORDS,
        "chunk_size": CHUNK_SIZE,
        "random_seed": 42,
        "class_distribution": CLASS_DIST,
        "features": {
            "signal_1": ["micro_credit_count", "micro_credit_avg_amount", "source_account_age_days", "inter_credit_timing_variance_seconds"],
            "signal_2": ["device_switch_within_24h", "imei_cluster_proximity_score", "cross_account_device_sharing"],
            "signal_3": ["velocity_second_derivative_max", "convexity_detected", "velocity_curve_shape"],
            "signal_4": ["dormancy_duration_days", "reactivation_device_changed", "days_since_reactivation"],
            "signal_5": ["fri_risk_tier", "fri_score_numeric", "internal_signal_partial_score", "contradiction_magnitude"],
            "signal_6": ["sim_swap_within_7_days", "sim_swap_delta_hours", "swap_frequency_30_days", "iccid_changed"]
        }
    }
    
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Successfully generated dataset at {csv_path.absolute()}")
    print(f"File size: {csv_path.stat().st_size / (1024*1024):.2f} MB")

if __name__ == "__main__":
    main()
