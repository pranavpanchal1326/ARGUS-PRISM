# ml-models — WarmthScore training

Trains the XGBoost model behind WarmthScore and ships the artifact into the backend.

## Train

```bash
cd ml-models
pip install -r requirements.txt          # xgboost, scikit-learn, numpy
python -m warmth.train --n 16000 --seed 42 --rounds 400
```

The script prints live per-round training progress, then an evaluation summary, and
saves the booster + feature list + metrics to:

- `ml-models/artifacts/warmth_xgb.json` (source of truth)
- `backend/app/engines/warmthscore/artifacts/warmth_xgb.json` (loaded at inference)

## Design — no train/serve skew

Training reuses the **exact feature extractor the backend uses at inference**
(`app.engines.warmthscore.features`), so the model can never be fed a different
feature space than production. The synthetic dataset (`warmth/dataset.py`) is built to
match the live simulator's distribution and includes:

- **Hard negatives** — legit accounts that *look* like mules (medical crowdfunding,
  salary-day spikes, family pooling, high-frequency traders). The headline metric is
  the false-positive rate on these — it protects innocent customers.
- **Confusable mules** — stealth mules that mimic ordinary accounts, so recall is
  honest (not a suspicious 1.0) and the model learns real nuance.

## Latest metrics

| Metric | Value |
|---|---|
| AUC-ROC | ~0.98 |
| Precision | ~0.99 |
| Recall | ~0.97 |
| Hard-negative FP rate | 0.00 |

On the live simulator: legit accounts average ~2 (all CLEAN), mules average ~94
(mostly CRITICAL/IMMINENT). If the artifact is absent, the backend transparently falls
back to the rule-based 6-signal scorer — the API always works.
