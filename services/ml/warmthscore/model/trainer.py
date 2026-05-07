"""
XGBoost Trainer for PRISM WarmthScore.
Trains on 43-float matrix and saves artifacts.
"""

import logging
import json
from pathlib import Path
from datetime import datetime, timezone
import pandas as pd
import numpy as np
import joblib
import xgboost as xgb
import shap
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import MinMaxScaler

from services.ml.warmthscore.dataset.feature_engineer import FeatureEngineer, FEATURE_NAMES, SIGNAL_LENGTHS

logger = logging.getLogger("prism.ml.trainer")

MODEL_DIR = Path(__file__).parent / "artifacts"
MODEL_PATH = MODEL_DIR / "warmthscore_xgb.joblib"
SCALER_PATH = MODEL_DIR / "warmthscore_scaler.joblib"
EXPLAINER_PATH = MODEL_DIR / "shap_explainer.joblib"
METADATA_PATH = MODEL_DIR / "model_metadata.json"

XGB_PARAMS = {
    "n_estimators": 300,
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
    "tree_method": "hist"
}

class WarmthScoreTrainer:
    def __init__(self):
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        self.scaler = MinMaxScaler()
        self.feature_engineer = FeatureEngineer()
        self.model = None
        self.explainer = None

    def load_dataset(self, path: Path) -> tuple:
        """Loads and validates CSV dataset."""
        df = pd.read_csv(path)
        
        # Verify required columns
        for col in FEATURE_NAMES:
            if col not in df.columns:
                raise ValueError(f"Missing feature column: {col}")
        if "is_mule" not in df.columns:
            raise ValueError("Missing label column: is_mule")
            
        X = df[FEATURE_NAMES].values.astype(np.float32)
        y = df["is_mule"].values.astype(np.int32)
        
        # Validate matrix
        validation = self.feature_engineer.validate_feature_matrix(X)
        if not validation["valid"]:
            raise ValueError(f"Dataset validation failed: {validation['errors']}")
            
        mule_count = int(np.sum(y == 1))
        clean_count = int(np.sum(y == 0))
        logger.info(f"Loaded dataset: {len(df)} rows. Mule: {mule_count}, Clean: {clean_count}. Ratio: {mule_count/len(df):.4f}")
        
        return X, y

    def generate_synthetic_dataset(self, path: Path, n_samples: int = 1000):
        """Generates a dummy dataset with correct 43 columns for initial validation."""
        data = np.random.rand(n_samples, len(FEATURE_NAMES))
        df = pd.DataFrame(data, columns=FEATURE_NAMES)
        
        # Inject correlation for 'is_mule'
        # Let's say high confidence in S1, S2, S3 makes it a mule
        prob = (df["s1_pattern_confidence"] * 0.3 + 
                df["s2_layer1_score"] * 0.3 + 
                df["s3_curve_shape_score"] * 0.4)
        df["is_mule"] = (prob > 0.6).astype(int)
        
        df.to_csv(path, index=False)
        logger.info(f"Generated synthetic training dataset at {path}")

    def train(self, dataset_path: Path) -> dict:
        """Executes full training pipeline."""
        X, y = self.load_dataset(dataset_path)
        
        # Fit scaler
        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        
        # Cross Validation
        logger.info("Starting Stratified 5-Fold Cross Validation...")
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(
            xgb.XGBClassifier(**XGB_PARAMS), 
            X_scaled, y, 
            cv=skf, 
            scoring="roc_auc"
        )
        
        mean_auc = float(np.mean(cv_scores))
        std_auc = float(np.std(cv_scores))
        logger.info(f"CV AUC: {mean_auc:.4f} \u00b1 {std_auc:.4f}")
        
        # Final Training
        logger.info("Training final model...")
        self.model = xgb.XGBClassifier(**XGB_PARAMS)
        self.model.fit(X_scaled, y)
        
        # SHAP Explainer
        logger.info("Building SHAP TreeExplainer...")
        self.explainer = shap.TreeExplainer(self.model)
        
        # Save artifacts
        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)
        joblib.dump(self.explainer, EXPLAINER_PATH)
        
        metadata = {
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "model_version": "1.0.0",
            "feature_count": len(FEATURE_NAMES),
            "feature_names": FEATURE_NAMES,
            "signal_lengths": SIGNAL_LENGTHS,
            "dataset_path": str(dataset_path),
            "dataset_rows": len(y),
            "mule_count": int(np.sum(y == 1)),
            "clean_count": int(np.sum(y == 0)),
            "mule_ratio": float(np.mean(y)),
            "cv_auc_mean": mean_auc,
            "cv_auc_std": std_auc,
            "xgb_params": XGB_PARAMS
        }
        
        with open(METADATA_PATH, "w") as f:
            json.dump(metadata, f, indent=2)
            
        logger.info(f"Model training complete. AUC: {mean_auc:.4f}. Artifacts saved to {MODEL_DIR}")
        return metadata

    def validate_artifacts(self) -> bool:
        """Verifies all artifacts are present and valid."""
        artifacts = [MODEL_PATH, SCALER_PATH, EXPLAINER_PATH, METADATA_PATH]
        for art in artifacts:
            if not art.exists() or art.stat().st_size == 0:
                return False
        return True

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    trainer = WarmthScoreTrainer()
    
    data_path = Path("warmthscore_training_v1.csv")
    if not data_path.exists():
        trainer.generate_synthetic_dataset(data_path)
        
    metadata = trainer.train(data_path)
    print(json.dumps(metadata, indent=2))
