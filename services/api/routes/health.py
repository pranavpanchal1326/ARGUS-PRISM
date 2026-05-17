import time
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis

from ..config import Settings, get_settings
from ..dependencies import get_db, get_redis

router = APIRouter()


@router.get("")
async def liveness_check():
    """Load balancer liveness check."""
    settings = get_settings()
    return {
        "status": "operational",
        "engine": "PRISM",
        "version": settings.app_version,
        "environment": settings.environment,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }


@router.get("/ready")
async def readiness_check(
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
    settings: Settings = Depends(get_settings)
):
    """Kubernetes readiness check measuring all downstream dependencies."""
    dependencies_status = {}
    is_ready = True

    # Check 1: PostgreSQL
    start = time.monotonic()
    try:
        await db.execute(text("SELECT 1"))
        latency_ms = int((time.monotonic() - start) * 1000)
        dependencies_status["postgresql"] = {"status": "up", "latency_ms": latency_ms}
    except Exception:
        dependencies_status["postgresql"] = {"status": "down"}
        is_ready = False

    # Check 2: Redis
    start = time.monotonic()
    try:
        await redis_client.ping()
        latency_ms = int((time.monotonic() - start) * 1000)
        dependencies_status["redis"] = {"status": "up", "latency_ms": latency_ms}
    except Exception:
        dependencies_status["redis"] = {"status": "down"}
        is_ready = False

    # Check 3: Neo4j (bolt connectivity check — not HTTP)
    start = time.monotonic()
    try:
        from neo4j import AsyncGraphDatabase
        async with AsyncGraphDatabase.driver(
            settings.neo4j_api_url,
            auth=("neo4j", "prism1234"),
            connection_timeout=settings.neo4j_api_timeout,
        ) as driver:
            await driver.verify_connectivity()
        latency_ms = int((time.monotonic() - start) * 1000)
        dependencies_status["neo4j"] = {"status": "up", "latency_ms": latency_ms}
    except Exception:
        dependencies_status["neo4j"] = {"status": "down"}
        is_ready = False


    # Check 4: ML Model (soft dependency — doesn't affect readiness)
    try:
        from services.ml.warmthscore.model.predictor import WarmthScorePredictor
        from services.ml.warmthscore.model.model_registry import ModelRegistry
        _predictor = WarmthScorePredictor()
        if not _predictor._loaded:
            _predictor.load()
        _registry = ModelRegistry()
        model_info = _registry.get_model_summary()
        dependencies_status["ml_model"] = {
            "status": "up",
            "version": model_info.get("model_version", "unknown"),
            "features": model_info.get("total_features", 43),
        }
    except Exception:
        dependencies_status["ml_model"] = {"status": "not_loaded"}
        # ML is a soft dependency — don't mark service as not ready

    status_str = "ready" if is_ready else "degraded"
    if not is_ready and all(d["status"] == "down" for d in dependencies_status.values()):
        status_str = "down"
    
    if not is_ready:
        response.status_code = 503

    return {
        "status": status_str,
        "dependencies": dependencies_status,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }


@router.get("/thresholds")
async def verify_thresholds(settings: Settings = Depends(get_settings)):
    """Operational verification of legal action thresholds."""
    return {
        "thresholds": {
            "monitoring": settings.warmth_threshold_monitoring,
            "legal_basis_monitoring": "Internal risk policy",
            "kyc": settings.warmth_threshold_kyc,
            "legal_basis_kyc": "RBI KYC Master Direction 2016 S.38",
            "restriction": settings.warmth_threshold_restriction,
            "legal_basis_restriction": "RBI KYC Master Direction 2016 S.38",
            "autostr": settings.warmth_threshold_autostr,
            "legal_basis_autostr": "PMLA Section 12",
            "cbi_package": settings.warmth_threshold_cbi,
            "legal_basis_cbi": "SC Writ 03/2025"
        },
        "config_loaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "environment": settings.environment
    }
