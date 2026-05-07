import os
import pandas as pd
from pathlib import Path
import numpy as np

def validate_dataset():
    out_dir = Path(__file__).parent
    csv_path = out_dir / "warmth_dataset.csv"
    
    if not csv_path.exists():
        print("FAIL: Dataset file not found.")
        return
    
    print("Validating dataset...")
    
    total_records = 0
    label_counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}
    null_counts = 0
    evasion_count = 0
    clean_fp_count = 0
    
    chunk_size = 10000
    expected_dist = {
        0: 0.70,
        1: 0.15,
        2: 0.10,
        3: 0.03,
        4: 0.02
    }
    
    # Read in chunks
    for chunk in pd.read_csv(csv_path, chunksize=chunk_size):
        total_records += len(chunk)
        null_counts += chunk.isnull().sum().sum()
        
        # Count labels
        counts = chunk['label'].value_counts().to_dict()
        for k, v in counts.items():
            label_counts[k] += v
            
        # Count evasions (IMMINENT label 4 + fri_risk_tier == LOW)
        evasion_count += len(chunk[(chunk['label'] == 4) & (chunk['fri_risk_tier'] == 'LOW')])
        
        # Count false positives (CLEAN label 0 + micro_credit_count > 0)
        clean_fp_count += len(chunk[(chunk['label'] == 0) & (chunk['micro_credit_count'] > 0)])

    print(f"\n--- Validation Results ---")
    print(f"Total Records: {total_records}")
    
    all_pass = True
    
    if total_records != 400000:
        print(f"FAIL: Expected 400,000 records, got {total_records}")
        all_pass = False
    
    if null_counts > 0:
        print(f"FAIL: Found {null_counts} null values.")
        all_pass = False
    else:
        print("Null Check: 0 nulls across all columns (PASS)")

    print("\nClass Distribution:")
    for label, count in label_counts.items():
        pct = count / total_records
        expected = expected_dist[label]
        diff = abs(pct - expected)
        status = "PASS" if diff <= 0.005 else "FAIL"
        if status == "FAIL": all_pass = False
        print(f"Label {label}: {count} ({pct:.1%}) - Expected {expected:.1%} - {status}")

    print("\nBehavioral Injections:")
    if 350 <= evasion_count <= 450:
        print(f"Evasion Patterns (IMMINENT + LOW FRI): {evasion_count} (PASS)")
    else:
        print(f"FAIL: Expected 350-450 evasion patterns, got {evasion_count}")
        all_pass = False

    if 21000 <= clean_fp_count <= 23800:
        print(f"False Positives (CLEAN + >0 Micro-credits): {clean_fp_count} (PASS)")
    else:
        print(f"FAIL: Expected 21000-23800 clean FPs, got {clean_fp_count}")
        all_pass = False

    print("\nCorrelation Matrix (Top Signals vs Label):")
    cols = ['label', 'micro_credit_count', 'imei_cluster_proximity_score', 'velocity_second_derivative_max', 'dormancy_duration_days']
    df_corr = pd.read_csv(csv_path, usecols=cols)
    corr = df_corr.corr()
    print(corr.loc['label', cols[1:]].to_string())

    print("\nFINAL VERDICT:")
    if all_pass:
        print("PASS")
    else:
        print("FAIL - See reasons above")


if __name__ == "__main__":
    validate_dataset()
