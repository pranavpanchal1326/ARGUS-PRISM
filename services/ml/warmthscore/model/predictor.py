"""
Predictor for PRISM WarmthScore.
Singleton class for real-time scoring and SHAP attribution.
"""

import logging
import threading
import json
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
import joblib
import numpy as np

from services.ml.warmthscore.dataset.feature_engineer import FeatureEngineer, FEATURE_NAMES, SIGNAL_LENGTHS, SIGNAL_ORDER

logger = logging.getLogger("prism.ml.predictor")

MODEL_DIR = Path(__file__).parent / "artifacts"
MODEL_PATH = MODEL_DIR / "warmthscore_xgb.joblib"
SCALER_PATH = MODEL_DIR / "warmthscore_scaler.joblib"
EXPLAINER_PATH = MODEL_DIR / "shap_explainer.joblib"
METADATA_PATH = MODEL_DIR / "model_metadata.json"

@dataclass
class WarmthScoreResult:
    account_id: str
    warmth_score: float
    risk_level: str
    probability: float
    signal_contributions: List[dict]
    top_3_features: List[dict]
    feature_vector: List[float]
    threshold_actions: List[str]
    scored_at: str
    error: Optional[str] = None

class WarmthScorePredictor:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(WarmthScorePredictor, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self._model = None
        self._scaler = None
        self._explainer = None
        self._metadata = None
        self._loaded = False
        self.feature_engineer = FeatureEngineer()
        self._initialized = True

    def load(self) -> None:
        """Loads model artifacts from disk. Thread-safe singleton."""
        with self._lock:
            if self._loaded:
                return
            
            try:
                if not all(p.exists() for p in [MODEL_PATH, SCALER_PATH, EXPLAINER_PATH, METADATA_PATH]):
                    raise FileNotFoundError("One or more model artifacts missing in model/artifacts/")
                
                self._model = joblib.load(MODEL_PATH)
                self._scaler = joblib.load(SCALER_PATH)
                self._explainer = joblib.load(EXPLAINER_PATH)
                
                with open(METADATA_PATH, "r") as f:
                    self._metadata = json.load(f)
                
                self._loaded = True
                logger.info(f"PRISM WarmthScore predictor loaded. Model v{self._metadata.get('model_version')}. Features: 43")
            except Exception as e:
                logger.error(f"Failed to load WarmthScorePredictor artifacts: {e}")
                self._loaded = False
                raise

    def _probability_to_warmthscore(self, prob: float) -> float:
        """
        Maps probability [0,1] to WarmthScore [0,100] using non-linear regulatory thresholds.
        """
        if prob < 0.20:
            score = prob * 100
        elif prob < 0.50:
            # 0.20 -> 20, 0.50 -> 60
            score = 20 + (prob - 0.20) * (40 / 0.30)
        elif prob < 0.75:
            # 0.50 -> 60, 0.75 -> 75
            score = 60 + (prob - 0.50) * (15 / 0.25)
        elif prob < 0.90:
            # 0.75 -> 75, 0.90 -> 85
            score = 75 + (prob - 0.75) * (10 / 0.15)
        else:
            # 0.90 -> 85, 1.00 -> 100
            score = 85 + (prob - 0.90) * (15 / 0.10)
            
        return round(min(100.0, max(0.0, score)), 2)

    def _score_to_risk_level(self, score: float) -> str:
        if score < 40: return "CLEAN"
        if score < 60: return "WARMING"
        if score < 75: return "HOT"
        if score < 85: return "CRITICAL"
        return "IMMINENT"

    def _get_threshold_actions(self, score: float) -> List[str]:
        if score >= 85:
            return [
                "FULL_ACCOUNT_RESTRICTION",
                "AUTOSTR_INITIATED",
                "CBI_PACKAGE_GENERATED",
                "MLRO_ESCALATION_MANDATORY",
                "LEGAL_BASIS: RBI KYC MD S.38 + PMLA S.12 + SC Writ 03/2025"
            ]
        elif score >= 75:
            return [
                "OUTBOUND_UPI_RESTRICTED",
                "AUTOSTR_INITIATED",
                "LEGAL_BASIS: RBI KYC Master Direction 2016 S.38"
            ]
        elif score >= 60:
            return [
                "KYC_REVERIFICATION_TRIGGERED",
                "ENHANCED_MONITORING",
                "LEGAL_BASIS: RBI KYC Master Direction 2016 S.38"
            ]
        elif score >= 40:
            return [
                "ENHANCED_MONITORING",
                "INTERNAL_FLAG_ONLY"
            ]
        else:
            return ["NORMAL_MONITORING"]

    def predict(self, account_id: str, signal_outputs: dict) -> WarmthScoreResult:
        """
        Calculates score, risk, and SHAP attribution for a single account.
        """
        if not self._loaded:
            self.load()
            
        try:
            # Assembly
            feature_vector = self.feature_engineer.assemble(signal_outputs)
            
            # Scale & Predict
            X_scaled = self._scaler.transform(feature_vector.reshape(1, -1))
            prob = float(self._model.predict_proba(X_scaled)[0][1])
            
            # Map
            warmth_score = self._probability_to_warmthscore(prob)
            risk_level = self._score_to_risk_level(warmth_score)
            actions = self._get_threshold_actions(warmth_score)
            
            # SHAP
            shap_values = self._explainer.shap_values(X_scaled)
            # Binary classifier: shap_values is a list of [neg_class_shap, pos_class_shap]
            if isinstance(shap_values, list):
                # SHAP >= 0.45 returns list. Earlier might return array.
                s_vals = shap_values[1][0]
            elif len(shap_values.shape) == 3:
                # Some versions return (rows, features, classes)
                s_vals = shap_values[0, :, 1]
            else:
                s_vals = shap_values[0]
                
            # Signal Contributions
            contributions = []
            start_idx = 0
            weights = {"S1": 0.18, "S2": 0.22, "S3": 0.15, "S4": 0.20, "S5": 0.15, "S6": 0.10}
            
            for sig_id in SIGNAL_ORDER:
                length = SIGNAL_LENGTHS[sig_id]
                sig_shap = float(np.sum(s_vals[start_idx : start_idx + length]))
                contributions.append({
                    "signal_id": sig_id,
                    "shap_contribution": sig_shap,
                    "weight": weights[sig_id],
                    "feature_count": length
                })
                start_idx += length
            
            contributions.sort(key=lambda x: abs(x["shap_contribution"]), reverse=True)
            
            # Top 3 Features
            all_feats = []
            for i, val in enumerate(s_vals):
                sig_id = next((s for s, l in SIGNAL_LENGTHS.items() if sum(SIGNAL_LENGTHS[o] for o in SIGNAL_ORDER[:SIGNAL_ORDER.index(s)]) <= i < sum(SIGNAL_LENGTHS[o] for o in SIGNAL_ORDER[:SIGNAL_ORDER.index(s)+1])), "unknown")
                all_feats.append({
                    "feature_name": FEATURE_NAMES[i],
                    "feature_index": i,
                    "feature_value": float(feature_vector[i]),
                    "shap_value": float(val),
                    "signal_id": sig_id,
                    "direction": "INCREASES_RISK" if val > 0 else "DECREASES_RISK"
                })
            
            all_feats.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
            top_3 = all_feats[:3]
            for i, f in enumerate(top_3):
                f["rank"] = i + 1
            
            if warmth_score >= 60:
                logger.info(f"PRISM ALERT | account={account_id} | score={warmth_score} | risk={risk_level} | top_feature={top_3[0]['feature_name']}")
                
            return WarmthScoreResult(
                account_id=account_id,
                warmth_score=warmth_score,
                risk_level=risk_level,
                probability=prob,
                signal_contributions=contributions,
                top_3_features=top_3,
                feature_vector=feature_vector.tolist(),
                threshold_actions=actions,
                scored_at=datetime.now(timezone.utc).isoformat()
            )
            
        except Exception as e:
            logger.error(f"Scoring error for {account_id}: {e}", exc_info=True)
            return WarmthScoreResult(
                account_id=account_id,
                warmth_score=0.0,
                risk_level="SCORING_ERROR",
                probability=0.0,
                signal_contributions=[],
                top_3_features=[],
                feature_vector=[],
                threshold_actions=[],
                scored_at=datetime.now(timezone.utc).isoformat(),
                error=str(e)
            )

    def predict_batch(self, batch: List[dict]) -> List[WarmthScoreResult]:
        return [self.predict(a["account_id"], a["signal_outputs"]) for a in batch]
