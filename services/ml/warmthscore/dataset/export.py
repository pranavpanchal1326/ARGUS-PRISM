# ═══════════════════════════════════════════════════════
# ARGUS-PRISM | export.py
# Engine: WarmthScore — Synthetic Dataset Generator
# Branch: pranav/warmthscore
# Research basis: BioCatch 2023, NPCI UPI spec, DoT Chakshu,
#                 RBI KYC Master Direction 2016
# ═══════════════════════════════════════════════════════
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

IST = timezone(timedelta(hours=5, minutes=30))


def _json_default(value: Any) -> Any:
    """Purpose: Convert numpy and datetime types to JSON-safe values.

    Parameters:
        value: Value that may be numpy scalar or datetime.
    Returns:
        JSON-serializable primitive or string.
    PRISM signal: Signals 1-6 (export serialization support).
    """
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def export_dataset(
    transactions: List[Dict[str, Any]],
    features_df: pd.DataFrame,
    account_summaries: List[Dict[str, Any]],
    recruiters: List[Dict[str, Any]],
    taint_network: Dict[str, Any],
    demo_account: Dict[str, Any],
    output_dir: Optional[Path] = None,
) -> Path:
    """Purpose: Export synthetic datasets to JSON and CSV files.

    Parameters:
        transactions: Raw transaction events for all accounts.
        features_df: Feature matrix DataFrame for model training.
        account_summaries: Per-account summary payloads.
        recruiters: Recruiter account payloads.
        taint_network: Historical taint network payload.
        demo_account: Demo account payload with score milestones.
        output_dir: Optional output directory override.
    Returns:
        Path to the output directory containing synthetic data files.
    PRISM signal: Signals 1-6 (export for training data).
    """
    if output_dir is None:
        output_dir = Path(__file__).resolve().parent / "data" / "synthetic_demo"
    output_dir.mkdir(parents=True, exist_ok=True)

    with (output_dir / "transactions_raw.json").open("w", encoding="utf-8") as handle:
        json.dump(transactions, handle, indent=2, ensure_ascii=True, default=_json_default)

    features_df.to_csv(output_dir / "features_matrix.csv", index=False)

    with (output_dir / "accounts_summary.json").open("w", encoding="utf-8") as handle:
        json.dump(account_summaries, handle, indent=2, ensure_ascii=True, default=_json_default)

    with (output_dir / "recruiters.json").open("w", encoding="utf-8") as handle:
        json.dump(recruiters, handle, indent=2, ensure_ascii=True, default=_json_default)

    with (output_dir / "taint_network.json").open("w", encoding="utf-8") as handle:
        json.dump(taint_network, handle, indent=2, ensure_ascii=True, default=_json_default)

    with (output_dir / "demo_account.json").open("w", encoding="utf-8") as handle:
        json.dump(demo_account, handle, indent=2, ensure_ascii=True, default=_json_default)

    return output_dir
