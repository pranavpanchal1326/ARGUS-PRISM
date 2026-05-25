"""
PRISM V1 — Model Evaluation Report Generator

Reads model_metadata.json and produces a human-readable evaluation report.

Usage:
    python -m services.ml.warmthscore.training.evaluate
"""

import json
import logging
from pathlib import Path

logger = logging.getLogger("prism.ml.evaluate")

METADATA_PATH = Path(__file__).parent.parent / "model" / "artifacts" / "model_metadata.json"


def generate_report(metadata_path: Path = METADATA_PATH) -> str:
    """Generate a markdown evaluation report from model metadata."""
    with open(metadata_path) as f:
        meta = json.load(f)

    tm = meta["test_metrics"]
    cm = tm["confusion_matrix"]
    targets = meta.get("targets_met", {})

    report_lines = [
        "# PRISM WarmthScore — Model Evaluation Report",
        "",
        f"**Model Version:** {meta['model_version']}",
        f"**Trained At:** {meta['trained_at']}",
        f"**Training Time:** {meta.get('training_time_seconds', 'N/A')}s",
        f"**Dataset:** {meta['dataset_rows']:,} rows ({meta['mule_count']:,} mule, {meta['clean_count']:,} legit)",
        f"**Train/Test Split:** {meta.get('train_rows', 'N/A'):,} / {meta.get('test_rows', 'N/A'):,}",
        "",
        "---",
        "",
        "## Cross-Validation (5-Fold Stratified)",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Mean AUC | {meta['cv_auc_mean']:.4f} |",
        f"| Std AUC | {meta['cv_auc_std']:.4f} |",
        f"| Fold AUCs | {', '.join(f'{v:.4f}' for v in meta.get('cv_auc_folds', []))} |",
        "",
        "---",
        "",
        "## Test Set Evaluation",
        "",
        f"| Metric | Value | Target | Status |",
        f"|--------|-------|--------|--------|",
        f"| AUC-ROC | {tm['auc_roc']:.4f} | > 0.92 | {'PASS' if targets.get('auc_gt_0.92') else 'FAIL'} |",
        f"| Precision (Mule) | {tm['precision']:.4f} | > 0.85 | {'PASS' if targets.get('precision_gt_0.85') else 'FAIL'} |",
        f"| Recall (Mule) | {tm['recall']:.4f} | > 0.80 | {'PASS' if targets.get('recall_gt_0.80') else 'FAIL'} |",
        f"| F1 Score | {tm['f1']:.4f} | — | — |",
        f"| Accuracy | {tm['accuracy']:.4f} | — | — |",
        f"| FPR | {tm['fpr']:.4f} | < 0.05 | {'PASS' if targets.get('fpr_lt_0.05') else 'FAIL'} |",
        "",
        f"**Overall: {'ALL TARGETS MET' if meta.get('all_targets_met') else 'TARGETS NOT MET'}**",
        "",
        "---",
        "",
        "## Confusion Matrix",
        "",
        f"| | Predicted Legit | Predicted Mule |",
        f"|---|---|---|",
        f"| **Actual Legit** | TN = {cm['tn']:,} | FP = {cm['fp']:,} |",
        f"| **Actual Mule** | FN = {cm['fn']:,} | TP = {cm['tp']:,} |",
        "",
        "---",
        "",
        "## Top 10 Feature Importances",
        "",
        f"| Rank | Feature | Importance |",
        f"|------|---------|------------|",
    ]

    for i, feat in enumerate(meta.get("top_10_features", [])):
        report_lines.append(f"| {i+1} | `{feat['feature']}` | {feat['importance']:.6f} |")

    report_lines.extend([
        "",
        "---",
        "",
        "## XGBoost Parameters",
        "",
        "```json",
        json.dumps(meta.get("xgb_params", {}), indent=2),
        "```",
        "",
    ])

    return "\n".join(report_lines)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    if not METADATA_PATH.exists():
        print(f"Error: {METADATA_PATH} not found. Run training first.")
        exit(1)

    report = generate_report()
    
    # Save report
    report_path = Path(__file__).parent / "evaluation_report.md"
    report_path.write_text(report, encoding="utf-8")
    print(f"Report saved to {report_path}")
    print()
    print(report)
