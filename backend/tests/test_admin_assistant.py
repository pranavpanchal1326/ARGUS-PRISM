"""Administration (user mgmt + health) and the PRISM Assistant (scoped, grounded)."""

from __future__ import annotations

from urllib.parse import parse_qs, urlparse

import pyotp
import pytest
from fastapi.testclient import TestClient

from app.auth.seed import DEV_PASSWORD
from app.main import app
from app.simulator.engine import simulator


@pytest.fixture(scope="module", autouse=True)
def _seed():
    simulator.reset()
    simulator.load("recruiter_fanout", seed=321)
    simulator.run_to_completion()
    yield


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _token(client: TestClient, email: str) -> str:
    mfa = client.post(
        "/api/v1/auth/login", json={"email": email, "password": DEV_PASSWORD}
    ).json()["data"]["mfa_token"]
    uri = client.post(
        "/api/v1/auth/mfa/enroll", headers={"Authorization": f"Bearer {mfa}"}
    ).json()["data"]["otpauth_uri"]
    secret = parse_qs(urlparse(uri).query)["secret"][0]
    code = pyotp.TOTP(secret).now()
    return client.post(
        "/api/v1/auth/mfa/verify", json={"mfa_token": mfa, "code": code}
    ).json()["data"]["access_token"]


# ── Admin ──────────────────────────────────────────────────────
def test_admin_user_management(client: TestClient) -> None:
    admin = _token(client, "admin@unionbank.co.in")
    ah = {"Authorization": f"Bearer {admin}"}

    users = client.get("/api/v1/admin/users", headers=ah)
    assert users.status_code == 200 and len(users.json()["data"]) >= 4

    invited = client.post(
        "/api/v1/admin/users",
        json={"email": "newanalyst@unionbank.co.in", "name": "New Hire", "role": "FRAUD_ANALYST"},
        headers=ah,
    )
    assert invited.status_code == 201
    uid = invited.json()["data"]["id"]

    disabled = client.patch(f"/api/v1/admin/users/{uid}", json={"disabled": True}, headers=ah)
    assert disabled.status_code == 200 and disabled.json()["data"]["disabled"] is True


def test_admin_health_strip(client: TestClient) -> None:
    admin = _token(client, "admin@unionbank.co.in")
    health = client.get("/api/v1/admin/health", headers={"Authorization": f"Bearer {admin}"})
    assert health.status_code == 200
    data = health.json()["data"]
    for lamp in ("api", "database", "graph_db", "cache"):
        assert lamp in data and "status" in data[lamp]


def test_analyst_cannot_manage_users(client: TestClient) -> None:
    analyst = _token(client, "analyst@unionbank.co.in")
    resp = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {analyst}"})
    assert resp.status_code == 403


# ── Assistant ──────────────────────────────────────────────────
def _collect_sse(resp) -> list[dict]:
    import json

    events = []
    for line in resp.text.splitlines():
        if line.startswith("data: "):
            events.append(json.loads(line[6:]))
    return events


def test_assistant_suggestions(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    resp = client.get(
        "/api/v1/assistant/suggestions?screen=alerts", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200 and len(resp.json()["data"]) == 3


def test_assistant_grounds_facts_live(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    resp = client.post(
        "/api/v1/assistant/chat",
        json={"message": "How many open alerts are there?"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    events = _collect_sse(resp)
    # Degrades gracefully (Ollama off) but still answers from live data.
    assert events[0]["type"] == "status" and events[0]["available"] is False
    text = " ".join(e.get("text", "") for e in events if e["type"] == "token")
    assert "open alerts" in text.lower()
    # Cross-check the number against the real endpoint.
    real = client.get(
        "/api/v1/metrics/pulse", headers={"Authorization": f"Bearer {token}"}
    ).json()["data"]["active_alerts"]
    assert str(real) in text


def test_assistant_refuses_off_topic(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    resp = client.post(
        "/api/v1/assistant/chat",
        json={"message": "Write me a poem about the weather"},
        headers={"Authorization": f"Bearer {token}"},
    )
    events = _collect_sse(resp)
    text = " ".join(e.get("text", "") for e in events if e["type"] == "token")
    assert "only assist with matters of this institution" in text.lower()
