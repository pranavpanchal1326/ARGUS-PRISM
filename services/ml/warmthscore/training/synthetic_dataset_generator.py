"""
PRISM V1 — Synthetic Dataset Generator

Generates 50,000 accounts with realistic mule-warming behavioral patterns
mapped to the exact 43-feature schema consumed by the XGBoost WarmthScore model.

Feature schema: S1(7) + S2(9) + S3(8) + S4(7) + S5(6) + S6(6) = 43 features
Label: is_mule (0 = legitimate, 1 = mule)

Mule accounts follow a realistic progression through warming phases:
  Phase 0: Dormant → S4 fires
  Phase 1: Reactivation + new device → S2 + S4 fire
  Phase 2: Test credits arrive → S1 fires
  Phase 3: Velocity spike → S3 fires
  Phase 4: SIM swap + FRI contradiction → S5 + S6 fire
  Phase 5: Cashout (all signals high)

Usage:
    python -m services.ml.warmthscore.training.synthetic_dataset_generator
"""

import json
import logging
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger("prism.ml.synth_generator")

# ─── Constants ────────────────────────────────────────────────────────────────

SEED = 42
TOTAL_RECORDS = 400_000
MULE_RATIO = 0.15  # 15% mule, 85% legitimate
MULE_COUNT = int(TOTAL_RECORDS * MULE_RATIO)  # 7,500
LEGIT_COUNT = TOTAL_RECORDS - MULE_COUNT       # 42,500

# The canonical 43 feature names — must match feature_engineer.py EXACTLY
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
    "s6_swap_to_fraud_window_score", "s6_pattern_confidence",
]

SIGNAL_LENGTHS = {"S1": 7, "S2": 9, "S3": 8, "S4": 7, "S5": 6, "S6": 6}

assert len(FEATURE_NAMES) == 43, f"Expected 43 features, got {len(FEATURE_NAMES)}"


# ─── Signal Generators ───────────────────────────────────────────────────────

def _clamp(v: float) -> float:
    """Clamp to [0.0, 1.0]."""
    return max(0.0, min(1.0, v))


def _noise(base: float, std: float = 0.05) -> float:
    """Add Gaussian noise and clamp."""
    return _clamp(base + np.random.normal(0, std))


def _uniform(lo: float, hi: float) -> float:
    """Uniform random in range, clamped."""
    return _clamp(np.random.uniform(lo, hi))


# ------------- Mule warming phase weights -----------------------------------
# Each phase has a probability distribution for which signals are active.
# Signals ramp up progressively through the warming lifecycle.

MULE_PHASES = {
    # phase_name: (probability_weight, signal_activations)
    "dormant":       (0.10, {"S4": 0.8, "S1": 0.05, "S2": 0.1, "S3": 0.05, "S5": 0.05, "S6": 0.05}),
    "reactivation":  (0.12, {"S4": 0.9, "S2": 0.7, "S1": 0.1, "S3": 0.15, "S5": 0.1, "S6": 0.1}),
    "test_credits":  (0.18, {"S1": 0.85, "S4": 0.7, "S2": 0.5, "S3": 0.3, "S5": 0.15, "S6": 0.15}),
    "velocity":      (0.20, {"S3": 0.9, "S1": 0.7, "S2": 0.6, "S4": 0.6, "S5": 0.2, "S6": 0.25}),
    "sim_swap":      (0.18, {"S5": 0.75, "S6": 0.85, "S1": 0.6, "S2": 0.5, "S3": 0.7, "S4": 0.5}),
    "cashout":       (0.22, {"S1": 0.9, "S2": 0.85, "S3": 0.95, "S4": 0.7, "S5": 0.8, "S6": 0.9}),
}


def _pick_mule_phase(rng: np.random.Generator) -> Tuple[str, Dict[str, float]]:
    """Select a mule warming phase based on probability weights."""
    phases = list(MULE_PHASES.keys())
    weights = [MULE_PHASES[p][0] for p in phases]
    idx = rng.choice(len(phases), p=np.array(weights) / sum(weights))
    phase_name = phases[idx]
    return phase_name, MULE_PHASES[phase_name][1]


def _generate_signal_features(
    n_features: int,
    activation: float,
    is_mule: bool,
    rng: np.random.Generator,
) -> List[float]:
    """
    Generate feature vector for one signal group.
    
    For mules: activation controls how "hot" the signal is (0=cold, 1=fully active).
    For legit: signals are low with occasional noise.
    """
    features = []
    for _ in range(n_features):
        if is_mule:
            if rng.random() < activation:
                # Signal is firing -- high value with wider variance
                base = rng.uniform(0.35, 0.95)
                features.append(_clamp(base + rng.normal(0, 0.10)))
            else:
                # Signal not yet active in this phase -- overlaps with legit range
                base = rng.uniform(0.03, 0.40)
                features.append(_clamp(base + rng.normal(0, 0.08)))
        else:
            # Legitimate -- mostly low but with wider tail
            base = rng.uniform(0.0, 0.18)
            features.append(_clamp(base + rng.normal(0, 0.06)))
    return features


def _generate_legit_with_noise(
    rng: np.random.Generator,
    false_positive_rate: float = 0.08,
    borderline_rate: float = 0.12,
) -> List[float]:
    """
    Generate a legitimate account's 43-feature vector.
    8% of legitimate accounts show false-positive on S1 (test credit noise).
    12% are 'borderline' -- elevated signals on 2-3 random signal groups,
    creating genuine classification difficulty.
    """
    is_fp = rng.random() < false_positive_rate
    is_borderline = rng.random() < borderline_rate
    features = []

    # For borderline accounts, pick 2-3 random signals to elevate
    if is_borderline:
        elevated_count = rng.integers(2, 4)  # 2 or 3 signals
        all_signals = list(SIGNAL_LENGTHS.keys())
        elevated_signals = set(rng.choice(all_signals, size=elevated_count, replace=False))
    else:
        elevated_signals = set()

    for sig_id, sig_len in SIGNAL_LENGTHS.items():
        if sig_id == "S1" and is_fp:
            # False positive: S1 looks moderately warm
            for _ in range(sig_len):
                features.append(_clamp(rng.uniform(0.20, 0.50) + rng.normal(0, 0.08)))
        elif sig_id in elevated_signals:
            # Borderline: this signal is elevated but not as high as a mule
            for _ in range(sig_len):
                features.append(_clamp(rng.uniform(0.15, 0.45) + rng.normal(0, 0.08)))
        else:
            # Normal legitimate -- clean signal with wider tail
            for _ in range(sig_len):
                features.append(_clamp(rng.uniform(0.0, 0.18) + rng.normal(0, 0.06)))

    return features


def _generate_mule_account(
    rng: np.random.Generator,
) -> Tuple[List[float], str]:
    """
    Generate a mule account's 43-feature vector based on warming phase.
    Returns (features, phase_name).
    """
    phase_name, activations = _pick_mule_phase(rng)
    features = []
    
    for sig_id, sig_len in SIGNAL_LENGTHS.items():
        activation = activations.get(sig_id, 0.1)
        sig_features = _generate_signal_features(sig_len, activation, True, rng)
        features.extend(sig_features)
    
    return features, phase_name


# ─── Main Generator ──────────────────────────────────────────────────────────

def generate_dataset(
    n_total: int = TOTAL_RECORDS,
    mule_ratio: float = MULE_RATIO,
    seed: int = SEED,
    output_dir: Path = None,
) -> pd.DataFrame:
    """
    Generate the full synthetic dataset.
    
    Returns a DataFrame with 43 feature columns + 'is_mule' label.
    Also writes CSV, Parquet, and metadata JSON to output_dir.
    """
    if output_dir is None:
        output_dir = Path(__file__).parent

    rng = np.random.default_rng(seed)
    random.seed(seed)
    np.random.seed(seed)
    
    n_mule = int(n_total * mule_ratio)
    n_legit = n_total - n_mule
    
    logger.info(f"Generating dataset: {n_total} total ({n_legit} legit, {n_mule} mule)")
    
    rows = []
    phase_counts = {p: 0 for p in MULE_PHASES}
    
    # Generate legitimate accounts
    for _ in range(n_legit):
        features = _generate_legit_with_noise(rng)
        rows.append(features + [0])  # is_mule = 0
    
    # Generate mule accounts
    for _ in range(n_mule):
        features, phase = _generate_mule_account(rng)
        phase_counts[phase] += 1
        rows.append(features + [1])  # is_mule = 1
    
    # Shuffle
    rng.shuffle(rows)
    
    # Build DataFrame
    columns = FEATURE_NAMES + ["is_mule"]
    df = pd.DataFrame(rows, columns=columns)
    
    # Validate
    assert df.shape == (n_total, 44), f"Unexpected shape: {df.shape}"
    assert df["is_mule"].sum() == n_mule, f"Mule count mismatch: {df['is_mule'].sum()} != {n_mule}"
    assert df[FEATURE_NAMES].min().min() >= 0.0, "Negative feature values detected"
    assert df[FEATURE_NAMES].max().max() <= 1.0, "Feature values > 1.0 detected"
    assert not df.isnull().any().any(), "NaN values detected"
    
    # Save
    output_dir.mkdir(parents=True, exist_ok=True)
    
    csv_path = output_dir / "warmthscore_training_v2.csv"
    parquet_path = output_dir / "warmthscore_training_v2.parquet"
    meta_path = output_dir / "dataset_metadata_v2.json"
    
    df.to_csv(csv_path, index=False)
    df.to_parquet(parquet_path, index=False, engine="pyarrow")
    
    # Compute statistics per signal group
    signal_stats = {}
    start = 0
    for sig_id, sig_len in SIGNAL_LENGTHS.items():
        end = start + sig_len
        sig_cols = FEATURE_NAMES[start:end]
        mule_mask = df["is_mule"] == 1
        
        signal_stats[sig_id] = {
            "feature_count": sig_len,
            "features": sig_cols,
            "mule_mean": round(float(df.loc[mule_mask, sig_cols].values.mean()), 4),
            "mule_std": round(float(df.loc[mule_mask, sig_cols].values.std()), 4),
            "legit_mean": round(float(df.loc[~mule_mask, sig_cols].values.mean()), 4),
            "legit_std": round(float(df.loc[~mule_mask, sig_cols].values.std()), 4),
        }
        start = end
    
    metadata = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generator_version": "2.0.0",
        "seed": seed,
        "total_records": n_total,
        "mule_count": n_mule,
        "legit_count": n_legit,
        "mule_ratio": round(mule_ratio, 4),
        "feature_count": 43,
        "feature_names": FEATURE_NAMES,
        "signal_lengths": SIGNAL_LENGTHS,
        "mule_phase_distribution": phase_counts,
        "signal_statistics": signal_stats,
        "files": {
            "csv": str(csv_path.name),
            "parquet": str(parquet_path.name),
        },
    }
    
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"Dataset saved:")
    logger.info(f"  CSV:      {csv_path} ({csv_path.stat().st_size / (1024*1024):.1f} MB)")
    logger.info(f"  Parquet:  {parquet_path} ({parquet_path.stat().st_size / (1024*1024):.1f} MB)")
    logger.info(f"  Metadata: {meta_path}")
    logger.info(f"  Mule phase distribution: {phase_counts}")
    
    return df


# ─── CLI Entry Point ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    df = generate_dataset()
    
    print(f"\n{'='*60}")
    print(f"PRISM V1 Synthetic Dataset Generated")
    print(f"{'='*60}")
    print(f"  Total records:  {len(df):,}")
    print(f"  Mule accounts:  {df['is_mule'].sum():,} ({df['is_mule'].mean()*100:.1f}%)")
    print(f"  Legit accounts: {(df['is_mule'] == 0).sum():,} ({(1-df['is_mule'].mean())*100:.1f}%)")
    print(f"  Features:       {len(FEATURE_NAMES)}")
    print(f"  Value range:    [{df[FEATURE_NAMES].min().min():.4f}, {df[FEATURE_NAMES].max().max():.4f}]")
    print(f"{'='*60}")
