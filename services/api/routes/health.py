# ═══════════════════════════════════════
# ARGUS-PRISM | health.py
# Engine: PRISM Health
# Branch: pranav/api
# ═══════════════════════════════════════
from datetime import datetime, timezone
import time

import asyncpg
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from neo4j import AsyncGraphDatabase
from redis.asyncio import Redis

from core.config import settings
from core.logging import get_logger

router = APIRouter()
logger = get_logger("prism.health")

_start_time_monotonic: float = time.monotonic()


def set_start_time(start_time: float) -> None:
    """Set the service start time used for uptime in the PRISM Health engine.

    Returns:
        None.
    Connects to:
        PRISM Health engine.
    """
    global _start_time_monotonic
    _start_time_monotonic = start_time


async def _check_postgres() -> bool:
    try:
        connection = await asyncpg.connect(settings.POSTGRES_URL, timeout=2.0)
        await connection.close()
        return True
    except Exception:
        logger.debug("Postgres readiness check failed")
        return False


async def _check_redis() -> bool:
    client = Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        socket_connect_timeout=2.0,
        socket_timeout=2.0,
    )
    try:
        await client.ping()
        return True
    except Exception:
        logger.debug("Redis readiness check failed")
        return False
    finally:
        await client.close()


async def _check_neo4j() -> bool:
    driver = AsyncGraphDatabase.driver(
        settings.NEO4J_URI,
        auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
    )
    try:
        await driver.verify_connectivity()
        return True
    except Exception:
        logger.debug("Neo4j readiness check failed")
        return False
    finally:
        await driver.close()


@router.get("")
async def health() -> dict[str, str]:
    """Report PRISM liveness with version and timestamp via the Health engine.

    Returns:
        Liveness payload with status, engine, version, and timestamp.
    Connects to:
        PRISM Health engine.
    """
    return {
        "status": "operational",
        "engine": "PRISM",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready")
async def ready() -> JSONResponse:
    """Check Postgres, Redis, and Neo4j readiness for the Health engine.

    Returns:
        Readiness payload with per-service connectivity and timestamp.
    Connects to:
        PRISM Health engine.
    """
    postgres_ok = await _check_postgres()
    redis_ok = await _check_redis()
    neo4j_ok = await _check_neo4j()

    services = {
        "postgres": "connected" if postgres_ok else "unreachable",
        "redis": "connected" if redis_ok else "unreachable",
        "neo4j": "connected" if neo4j_ok else "unreachable",
    }
    is_ready = postgres_ok and redis_ok and neo4j_ok
    payload = {
        "status": "ready" if is_ready else "degraded",
        "services": services,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return JSONResponse(
        status_code=status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        content=payload,
    )


@router.get("/live")
async def live() -> dict[str, object]:
    """Return uptime in seconds since startup from the PRISM Health engine.

    Returns:
        Uptime payload with seconds and alive status.
    Connects to:
        PRISM Health engine.
    """
    uptime_seconds = time.monotonic() - _start_time_monotonic
    return {"uptime_seconds": uptime_seconds, "status": "alive"}
