"""Alert Queue API over HTTP: envelope, pagination, RBAC gating, sim status.

Seeds real data through the pipeline, then drives the contract endpoints.
"""

from __future__ import annotations

from urllib.parse import parse_qs, urlparse

import pyotp
import pytest
from fastapi.testclient import TestClient

from app.auth.seed import DEV_PASSWORD
from app.main import app
from app.simulator.engine import simulator


@pytest.fixture(scope="module", autouse=True)
def _seed_alerts():
    # Generate real accounts/alerts via the pipeline before the API tests run.
    simulator.reset()
    simulator.load("recruiter_fanout", seed=909)
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


def test_analyst_sees_paginated_alerts(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    resp = client.get(
        "/api/v1/alerts?limit=10&sort=score_desc", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body and "meta" in body
    assert len(body["data"]) <= 10
    if body["data"]:
        a = body["data"][0]
        assert a["account_ref"].count("*") >= 2  # masked (Law 3)
        assert a["severity"] in {"WARMING", "HOT", "CRITICAL", "IMMINENT"}
        assert "warmth_score" in a and "sla_deadline" in a


def test_sysadmin_cannot_see_alerts(client: TestClient) -> None:
    token = _token(client, "admin@unionbank.co.in")
    resp = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {token}"})
    # SYS_ADMIN is deliberately walled off from customer data.
    assert resp.status_code == 403
    assert resp.json()["code"] == "forbidden"


def test_acknowledge_and_escalate(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    headers = {"Authorization": f"Bearer {token}"}
    alerts = client.get("/api/v1/alerts?limit=1", headers=headers).json()["data"]
    if not alerts:
        pytest.skip("no alerts generated")
    alert_id = alerts[0]["id"]

    ack = client.patch(
        f"/api/v1/alerts/{alert_id}", json={"action": "acknowledge"}, headers=headers
    )
    assert ack.status_code == 200
    assert ack.json()["data"]["status"] == "ACKNOWLEDGED"

    esc = client.post(f"/api/v1/alerts/{alert_id}/escalate", json={"note": "to MLRO"}, headers=headers)
    assert esc.status_code == 200
    assert esc.json()["data"]["status"] == "ESCALATED"


def test_pulse_and_sim_status(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    pulse = client.get("/api/v1/metrics/pulse", headers={"Authorization": f"Bearer {token}"})
    assert pulse.status_code == 200
    data = pulse.json()["data"]
    assert data["active_alerts"] >= 1
    assert data["accounts_watched"] >= 1

    status = client.get("/api/v1/sim/status")
    assert status.status_code == 200
    assert "recruiter_fanout" in status.json()["data"]["available_scenarios"]
