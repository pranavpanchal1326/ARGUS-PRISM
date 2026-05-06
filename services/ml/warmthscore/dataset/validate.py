# ═══════════════════════════════════════════════════════
# ARGUS-PRISM | validate.py
# Engine: WarmthScore — Synthetic Dataset Generator
# Branch: pranav/warmthscore
# Research basis: BioCatch 2023, NPCI UPI spec, DoT Chakshu,
#                 RBI KYC Master Direction 2016
# ═══════════════════════════════════════════════════════
from pathlib import Path
import json
from typing import Any, Dict

import numpy as np
import pandas as pd

try:
    from .features import derive_signal_flags
except ImportError:  # pragma: no cover
    from features import derive_signal_flags


def _load_demo_account(path: Path) -> Dict[str, Any]:
    """Purpose: Load the demo account payload for validation.

    Parameters:
        path: Path to the demo_account.json file.
    Returns:
        Parsed demo account dictionary.
    PRISM signal: Signal 5 (demo integrity validation).
    """
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _validate_demo_milestones(demo: Dict[str, Any]) -> bool:
    """Purpose: Validate demo account score milestones with tolerance.

    Parameters:
        demo: Demo account dictionary containing milestones.
    Returns:
        True if all milestones are within tolerance; False otherwise.
    PRISM signal: Signal 5 (demo integrity validation).
    """
    expected = [
        (0, 21),
        (12, 29),
        (24, 41),
        (36, 58),
        (48, 69),
        (60, 77),
        (71, 84),
        (72, 87),
    ]
    milestones = {int(item["hour"]): float(item["score"]) for item in demo.get("milestones", [])}
    for hour, score in expected:
        if hour not in milestones:
            return False
        if np.abs(milestones[hour] - score) > 2:
            return False
    if demo.get("restriction_triggered_hour") != 60:
        return False
    if demo.get("autostr_initiated_hour") != 71:
        return False
    return True


def run_validation(output_dir: Path) -> None:
    """Purpose: Run statistical validation checks on generated datasets.

    Parameters:
        output_dir: Directory containing exported synthetic data.
    Returns:
        None.
    PRISM signal: Signals 1-6 (quality validation).
    """
    features_path = output_dir / "features_matrix.csv"
    features_df = pd.read_csv(
        features_path,
        true_values=["True", "true"],
        false_values=["False", "false"],
    )
    flags_df = derive_signal_flags(features_df)
    features_with_flags = features_df.merge(flags_df, on="account_id")

    mules = features_with_flags[features_with_flags["label"] == 1]
    legitimate = features_with_flags[features_with_flags["label"] == 0]

    early_signals = mules["s5_fri_contradiction"] & mules["s6_sim_swap_within_7_days"]
    early_pct = float(np.round((np.sum(early_signals) / len(mules)) * 100.0, 2))
    early_status = "PASS" if early_pct >= 48.0 else "FAIL"
    print(
        f"BioCatch validation: {early_pct:.2f}% show early signals. Required: 48%. Status: {early_status}"
    )

    mule_count = int(np.sum(features_with_flags["label"] == 1))
    legit_count = int(np.sum(features_with_flags["label"] == 0))
    balance_status = "PASS" if mule_count == 500 and legit_count == 500 else "FAIL"
    print(
        f"Class balance: {mule_count} mules, {legit_count} legitimate. Status: {balance_status}"
    )

    signal_columns = [
        ("s1_fired", "Signal 1"),
        ("s2_fired", "Signal 2"),
        ("s3_fired", "Signal 3"),
        ("s4_fired", "Signal 4"),
        ("s5_fired", "Signal 5"),
        ("s6_fired", "Signal 6"),
    ]
    for signal_col, label in signal_columns:
        if signal_col == "s4_fired":
            eligible = mules[mules["s4_dormancy_over_180"] == True]
            denominator = len(eligible)
            if denominator == 0:
                coverage = 0.0
            else:
                coverage = float(
                    np.round((np.sum(eligible[signal_col]) / denominator) * 100.0, 2)
                )
        else:
            denominator = len(mules)
            coverage = float(
                np.round((np.sum(mules[signal_col]) / denominator) * 100.0, 2)
            )
        status = "PASS" if coverage >= 60.0 else "FAIL"
        print(
            f"{label} coverage: {coverage:.2f}%. Required: 60%. {status}"
        )

    signal_sum = legitimate[[col for col, _ in signal_columns]].sum(axis=1)
    fp_pct = float(np.round((np.mean(signal_sum >= 3) * 100.0), 2))
    fp_status = "PASS" if fp_pct < 5.0 else "FAIL"
    print(
        f"FP risk: {fp_pct:.2f}% legitimate with 3+ signals. Required: <5%. Status: {fp_status}"
    )

    demo = _load_demo_account(output_dir / "demo_account.json")
    demo_status = "PASS" if _validate_demo_milestones(demo) else "FAIL"
    print(f"Demo account: {demo_status} with score progression")


if __name__ == "__main__":
    run_validation(Path(__file__).resolve().parent / "data" / "synthetic_demo")
