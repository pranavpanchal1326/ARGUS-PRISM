import sys
import os
from pathlib import Path
import json

# Add project root to sys.path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from services.ml.warmthscore.model.predictor import WarmthScorePredictor
from services.ml.warmthscore.model.shap_explainer import SHAPExplainer
from services.ml.warmthscore.dataset.feature_engineer import FEATURE_NAMES

def verify():
    predictor = WarmthScorePredictor()
    predictor.load()
    
    # Create dummy signal outputs
    signal_outputs = {
        "S1": {"features": [1.0] * 7},
        "S2": {"features": [1.0] * 9},
        "S3": {"features": [1.0] * 8},
        "S4": {"features": [1.0] * 7},
        "S5": {"features": [1.0] * 6},
        "S6": {"features": [1.0] * 6}
    }
    
    print("Testing predictor.predict()...")
    result = predictor.predict("MULE_01", signal_outputs)
    
    print(f"Account ID: {result.account_id}")
    print(f"WarmthScore: {result.warmth_score}")
    print(f"Risk Level: {result.risk_level}")
    print(f"Top 3 Features: {len(result.top_3_features)}")
    print(f"Signal Contributions: {len(result.signal_contributions)}")
    print(f"Feature Vector Length: {len(result.feature_vector)}")
    print(f"Threshold Actions: {result.threshold_actions}")
    
    # SHAP Explanation
    explainer = SHAPExplainer(FEATURE_NAMES)
    mlro = explainer.generate_mlro_explanation(result)
    print("\nMLRO Explanation:")
    print(json.dumps(mlro, indent=2))
    
    # Audit Trail
    audit = explainer.generate_audit_trail(result)
    print("\nAudit Trail:")
    print(f"Audit ID: {audit['audit_id']}")
    print(f"Feature Vector Hash: {audit['feature_vector_hash']}")

if __name__ == "__main__":
    verify()
