"""
Model Registry for PRISM WarmthScore.
Manages model versions and artifact metadata.
"""

import json
from pathlib import Path
from datetime import datetime, timezone
import logging

logger = logging.getLogger("prism.ml.registry")

MODEL_DIR = Path(__file__).parent / "artifacts"
METADATA_PATH = MODEL_DIR / "model_metadata.json"

class ModelRegistry:
    def __init__(self):
        pass

    def get_active_metadata(self) -> dict:
        """Loads and returns model metadata."""
        if not METADATA_PATH.exists():
            return {}
        try:
            with open(METADATA_PATH, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load model metadata: {e}")
            return {}

    def is_model_stale(self, max_age_days: int = 30) -> bool:
        """Checks if the model is older than the allowed age."""
        meta = self.get_active_metadata()
        if not meta:
            return True
            
        trained_at_str = meta.get("trained_at")
        if not trained_at_str:
            return True
            
        trained_at = datetime.fromisoformat(trained_at_str.replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - trained_at).days
        return age > max_age_days

    def get_model_summary(self) -> dict:
        """Returns a summary of the active model status."""
        meta = self.get_active_metadata()
        
        # Check artifact existence
        artifacts = [
            "warmthscore_xgb.joblib",
            "warmthscore_scaler.joblib",
            "shap_explainer.joblib",
            "model_metadata.json"
        ]
        valid = all((MODEL_DIR / a).exists() and (MODEL_DIR / a).stat().st_size > 0 for a in artifacts)
        
        if not meta:
            return {"status": "not_loaded", "artifacts_valid": valid}

        return {
            "model_version": meta.get("model_version", "unknown"),
            "trained_at": meta.get("trained_at"),
            "feature_count": meta.get("feature_count"),
            "cv_auc_mean": meta.get("cv_auc_mean"),
            "cv_auc_std": meta.get("cv_auc_std"),
            "is_stale": self.is_model_stale(),
            "artifacts_valid": valid
        }
