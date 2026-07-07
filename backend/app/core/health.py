"""Dependency probes for the /health endpoint.

Each probe returns ``up`` / ``down`` / ``disabled`` with a short detail. A probe
failing never raises — health must always answer.
"""

from __future__ import annotations

import threading
import time
from collections.abc import Callable
from typing import Any

from app.core.config import get_settings

_PROBE_TIMEOUT_S = 2.0


def _run_all(probes: dict[str, Callable[[], dict[str, str]]]) -> dict[str, dict[str, str]]:
    """Run every probe concurrently on daemon threads with a shared hard timeout.

    Daemon threads let the caller return on timeout without waiting for a hung
    dependency handshake, and running them in parallel keeps /health at ~one probe
    timeout total instead of the sum — it can never block the event loop for long.
    """
    results: dict[str, dict[str, str]] = {
        name: {"status": "down", "detail": "probe timeout"} for name in probes
    }
    threads: list[threading.Thread] = []

    def _make_runner(name: str, probe: Callable[[], dict[str, str]]):
        def _run() -> None:
            try:
                results[name] = probe()
            except Exception as exc:  # noqa: BLE001
                results[name] = {"status": "down", "detail": str(exc)[:120]}

        return _run

    for name, probe in probes.items():
        thread = threading.Thread(target=_make_runner(name, probe), daemon=True)
        thread.start()
        threads.append(thread)

    end = time.monotonic() + _PROBE_TIMEOUT_S
    for thread in threads:
        thread.join(max(0.0, end - time.monotonic()))
    return results


def _probe_db() -> dict[str, str]:
    from sqlalchemy import text

    from app.db.session import active_backend, get_engine

    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "up", "detail": active_backend()}
    except Exception as exc:  # noqa: BLE001
        return {"status": "down", "detail": str(exc)[:120]}


def _probe_redis() -> dict[str, str]:
    settings = get_settings()
    try:
        import redis

        client = redis.Redis.from_url(settings.redis_url, socket_connect_timeout=1)
        client.ping()
        return {"status": "up", "detail": "redis"}
    except Exception as exc:  # noqa: BLE001
        return {"status": "down", "detail": str(exc)[:120]}


def _probe_neo4j() -> dict[str, str]:
    settings = get_settings()
    try:
        from neo4j import GraphDatabase

        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
            connection_timeout=1,
        )
        driver.verify_connectivity()
        driver.close()
        return {"status": "up", "detail": "neo4j"}
    except Exception as exc:  # noqa: BLE001
        return {"status": "down", "detail": str(exc)[:120]}


def _probe_ollama() -> dict[str, str]:
    settings = get_settings()
    if not settings.assistant_enabled:
        return {"status": "disabled", "detail": "assistant disabled"}
    try:
        import httpx

        resp = httpx.get(
            f"{settings.ollama_url}/api/tags", headers=settings.ollama_headers, timeout=2.0
        )
        resp.raise_for_status()
        return {"status": "up", "detail": settings.ollama_model}
    except Exception as exc:  # noqa: BLE001
        return {"status": "down", "detail": str(exc)[:120]}


def gather_health() -> dict[str, Any]:
    settings = get_settings()
    deps = _run_all(
        {
            "database": _probe_db,
            "redis": _probe_redis,
            "graph": _probe_neo4j,
            "assistant": _probe_ollama,
        }
    )
    # Database down = degraded; other deps have dev fallbacks.
    overall = "ok" if deps["database"]["status"] == "up" else "degraded"
    return {"status": overall, "version": settings.app_version, "dependencies": deps}
