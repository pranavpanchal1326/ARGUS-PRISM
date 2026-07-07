"""Shared test fixtures.

Binds the whole test session to one isolated temp SQLite database so tests never
touch the developer's dev DB and don't fight over the shared engine. Every test still
runs against a *real* database — just a throwaway one.
"""

from __future__ import annotations

import pytest


@pytest.fixture(scope="session", autouse=True)
def _isolated_db(tmp_path_factory):
    from app.core.config import get_settings
    from app.db import session as sess

    settings = get_settings()
    db_path = tmp_path_factory.mktemp("db") / "test.db"
    # Force the SQLite fallback (unreachable Postgres) at a throwaway path.
    settings.postgres_url = "postgresql+psycopg://invalid:invalid@127.0.0.1:1/none"
    settings.sqlite_path = str(db_path)
    # Keep the suite hermetic: never call the real Ollama/Gemma cloud from tests,
    # even when a developer's .env has ASSISTANT_ENABLED=true. The live path is
    # verified manually; tests exercise the grounded degraded path deterministically.
    settings.assistant_enabled = False
    sess._engine = None
    sess._backend = "uninitialized"

    from app.db.session import init_db

    init_db()
    yield
