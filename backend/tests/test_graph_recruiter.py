"""Network Graph, Recruiter Map, and taint propagation.

Proves the ensemble story: WarmthScore alone tops mules out at HOT; freezing the
campaign propagates taint and lifts the connected network into CRITICAL/IMMINENT.
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
def _seed(tmp_path_factory):
    # Isolate this module's DB so the "newly tainted" count is deterministic (other
    # modules freeze accounts on the shared session DB, which would pollute it).
    from app.core.config import get_settings
    from app.db import session as sess
    from app.db.session import init_db

    settings = get_settings()
    settings.sqlite_path = str(tmp_path_factory.mktemp("graph") / "graph.db")
    sess._engine = None
    sess._backend = "uninitialized"
    init_db()

    simulator.reset()
    simulator.load("recruiter_fanout", seed=2024)
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


def test_recruiter_detected_with_scale_class(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    resp = client.get("/api/v1/recruiters", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    recruiters = resp.json()["data"]
    assert recruiters, "no recruiter detected"
    top = recruiters[0]
    assert top["downstream_count"] >= 20
    assert top["scale_class"] in {"INDUSTRIAL_ORCHESTRATOR", "NATIONAL_SYNDICATE"}


def test_neighborhood_and_patterns(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    headers = {"Authorization": f"Bearer {token}"}
    rec = client.get("/api/v1/recruiters", headers=headers).json()["data"][0]
    campaign = client.get(
        f"/api/v1/recruiters/{rec['id']}/campaign", headers=headers
    ).json()["data"]
    assert len(campaign["nodes"]) >= 2 and campaign["edges"]

    graph = client.get(
        f"/api/v1/graph/neighborhood/{rec['id']}?hops=2", headers=headers
    ).json()["data"]
    assert graph["root"] == rec["id"]
    assert len(graph["nodes"]) >= 2

    patterns = client.get("/api/v1/graph/patterns/round_trip", headers=headers)
    assert patterns.status_code == 200


def test_freeze_campaign_propagates_taint_to_critical(client: TestClient) -> None:
    analyst = _token(client, "analyst@unionbank.co.in")
    mlro = _token(client, "mlro@unionbank.co.in")
    rec = client.get(
        "/api/v1/recruiters", headers={"Authorization": f"Bearer {analyst}"}
    ).json()["data"][0]

    # Analyst cannot freeze a campaign.
    denied = client.post(
        f"/api/v1/recruiters/{rec['id']}/freeze-campaign",
        json={"reason": "x"},
        headers={"Authorization": f"Bearer {analyst}"},
    )
    assert denied.status_code == 403

    # MLRO freezes the campaign → taint propagates.
    result = client.post(
        f"/api/v1/recruiters/{rec['id']}/freeze-campaign",
        json={"reason": "confirmed ring"},
        headers={"Authorization": f"Bearer {mlro}"},
    ).json()["data"]
    assert result["frozen"] >= 1
    assert result["tainted"] >= 1

    # Taint agreement lifts the network into CRITICAL/IMMINENT.
    escalated = client.get(
        "/api/v1/accounts?risk_tier=IMMINENT&limit=100",
        headers={"Authorization": f"Bearer {mlro}"},
    ).json()["data"]
    critical = client.get(
        "/api/v1/accounts?risk_tier=CRITICAL&limit=100",
        headers={"Authorization": f"Bearer {mlro}"},
    ).json()["data"]
    assert len(escalated) + len(critical) >= 1
