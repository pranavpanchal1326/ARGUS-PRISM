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
<<<<<<< Updated upstream
=======
    Automatically fires legal triggers at thresholds 75 and 85.
    Persists every score to warmth_scores table for timeline and audit.
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

    # --- PERSIST SCORE TO POSTGRESQL ---
    # Map signal_contributions list to individual column values
    sig_scores = {}
    for contrib in result.signal_contributions:
        sig_scores[contrib["signal_id"]] = contrib["shap_contribution"]

    try:
        from services.api.database.models import WarmthScore as WarmthScoreRecord
        score_record = WarmthScoreRecord(
            account_id=account_id,
            warmth_score=result.warmth_score,
            risk_level=result.risk_level,
            signal_1_score=sig_scores.get("S1", 0.0),
            signal_2_score=sig_scores.get("S2", 0.0),
            signal_3_score=sig_scores.get("S3", 0.0),
            signal_4_score=sig_scores.get("S4", 0.0),
            signal_5_score=sig_scores.get("S5", 0.0),
            signal_6_score=sig_scores.get("S6", 0.0),
            shap_top1_signal=result.top_3_features[0]["feature_name"] if len(result.top_3_features) > 0 else None,
            shap_top1_impact=result.top_3_features[0]["shap_value"] if len(result.top_3_features) > 0 else None,
            shap_top2_signal=result.top_3_features[1]["feature_name"] if len(result.top_3_features) > 1 else None,
            shap_top2_impact=result.top_3_features[1]["shap_value"] if len(result.top_3_features) > 1 else None,
            shap_top3_signal=result.top_3_features[2]["feature_name"] if len(result.top_3_features) > 2 else None,
            shap_top3_impact=result.top_3_features[2]["shap_value"] if len(result.top_3_features) > 2 else None,
            computation_duration_ms=None,
        )
        db.add(score_record)
        await db.flush()
        logger.info(f"Score persisted: account={account_id} score={result.warmth_score} score_id={score_record.score_id}")
    except Exception as pe:
        logger.error(f"Failed to persist score for {account_id}: {pe}")
        # Non-blocking: don't fail the scoring response over a DB write issue

    # --- LEGAL TRIGGER EVALUATION ---
    # Evaluate score thresholds and fire legal actions (75 → KYC flag, 85 → full restriction)
    trigger_result = None
    try:
        trigger_result = await _legal_engine.evaluate(
            account_id=account_id,
            warmth_score=result.warmth_score,
            db=db,
        )
    except Exception as te:
        # Non-blocking: log but don't fail the scoring response
        logger.warning(f"Legal trigger evaluation failed for {account_id}: {te}")
>>>>>>> Stashed changes
        
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

# Timeline endpoint — queries real WarmthScore history from PostgreSQL
@router.get("/{account_id}/timeline")
async def get_timeline(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, le=200, ge=1),
):
    """
    Returns historical WarmthScore snapshots for an account from PostgreSQL.
    Used by the dashboard score timeline chart.
    """
    from sqlalchemy import select
    from services.api.database.models import WarmthScore as WarmthScoreRecord

    result = await db.execute(
        select(WarmthScoreRecord)
        .where(WarmthScoreRecord.account_id == account_id)
        .order_by(WarmthScoreRecord.computed_at.desc())
        .limit(limit)
    )
    events = result.scalars().all()

    return [
        {
            "timestamp": e.computed_at.isoformat() if e.computed_at else None,
            "score": e.warmth_score,
            "risk_level": e.risk_level,
            "signals": {
                "S1": e.signal_1_score,
                "S2": e.signal_2_score,
                "S3": e.signal_3_score,
                "S4": e.signal_4_score,
                "S5": e.signal_5_score,
                "S6": e.signal_6_score,
            },
            "top_signals": [
                {"signal": e.shap_top1_signal, "impact": e.shap_top1_impact},
                {"signal": e.shap_top2_signal, "impact": e.shap_top2_impact},
                {"signal": e.shap_top3_signal, "impact": e.shap_top3_impact},
            ],
        }
        for e in events
    ]

