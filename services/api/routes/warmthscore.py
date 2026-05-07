"""
FastAPI Routes for PRISM WarmthScore.
Exposes real-time scoring and batch analysis endpoints.
"""

from fastapi import APIRouter, HTTPException, Body, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import logging

from services.ml.warmthscore.model.predictor import WarmthScorePredictor, WarmthScoreResult
from services.ml.warmthscore.model.model_registry import ModelRegistry

router = APIRouter()
logger = logging.getLogger("prism.api.warmthscore")

# Singleton instantiation
predictor = WarmthScorePredictor()
registry = ModelRegistry()

@router.post("/score", response_model=Dict[str, Any])
async def score_account(
    account_id: str = Body(...),
    signal_outputs: Dict[str, Any] = Body(...)
):
    """
    Scores a single account based on 6 signal outputs.
    """
    # Validation
    required = ["S1", "S2", "S3", "S4", "S5", "S6"]
    missing = [s for s in required if s not in signal_outputs]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing signal outputs: {', '.join(missing)}")
    
    try:
        # Singleton load on first request
        if not predictor._loaded:
            predictor.load()
    except Exception as e:
        raise HTTPException(status_code=503, detail="WarmthScore engine not ready")

    result = predictor.predict(account_id, signal_outputs)
    
    if result.error:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {result.error}")
        
    return {
        "account_id": result.account_id,
        "warmth_score": result.warmth_score,
        "risk_level": result.risk_level,
        "probability": result.probability,
        "signal_contributions": result.signal_contributions,
        "top_3_features": result.top_3_features,
        "threshold_actions": result.threshold_actions,
        "scored_at": result.scored_at
    }

@router.get("/model/status")
async def get_model_status():
    """
    Returns the current status and version of the ML model.
    """
    summary = registry.get_model_summary()
    return summary

@router.post("/score/batch")
async def score_batch(
    accounts: List[Dict[str, Any]] = Body(...)
):
    """
    Batch scores up to 50 accounts.
    """
    if len(accounts) > 50:
        raise HTTPException(status_code=422, detail="Maximum 50 accounts per batch")
        
    try:
        if not predictor._loaded:
            predictor.load()
    except Exception as e:
        raise HTTPException(status_code=503, detail="WarmthScore engine not ready")

    results = predictor.predict_batch(accounts)
    
    return [
        {
            "account_id": r.account_id,
            "warmth_score": r.warmth_score,
            "risk_level": r.risk_level,
            "error": r.error,
            "scored_at": r.scored_at
        } for r in results
    ]

# Timeline endpoint will be connected to DB in later phase, placeholder here
@router.get("/{account_id}/timeline")
async def get_timeline(
    account_id: str,
    hours: int = Query(72, le=168, ge=1)
):
    """
    Returns historical WarmthScore snapshots for an account.
    """
    # This will query PostgreSQL Audit Logs in Phase 6B
    return []
