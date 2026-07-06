"""SQLAlchemy engine + session, with a local SQLite fallback for Docker-less dev.

On startup we try to connect to Postgres. If that fails (common in local dev
without Docker), we transparently fall back to a file-backed SQLite database so the
API still boots and every endpoint still reads/writes a *real* database — never mock
data. ``active_backend()`` reports which one is live for the health endpoint.
"""

from __future__ import annotations

import logging
import os
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

log = logging.getLogger("prism.db")


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


_engine: Engine | None = None
_backend: str = "uninitialized"


def _build_engine() -> tuple[Engine, str]:
    settings = get_settings()
    # Try Postgres first, but fail fast (2s) so the SQLite fallback is snappy in
    # Docker-less dev instead of waiting out TCP SYN retries.
    try:
        connect_args = {}
        if settings.postgres_url.startswith("postgresql"):
            connect_args = {"connect_timeout": 2}
        engine = create_engine(
            settings.postgres_url,
            pool_pre_ping=True,
            future=True,
            connect_args=connect_args,
        )
        with engine.connect():
            pass
        log.info("Database backend: PostgreSQL")
        return engine, "postgres"
    except Exception as exc:  # noqa: BLE001 - any failure → fall back
        log.warning("Postgres unavailable (%s); falling back to local SQLite.", exc)

    sqlite_path = Path(settings.sqlite_path)
    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f"sqlite:///{sqlite_path.as_posix()}",
        connect_args={"check_same_thread": False},
        future=True,
    )
    log.info("Database backend: SQLite (%s)", sqlite_path)
    return engine, "sqlite"


def get_engine() -> Engine:
    global _engine, _backend
    if _engine is None:
        _engine, _backend = _build_engine()
    return _engine


def active_backend() -> str:
    get_engine()
    return _backend


SessionLocal = sessionmaker(autoflush=False, autocommit=False, future=True)


def init_db() -> None:
    """Create tables for all imported models. Safe to call repeatedly."""
    engine = get_engine()
    SessionLocal.configure(bind=engine)
    # Import models so they register on Base.metadata before create_all.
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a scoped session."""
    if SessionLocal.kw.get("bind") is None:
        SessionLocal.configure(bind=get_engine())
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def is_ephemeral() -> bool:
    """True when running on the SQLite fallback (used to relax some checks)."""
    return active_backend() == "sqlite" or os.environ.get("PYTEST_CURRENT_TEST") is not None
