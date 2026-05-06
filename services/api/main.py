# ═══════════════════════════════════════
# ARGUS-PRISM | main.py
# Engine: PRISM Core
# Branch: pranav/api
# ═══════════════════════════════════════
from datetime import datetime, timezone
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.logging import get_logger
from routes import accounts, health, warmthscore

logger = get_logger("prism.api")

app = FastAPI(title="ARGUS-PRISM API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["accounts"])
app.include_router(warmthscore.router, prefix="/api/warmthscore", tags=["warmthscore"])


@app.on_event("startup")
async def on_startup() -> None:
    """Start core services and announce PRISM engine availability.

    Returns:
        None.
    Connects to:
        PRISM Core engine.
    """
    health.set_start_time(time.monotonic())
    logger.info("PRISM ENGINE ONLINE")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Stop core services and announce PRISM engine shutdown.

    Returns:
        None.
    Connects to:
        PRISM Core engine.
    """
    logger.info("PRISM ENGINE OFFLINE")


@app.exception_handler(Exception)
async def handle_unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
    """Return a structured error for unexpected failures in PRISM Core.

    Returns:
        JSONResponse with error code, detail, and timestamp.
    Connects to:
        PRISM Core engine.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    request_id = getattr(request.state, "request_id", None)
    logger.exception("Unhandled exception", extra={"request_id": request_id})
    return JSONResponse(
        status_code=500,
        content={
            "error": "PRISM_INTERNAL_ERROR",
            "detail": str(exc),
            "timestamp": timestamp,
        },
    )


@app.get("/")
async def root() -> dict[str, object]:
    """Return the PRISM identity card and operational status for PRISM Core.

    Returns:
        System identity metadata and current status payload.
    Connects to:
        PRISM Core engine.
    """
    return {
        "system": "ARGUS-PRISM",
        "codename": "The hundred-eyed guardian. Always watching. Never sleeping.",
        "version": "2.0.0",
        "engines": [
            "FlowGraph",
            "WarmthScore",
            "AutoSTR",
            "TaintEngine",
            "RecruiterMap",
        ],
        "status": "OPERATIONAL",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
