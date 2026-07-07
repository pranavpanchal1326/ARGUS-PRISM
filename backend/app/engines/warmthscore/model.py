"""Trained WarmthScore model loader + predictor.

Loads the XGBoost booster from ``artifacts/warmth_xgb.json`` (shipped with the backend,
trained on ml-models). If the artifact or xgboost is absent, ``get_model()`` returns
None and the engine falls back to the transparent rule-based scorer — the API always
works, trained model or not.
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.engines.warmthscore.features import FEATURE_NAMES

log = logging.getLogger("prism.warmthscore.model")

_ARTIFACT = Path(__file__).parent / "artifacts" / "warmth_xgb.json"


class WarmthModel:
    def __init__(self, booster) -> None:
        self._booster = booster

    def predict(self, feature_row: list[float]) -> tuple[float, dict[str, float]]:
        """Return (probability 0..1, {feature: SHAP contribution in log-odds})."""
        import numpy as np
        import xgboost as xgb

        dmatrix = xgb.DMatrix(np.array([feature_row], dtype=float), feature_names=FEATURE_NAMES)
        prob = float(self._booster.predict(dmatrix)[0])
        contribs = self._booster.predict(dmatrix, pred_contribs=True)[0]
        # Last entry is the bias term; drop it.
        shap = {name: float(contribs[i]) for i, name in enumerate(FEATURE_NAMES)}
        return prob, shap


_model: WarmthModel | None = None
_loaded = False


def get_model() -> WarmthModel | None:
    global _model, _loaded
    if _loaded:
        return _model
    _loaded = True
    if not _ARTIFACT.exists():
        log.info("No trained WarmthScore artifact; using rule-based scorer.")
        return None
    try:
        import xgboost as xgb

        booster = xgb.Booster()
        booster.load_model(str(_ARTIFACT))
        _model = WarmthModel(booster)
        log.info("Loaded trained WarmthScore model: %s", _ARTIFACT.name)
    except Exception as exc:  # noqa: BLE001
        log.warning("Could not load WarmthScore model (%s); falling back to rules.", exc)
        _model = None
    return _model


def reset_cache() -> None:
    """Force a reload (used after (re)training)."""
    global _model, _loaded
    _model, _loaded = None, False
