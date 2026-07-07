"""WarmthScore engine — trained XGBoost ensemble with a rule-based fallback.

Primary path: the trained model maps the feature vector to P(mule); WarmthScore =
probability x 100, with SHAP contributions per feature for the explanation panel.
Fallback (no artifact / no xgboost): the transparent weighted 6-signal scorer. Either
way the score is real and explainable — legit accounts near 0, mules climbing high.
"""

from __future__ import annotations

from app.engines.warmthscore.features import FEATURE_LABELS, extract, vector
from app.engines.warmthscore.model import get_model
from app.engines.warmthscore.signals import WEIGHTS, raw_signals
from app.engines.warmthscore.types import ScoreInput, ScoreResult, TxnFeature

__all__ = ["ScoreInput", "TxnFeature", "ScoreResult", "score"]


def _rule_based(inp: ScoreInput, sigs: dict[str, tuple[float, str]]) -> ScoreResult:
    shap: list[dict] = []
    signals: dict[str, float] = {}
    fired: list[str] = []
    total = 0.0
    for code, (_name, weight) in WEIGHTS.items():
        raw, label = sigs[code]
        signals[code] = round(raw, 3)
        contribution = raw * weight
        total += contribution
        if raw > 0:
            fired.append(code)
            shap.append({"code": code, "label": label, "contribution": round(contribution, 2)})
    shap.sort(key=lambda s: s["contribution"], reverse=True)
    return ScoreResult(
        score=round(min(100.0, total), 2),
        signals=signals,
        shap=shap,
        signals_fired=fired,
        model="rules",
    )


_SIGNAL_FEATURES = {
    "s1_velocity": "S1",
    "s2_round_trip": "S2",
    "s3_structuring": "S3",
    "s4_dormant_device": "S4",
    "s5_profile_mismatch": "S5",
    "s6_sim_swap": "S6",
}


def _model_based(inp: ScoreInput, sigs: dict[str, tuple[float, str]], model) -> ScoreResult:
    prob, shap_contribs = model.predict(vector(inp))
    score_val = round(prob * 100.0, 2)
    signals = {code: round(raw, 3) for code, (raw, _label) in sigs.items()}

    # Total absolute SHAP mass → scale contributions into "warmth points" for display.
    total_abs = sum(abs(v) for v in shap_contribs.values()) or 1.0
    shap: list[dict] = []
    for feat, contrib in shap_contribs.items():
        if contrib <= 0:  # only risk-increasing drivers on the panel
            continue
        points = round(contrib / total_abs * score_val, 2)
        if points < 0.5:
            continue
        if feat in _SIGNAL_FEATURES:
            code = _SIGNAL_FEATURES[feat]
            label = sigs[code][1]
        else:
            code = feat.upper()
            label = FEATURE_LABELS.get(feat, feat)
        shap.append({"code": code, "label": label, "contribution": points})
    shap.sort(key=lambda s: s["contribution"], reverse=True)

    fired = [code for code, (raw, _l) in sigs.items() if raw > 0]
    return ScoreResult(
        score=score_val, signals=signals, shap=shap[:6], signals_fired=fired, model="xgboost"
    )


def score(inp: ScoreInput) -> ScoreResult:
    sigs = raw_signals(inp)
    model = get_model()
    if model is not None:
        try:
            return _model_based(inp, sigs, model)
        except Exception:  # noqa: BLE001 - never let the model break scoring
            pass
    return _rule_based(inp, sigs)


# Re-export the feature dict helper for callers that want raw features.
def features(inp: ScoreInput) -> dict[str, float]:
    return extract(inp)
