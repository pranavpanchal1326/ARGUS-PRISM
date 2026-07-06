"""Smoke tests for the foundation: app boots, health answers, envelope holds."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    # `with` runs the lifespan so the database is initialised before requests.
    with TestClient(app) as c:
        yield c


def test_health_ok(client: TestClient) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    data = body["data"]
    assert data["status"] in {"ok", "degraded"}
    # Database has a SQLite fallback, so it must be up even without Docker.
    assert data["dependencies"]["database"]["status"] == "up"
    assert data["version"]


def test_root_enveloped(client: TestClient) -> None:
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["data"]["service"] == "ARGUS-PRISM"


def test_unknown_route_is_problem_json(client: TestClient) -> None:
    resp = client.get("/api/v1/does-not-exist")
    assert resp.status_code == 404
    assert resp.headers["content-type"].startswith("application/problem+json")
    body = resp.json()
    assert body["status"] == 404
    assert body["title"]
