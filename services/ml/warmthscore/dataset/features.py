# ═══════════════════════════════════════════════════════
# ARGUS-PRISM | features.py
# Engine: WarmthScore — Synthetic Dataset Generator
# Branch: pranav/warmthscore
# Research basis: BioCatch 2023, NPCI UPI spec, DoT Chakshu,
#                 RBI KYC Master Direction 2016
# ═══════════════════════════════════════════════════════
from typing import Any, Dict, List

import numpy as np
import pandas as pd

FRI_SCORE_MAP: Dict[str, int] = {
    "LOW": 0,
    "MEDIUM": 1,
    "HIGH": 2,
    "VERY_HIGH": 3,
}


def compute_feature_matrix(
    transactions: List[Dict[str, Any]],
    accounts: List[Dict[str, Any]],
) -> pd.DataFrame:
    """Purpose: Build the WarmthScore feature matrix from synthetic events.

    Parameters:
        transactions: Transaction event dictionaries for all accounts.
        accounts: Account metadata dictionaries used for signal computation.
    Returns:
        Pandas DataFrame with one row per account and all signal features.
    PRISM signal: Signals 1-6 (feature synthesis).
    """
    events_df = pd.DataFrame(transactions)
    accounts_index: Dict[str, Dict[str, Any]] = {
        account["account_id"]: account for account in accounts
    }

    rows: List[Dict[str, Any]] = []
    for account_id, account in accounts_index.items():
        account_events = events_df[events_df["account_id"] == account_id]
        if account_events.empty:
            continue

        hours = account_events["hour"].to_numpy(dtype=float)
        counts = np.zeros(73, dtype=float)
        for hour in hours:
            counts[int(hour)] += 1.0

        first_diff = np.diff(counts)
        second_diff = np.diff(first_diff)
        if second_diff.size > 0:
            max_second = float(np.max(second_diff))
            convexity_hour = int(np.argmax(second_diff) + 2)
        else:
            max_second = 0.0
            convexity_hour = 0

        total_transactions = int(account_events.shape[0])
        if total_transactions >= 12 and max_second > 0.8:
            curve_type = "CONVEX"
        elif total_transactions >= 12 and max_second < -0.8:
            curve_type = "CONCAVE"
        else:
            curve_type = "LINEAR"

        credits_48 = account_events[
            (account_events["transaction_type"] == "CREDIT")
            & (account_events["hour"] <= 48)
        ]
        test_credits = credits_48[credits_48["is_test_credit"] == True]

        s1_test_credit_count = int(test_credits.shape[0])
        if s1_test_credit_count > 0:
            s1_test_credit_total_inr = float(
                np.sum(test_credits["amount_inr"].to_numpy(dtype=float))
            )
            s1_source_avg_age_days = float(
                np.mean(test_credits["source_account_age_days"].to_numpy(dtype=float))
            )
        else:
            s1_test_credit_total_inr = 0.0
            s1_source_avg_age_days = 0.0

        if credits_48.shape[0] > 0:
            s1_source_merchant_ratio = float(
                np.mean(credits_48["source_is_merchant"].astype(float).to_numpy())
            )
        else:
            s1_source_merchant_ratio = 0.0

        if s1_test_credit_count >= 2:
            test_hours_sorted = np.sort(test_credits["hour"].to_numpy(dtype=float))
            hour_diffs = np.diff(test_hours_sorted)
            s1_inter_credit_variance = float(np.var(hour_diffs)) if hour_diffs.size > 0 else 0.0
        else:
            s1_inter_credit_variance = 0.0

        s2_device_switch_within_24hr = bool(account["s2_device_switch_within_24hr"])
        s2_imei_cluster_score = float(
            np.max(account_events["imei_cluster_risk"].to_numpy(dtype=float))
        )
        s2_unique_device_count = int(np.unique(account_events["device_imei"].to_numpy()).size)
        s2_unique_sim_count = int(np.unique(account_events["sim_iccid"].to_numpy()).size)
        s2_upi_device_matches_open = bool(account["s2_upi_device_matches_open"])

        s3_velocity_second_derivative = float(max_second)
        s3_convexity_hour = int(convexity_hour)
        s3_velocity_curve_type = curve_type
        s3_acceleration_peak = float(max_second)

        s4_dormancy_days = int(account["dormancy_days"])
        s4_reactivation_device_change = bool(account["reactivation_device_change"])
        s4_dormancy_over_180 = bool(s4_dormancy_days >= 180)
        s4_first_post_txn_type = str(account["first_post_txn_type"])

        s5_fri_score_numeric = int(FRI_SCORE_MAP.get(account["fri_score"], 1))
        internal_score = 0
        internal_score += 1 if s1_test_credit_count >= 5 else 0
        internal_score += 1 if s2_device_switch_within_24hr else 0
        internal_score += 1 if s2_imei_cluster_score >= 0.7 else 0
        internal_score += 1 if curve_type == "CONVEX" and max_second >= 0.4 else 0
        internal_score += 1 if s4_dormancy_over_180 else 0
        internal_score += 1 if bool(account["sim_swap_within_7_days"]) else 0
        internal_numeric = int(np.minimum(3, np.floor(internal_score / 2)))
        s5_fri_contradiction = bool(s5_fri_score_numeric == 0 and internal_score >= 4)
        s5_contradiction_magnitude = float(np.abs(s5_fri_score_numeric - internal_numeric))

        s6_sim_swap_within_7_days = bool(account["sim_swap_within_7_days"])
        s6_sim_swap_delta_hours = float(account["sim_swap_delta_hours"])
        s6_iccid_change_count = int(s2_unique_sim_count)

        label = int(account["label"])

        rows.append(
            {
                "account_id": account_id,
                "s1_test_credit_count": s1_test_credit_count,
                "s1_test_credit_total_inr": s1_test_credit_total_inr,
                "s1_source_avg_age_days": s1_source_avg_age_days,
                "s1_source_merchant_ratio": s1_source_merchant_ratio,
                "s1_inter_credit_variance": s1_inter_credit_variance,
                "s2_device_switch_within_24hr": s2_device_switch_within_24hr,
                "s2_imei_cluster_score": s2_imei_cluster_score,
                "s2_unique_device_count": s2_unique_device_count,
                "s2_unique_sim_count": s2_unique_sim_count,
                "s2_upi_device_matches_open": s2_upi_device_matches_open,
                "s3_velocity_second_derivative": s3_velocity_second_derivative,
                "s3_convexity_hour": s3_convexity_hour,
                "s3_velocity_curve_type": s3_velocity_curve_type,
                "s3_acceleration_peak": s3_acceleration_peak,
                "s4_dormancy_days": s4_dormancy_days,
                "s4_reactivation_device_change": s4_reactivation_device_change,
                "s4_dormancy_over_180": s4_dormancy_over_180,
                "s4_first_post_txn_type": s4_first_post_txn_type,
                "s5_fri_score_numeric": s5_fri_score_numeric,
                "s5_fri_contradiction": s5_fri_contradiction,
                "s5_contradiction_magnitude": s5_contradiction_magnitude,
                "s6_sim_swap_within_7_days": s6_sim_swap_within_7_days,
                "s6_sim_swap_delta_hours": s6_sim_swap_delta_hours,
                "s6_iccid_change_count": s6_iccid_change_count,
                "label": label,
            }
        )

    features_df = pd.DataFrame(rows)
    ordered_columns = [
        "account_id",
        "s1_test_credit_count",
        "s1_test_credit_total_inr",
        "s1_source_avg_age_days",
        "s1_source_merchant_ratio",
        "s1_inter_credit_variance",
        "s2_device_switch_within_24hr",
        "s2_imei_cluster_score",
        "s2_unique_device_count",
        "s2_unique_sim_count",
        "s2_upi_device_matches_open",
        "s3_velocity_second_derivative",
        "s3_convexity_hour",
        "s3_velocity_curve_type",
        "s3_acceleration_peak",
        "s4_dormancy_days",
        "s4_reactivation_device_change",
        "s4_dormancy_over_180",
        "s4_first_post_txn_type",
        "s5_fri_score_numeric",
        "s5_fri_contradiction",
        "s5_contradiction_magnitude",
        "s6_sim_swap_within_7_days",
        "s6_sim_swap_delta_hours",
        "s6_iccid_change_count",
        "label",
    ]
    return features_df[ordered_columns]


def derive_signal_flags(features_df: pd.DataFrame) -> pd.DataFrame:
    """Purpose: Derive signal firing flags from the feature matrix.

    Parameters:
        features_df: Feature matrix with signal feature columns.
    Returns:
        Pandas DataFrame with boolean firing flags for each signal.
    PRISM signal: Signals 1-6 (signal firing detection).
    """
    s1_fired = features_df["s1_test_credit_count"] >= 3
    s2_fired = (
        features_df["s2_device_switch_within_24hr"]
        | (features_df["s2_imei_cluster_score"] >= 0.6)
    )
    s3_fired = features_df["s3_velocity_curve_type"] == "CONVEX"
    s4_fired = features_df["s4_dormancy_over_180"] & features_df[
        "s4_reactivation_device_change"
    ]
    s5_fired = features_df["s5_fri_contradiction"]
    s6_fired = features_df["s6_sim_swap_within_7_days"]

    return pd.DataFrame(
        {
            "account_id": features_df["account_id"],
            "s1_fired": s1_fired,
            "s2_fired": s2_fired,
            "s3_fired": s3_fired,
            "s4_fired": s4_fired,
            "s5_fired": s5_fired,
            "s6_fired": s6_fired,
        }
    )
