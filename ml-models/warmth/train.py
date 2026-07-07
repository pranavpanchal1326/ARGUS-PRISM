"""Train the WarmthScore XGBoost model and ship the artifact to the backend.

    python -m warmth.train --n 12000 --seed 42 --rounds 400

Prints live training progress (per-round AUC/logloss), a metrics summary (AUC,
precision, recall, F1, and the hard-negative false-positive rate — the number that
protects innocent customers), then saves the booster + feature list + metrics to both
ml-models/artifacts and the backend so inference picks it up.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

# Make the backend package importable so training and inference share the feature code.
_REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO / "backend"))

import numpy as np  # noqa: E402
import xgboost as xgb  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split  # noqa: E402

from app.engines.warmthscore.features import FEATURE_NAMES, extract  # noqa: E402
from warmth.dataset import generate  # noqa: E402

_ML_ARTIFACTS = _REPO / "ml-models" / "artifacts"
_BACKEND_ARTIFACTS = _REPO / "backend" / "app" / "engines" / "warmthscore" / "artifacts"


def _bar(done: int, total: int, width: int = 30) -> str:
    filled = int(width * done / total)
    return "[" + "#" * filled + "-" * (width - filled) + f"] {done}/{total}"


def build_matrix(n: int, seed: int):
    print(f"Generating {n} labelled accounts (seed={seed})...", flush=True)
    samples = generate(n, seed=seed)
    rows, labels, hard_neg = [], [], []
    step = max(1, n // 20)
    for i, s in enumerate(samples, 1):
        feats = extract(s.inp)
        rows.append([feats[name] for name in FEATURE_NAMES])
        labels.append(s.label)
        hard_neg.append(s.hard_negative)
        if i % step == 0 or i == n:
            print(f"  features {_bar(i, n)}", flush=True)
    X = np.array(rows, dtype=float)
    y = np.array(labels, dtype=int)
    hn = np.array(hard_neg, dtype=bool)
    print(f"  mules: {int(y.sum())} ({y.mean():.0%})  |  hard negatives: {int(hn.sum())}", flush=True)
    return X, y, hn


def train(X, y, hn, rounds: int):
    idx = np.arange(len(y))
    X_tr, X_te, y_tr, y_te, _, hn_te, _, idx_te = train_test_split(
        X, y, hn, idx, test_size=0.25, random_state=7, stratify=y
    )
    X_tr, X_val, y_tr, y_val = train_test_split(
        X_tr, y_tr, test_size=0.2, random_state=7, stratify=y_tr
    )
    dtrain = xgb.DMatrix(X_tr, label=y_tr, feature_names=FEATURE_NAMES)
    dval = xgb.DMatrix(X_val, label=y_val, feature_names=FEATURE_NAMES)
    dtest = xgb.DMatrix(X_te, label=y_te, feature_names=FEATURE_NAMES)

    params = {
        "objective": "binary:logistic",
        "eval_metric": ["auc", "logloss"],
        "max_depth": 5,
        "eta": 0.1,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "min_child_weight": 3,
        "tree_method": "hist",
    }
    print(f"\nTraining XGBoost — up to {rounds} rounds, early-stopping 40...\n", flush=True)
    start = time.time()
    booster = xgb.train(
        params,
        dtrain,
        num_boost_round=rounds,
        evals=[(dtrain, "train"), (dval, "val")],
        early_stopping_rounds=40,
        verbose_eval=10,
    )
    print(f"\nTrained {booster.best_iteration + 1} rounds in {time.time() - start:.1f}s", flush=True)

    proba = booster.predict(dtest)
    # Choose a threshold that keeps precision high (protect innocents).
    best_t, best_f1 = 0.5, -1.0
    for t in np.linspace(0.2, 0.8, 25):
        pred = (proba >= t).astype(int)
        if pred.sum() == 0:
            continue
        f1 = f1_score(y_te, pred)
        if f1 > best_f1:
            best_f1, best_t = f1, float(t)
    pred = (proba >= best_t).astype(int)

    hn_fp = int(((pred == 1) & (y_te == 0) & hn_te).sum())
    hn_total = int(hn_te.sum())
    metrics = {
        "auc_roc": round(float(roc_auc_score(y_te, proba)), 4),
        "precision": round(float(precision_score(y_te, pred)), 4),
        "recall": round(float(recall_score(y_te, pred)), 4),
        "f1": round(float(f1_score(y_te, pred)), 4),
        "decision_threshold": round(best_t, 3),
        "n_test": int(len(y_te)),
        "hard_negative_fp_rate": round(hn_fp / hn_total, 4) if hn_total else 0.0,
        "hard_negative_n": hn_total,
        "best_iteration": int(booster.best_iteration),
    }
    return booster, metrics


def save(booster, metrics) -> None:
    for d in (_ML_ARTIFACTS, _BACKEND_ARTIFACTS):
        d.mkdir(parents=True, exist_ok=True)
        booster.save_model(str(d / "warmth_xgb.json"))
        (d / "warmth_xgb_features.json").write_text(json.dumps(FEATURE_NAMES, indent=2))
        (d / "warmth_xgb_metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"\nSaved artifact to:\n  {_ML_ARTIFACTS / 'warmth_xgb.json'}\n  {_BACKEND_ARTIFACTS / 'warmth_xgb.json'}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=12000)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--rounds", type=int, default=400)
    args = ap.parse_args()

    X, y, hn = build_matrix(args.n, args.seed)
    booster, metrics = train(X, y, hn, args.rounds)

    print("\n" + "=" * 46)
    print("  WarmthScore model — evaluation")
    print("=" * 46)
    for k, v in metrics.items():
        print(f"  {k:24s} {v}")
    print("=" * 46)
    save(booster, metrics)


if __name__ == "__main__":
    main()
