"""ARGUS-PRISM V3 — FastAPI application entrypoint.

Wires the response-envelope conventions, CORS, exception handlers, and routers.
Routers are added as their domains land; the contract in ``contracts/openapi.yaml``
stays the source of truth for every shape exposed here.
"""

from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.response import register_exception_handlers
from app.db.session import active_backend, init_db
from app.routers import (
    accounts,
    admin,
    alerts,
    assistant,
    auth,
    autostr,
    cases,
    compliance,
    graph,
    health,
    recruiter,
    sim,
    stream,
)

settings = get_settings()
configure_logging(settings.debug)
log = logging.getLogger("prism.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(
        "Starting %s v%s (%s)", settings.app_name, settings.app_version, settings.environment
    )
    init_db()
    log.info("Database ready on backend: %s", active_backend())
    from app.auth.seed import seed_users

    seed_users()
    yield
    log.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Pre-crime Intelligence System for Mule Detection",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)


@app.middleware("http")
async def request_context(request: Request, call_next):
    """Attach a request id and log latency — no secrets logged."""
    request_id = request.headers.get("x-request-id", uuid.uuid4().hex[:12])
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["x-request-id"] = request_id
    log.info(
        "%s %s -> %s (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


# ── Routers ───────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(alerts.router)
app.include_router(accounts.router)
app.include_router(graph.router)
app.include_router(recruiter.router)
app.include_router(cases.router)
app.include_router(autostr.router)
app.include_router(compliance.router)
app.include_router(admin.router)
app.include_router(assistant.router)
app.include_router(stream.router)
app.include_router(sim.router)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {
        "data": {
            "service": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/health",
        }
    }
