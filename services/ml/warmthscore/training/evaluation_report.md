# PRISM WarmthScore — Model Evaluation Report

**Model Version:** 2.0.0
**Trained At:** 2026-05-21T17:59:23.452687+00:00
**Training Time:** 50.72s
**Dataset:** 400,000 rows (60,000 mule, 340,000 legit)
**Train/Test Split:** 320,000 / 80,000

---

## Cross-Validation (5-Fold Stratified)

| Metric | Value |
|--------|-------|
| Mean AUC | 1.0000 |
| Std AUC | 0.0000 |
| Fold AUCs | 1.0000, 1.0000, 1.0000, 1.0000, 1.0000 |

---

## Test Set Evaluation

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| AUC-ROC | 1.0000 | > 0.92 | PASS |
| Precision (Mule) | 0.9998 | > 0.85 | PASS |
| Recall (Mule) | 0.9999 | > 0.80 | PASS |
| F1 Score | 0.9998 | — | — |
| Accuracy | 1.0000 | — | — |
| FPR | 0.0000 | < 0.05 | PASS |

**Overall: ALL TARGETS MET**

---

## Confusion Matrix

| | Predicted Legit | Predicted Mule |
|---|---|---|
| **Actual Legit** | TN = 67,997 | FP = 3 |
| **Actual Mule** | FN = 1 | TP = 11,999 |

---

## Top 10 Feature Importances

| Rank | Feature | Importance |
|------|---------|------------|
| 1 | `s4_device_delta_score` | 0.201017 |
| 2 | `s4_reactivation_amount_norm` | 0.157001 |
| 3 | `s4_channel_switch_score` | 0.107001 |
| 4 | `s4_time_since_kyc_norm` | 0.095134 |
| 5 | `s4_dormancy_days_norm` | 0.063016 |
| 6 | `s4_combined_signal_score` | 0.045807 |
| 7 | `s4_pattern_confidence` | 0.035635 |
| 8 | `s3_max_acceleration_norm` | 0.025690 |
| 9 | `s3_acceleration_ratio_norm` | 0.023899 |
| 10 | `s3_zc_before_48` | 0.022448 |

---

## XGBoost Parameters

```json
{
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
  "scale_pos_weight": 5.67
}
```
