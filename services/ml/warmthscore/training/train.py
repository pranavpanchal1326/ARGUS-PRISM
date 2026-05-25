"""
PRISM V1 — Model Training Pipeline

Trains XGBoost WarmthScore model on the V2 synthetic dataset.
Produces model artifacts (joblib), SHAP explainer, and evaluation report.

Targets (from V1 plan — non-negotiable):
  - AUC-ROC  > 0.92
  - Precision > 0.85  (mule class)
  - Recall    > 0.80  (mule class)
  - FPR       < 0.05

Usage:
    python -m services.ml.warmthscore.training.train
"""

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
import shap
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import MinMaxScaler

logger = logging.getLogger("prism.ml.train")

# ─── Paths ────────────────────────────────────────────────────────────────────

TRAINING_DIR = Path(__file__).parent
ARTIFACTS_DIR = Path(__file__).parent.parent / "model" / "artifacts"

# Input: generated dataset
DATASET_CSV = TRAINING_DIR / "warmthscore_training_v2.csv"
DATASET_PARQUET = TRAINING_DIR / "warmthscore_training_v2.parquet"

# Output: model artifacts
MODEL_PATH = ARTIFACTS_DIR / "warmthscore_xgb.joblib"
SCALER_PATH = ARTIFACTS_DIR / "warmthscore_scaler.joblib"
EXPLAINER_PATH = ARTIFACTS_DIR / "shap_explainer.joblib"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"

# ─── Feature Schema ──────────────────────────────────────────────────────────

from services.ml.warmthscore.dataset.feature_engineer import FEATURE_NAMES, SIGNAL_LENGTHS

TOTAL_FEATURES = 43
assert len(FEATURE_NAMES) == TOTAL_FEATURES

# ─── XGBoost Hyperparameters ─────────────────────────────────────────────────

XGB_PARAMS = {
    "n_estimators": 400,
    "max_depth": 6,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 3,
    "gamma": 0.1,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "objective": "binary:logistic",
    "eval_metric": "auc",
    "random_state": 42,
    "n_jobs": -1,
    "tree_method": "hist",
    # Class imbalance: 85% legit / 15% mule → weight ≈ 5.67
    "scale_pos_weight": 5.67,
}


# ─── Training Pipeline ───────────────────────────────────────────────────────

def load_dataset() -> pd.DataFrame:
    """Load dataset, preferring Parquet for speed."""
    if DATASET_PARQUET.exists():
        logger.info(f"Loading Parquet: {DATASET_PARQUET}")
        return pd.read_parquet(DATASET_PARQUET)
    elif DATASET_CSV.exists():
        logger.info(f"Loading CSV: {DATASET_CSV}")
        return pd.read_csv(DATASET_CSV)
    else:
        raise FileNotFoundError(
            f"No training dataset found. Run the generator first:\n"
            f"  python -m services.ml.warmthscore.training.synthetic_dataset_generator"
        )


def validate_dataset(df: pd.DataFrame) -> None:
    """Validate that dataset matches expected schema."""
    missing = [f for f in FEATURE_NAMES if f not in df.columns]
    if missing:
        raise ValueError(f"Missing feature columns: {missing}")
    if "is_mule" not in df.columns:
        raise ValueError("Missing label column: 'is_mule'")

    X = df[FEATURE_NAMES].values
    if np.isnan(X).any():
        raise ValueError(f"NaN values found in features")
    if np.isinf(X).any():
        raise ValueError(f"Inf values found in features")

    mule_count = int(df["is_mule"].sum())
    legit_count = int((df["is_mule"] == 0).sum())
    logger.info(f"Dataset validated: {len(df)} rows, {mule_count} mule, {legit_count} legit")


def train_model() -> dict:
    """Full training pipeline. Returns metadata dict."""
    t_start = time.time()

    # Load & validate
    df = load_dataset()
    validate_dataset(df)

    X = df[FEATURE_NAMES].values.astype(np.float32)
    y = df["is_mule"].values.astype(np.int32)

    # Stratified train/test split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    logger.info(f"Split: train={len(X_train)}, test={len(X_test)}")

    # Fit scaler on train set only
    scaler = MinMaxScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ── Cross-Validation ──────────────────────────────────────────────────
    logger.info("Starting 5-fold Stratified Cross-Validation...")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_model = xgb.XGBClassifier(**XGB_PARAMS)
    cv_scores = cross_val_score(cv_model, X_train_scaled, y_train, cv=skf, scoring="roc_auc")
    cv_mean = float(np.mean(cv_scores))
    cv_std = float(np.std(cv_scores))
    logger.info(f"CV AUC: {cv_mean:.4f} ± {cv_std:.4f} (folds: {cv_scores.tolist()})")

    # ── Final Training ────────────────────────────────────────────────────
    logger.info("Training final model on full train set...")
    model = xgb.XGBClassifier(**XGB_PARAMS)
    model.fit(
        X_train_scaled,
        y_train,
        eval_set=[(X_test_scaled, y_test)],
        verbose=False,
    )

    # ── Evaluation on Test Set ────────────────────────────────────────────
    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)[:, 1]

    test_auc = float(roc_auc_score(y_test, y_prob))
    test_accuracy = float(accuracy_score(y_test, y_pred))
    test_precision = float(precision_score(y_test, y_pred))
    test_recall = float(recall_score(y_test, y_pred))
    test_f1 = float(f1_score(y_test, y_pred))

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

    report = classification_report(y_test, y_pred, target_names=["Legit", "Mule"], output_dict=True)

    logger.info(f"Test AUC:       {test_auc:.4f}")
    logger.info(f"Test Precision: {test_precision:.4f}")
    logger.info(f"Test Recall:    {test_recall:.4f}")
    logger.info(f"Test F1:        {test_f1:.4f}")
    logger.info(f"Test FPR:       {fpr:.4f}")
    logger.info(f"Confusion: TN={tn} FP={fp} FN={fn} TP={tp}")

    # ── Verify targets ────────────────────────────────────────────────────
    targets_met = {
        "auc_gt_0.92": test_auc > 0.92,
        "precision_gt_0.85": test_precision > 0.85,
        "recall_gt_0.80": test_recall > 0.80,
        "fpr_lt_0.05": fpr < 0.05,
    }
    all_targets_met = all(targets_met.values())

    if all_targets_met:
        logger.info("✅ ALL metric targets met!")
    else:
        failed = [k for k, v in targets_met.items() if not v]
        logger.warning(f"⚠️  Targets NOT met: {failed}")

    # ── SHAP Explainer ────────────────────────────────────────────────────
    logger.info("Building SHAP TreeExplainer...")
    explainer = shap.TreeExplainer(model)

    # ── Feature Importance ────────────────────────────────────────────────
    importance = model.feature_importances_
    feature_importance = sorted(
        [(FEATURE_NAMES[i], float(importance[i])) for i in range(len(FEATURE_NAMES))],
        key=lambda x: x[1],
        reverse=True,
    )
    top_10 = feature_importance[:10]

    # ── Save Artifacts ────────────────────────────────────────────────────
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(explainer, EXPLAINER_PATH)

    training_time = time.time() - t_start

    metadata = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "model_version": "2.0.0",
        "training_time_seconds": round(training_time, 2),
        "feature_count": TOTAL_FEATURES,
        "feature_names": FEATURE_NAMES,
        "signal_lengths": SIGNAL_LENGTHS,
        "dataset_rows": len(df),
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "mule_count": int(np.sum(y == 1)),
        "clean_count": int(np.sum(y == 0)),
        "mule_ratio": float(np.mean(y)),
        "xgb_params": XGB_PARAMS,
        "cv_auc_mean": cv_mean,
        "cv_auc_std": cv_std,
        "cv_auc_folds": cv_scores.tolist(),
        "test_metrics": {
            "auc_roc": test_auc,
            "accuracy": test_accuracy,
            "precision": test_precision,
            "recall": test_recall,
            "f1": test_f1,
            "fpr": fpr,
            "confusion_matrix": {
                "tn": int(tn),
                "fp": int(fp),
                "fn": int(fn),
                "tp": int(tp),
            },
            "classification_report": report,
        },
        "targets_met": targets_met,
        "all_targets_met": all_targets_met,
        "top_10_features": [{"feature": f, "importance": round(v, 6)} for f, v in top_10],
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Artifacts saved to {ARTIFACTS_DIR}")
    logger.info(f"Training completed in {training_time:.1f}s")

    return metadata


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    metadata = train_model()

    print(f"\n{'='*60}")
    print(f"PRISM WarmthScore Model v2.0.0 — Training Complete")
    print(f"{'='*60}")
    print(f"  Dataset:     {metadata['dataset_rows']:,} rows")
    print(f"  Train/Test:  {metadata['train_rows']:,} / {metadata['test_rows']:,}")
    print(f"  CV AUC:      {metadata['cv_auc_mean']:.4f} +/- {metadata['cv_auc_std']:.4f}")
    print(f"  Test AUC:    {metadata['test_metrics']['auc_roc']:.4f}")
    print(f"  Precision:   {metadata['test_metrics']['precision']:.4f}")
    print(f"  Recall:      {metadata['test_metrics']['recall']:.4f}")
    print(f"  F1:          {metadata['test_metrics']['f1']:.4f}")
    print(f"  FPR:         {metadata['test_metrics']['fpr']:.4f}")
    cm = metadata['test_metrics']['confusion_matrix']
    print(f"  Confusion:   TN={cm['tn']} FP={cm['fp']} FN={cm['fn']} TP={cm['tp']}")
    print(f"  All Targets: {'PASSED' if metadata['all_targets_met'] else 'NOT MET'}")
    print(f"  Time:        {metadata['training_time_seconds']:.1f}s")
    print(f"{'='*60}")
    print(f"\n  Top 10 features:")
    for i, feat in enumerate(metadata["top_10_features"]):
        print(f"    {i+1:2d}. {feat['feature']:<40s} {feat['importance']:.6f}")
    print()
