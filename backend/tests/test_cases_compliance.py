"""Cases lifecycle + HMAC audit ledger + compliance fairness."""

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
    simulator.load("recruiter_fanout", seed=7)
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


def test_case_lifecycle_and_activity(client: TestClient) -> None:
    analyst = _token(client, "analyst@unionbank.co.in")
    mlro = _token(client, "mlro@unionbank.co.in")
    ah = {"Authorization": f"Bearer {analyst}"}
    mh = {"Authorization": f"Bearer {mlro}"}

    alert = client.get("/api/v1/alerts?limit=1", headers=ah).json()["data"][0]
    created = client.post(
        "/api/v1/cases",
        json={"title": "Recruiter ring", "alert_id": alert["id"]},
        headers=ah,
    )
    assert created.status_code == 201
    case = created.json()["data"]
    assert case["status"] == "OPEN" and case["account_ids"]

    # Analyst can move it forward, add a note...
    client.patch(f"/api/v1/cases/{case['id']}", json={"status": "PENDING_MLRO"}, headers=ah)
    client.post(f"/api/v1/cases/{case['id']}/notes", json={"body": "Layering confirmed"}, headers=ah)

    # ...but only MLRO can close it.
    denied = client.patch(
        f"/api/v1/cases/{case['id']}", json={"status": "CLOSED_CONFIRMED_MULE"}, headers=ah
    )
    assert denied.status_code == 403
    closed = client.patch(
        f"/api/v1/cases/{case['id']}", json={"status": "CLOSED_CONFIRMED_MULE"}, headers=mh
    )
    assert closed.status_code == 200 and closed.json()["data"]["status"] == "CLOSED_CONFIRMED_MULE"

    activity = client.get(f"/api/v1/cases/{case['id']}/activity", headers=ah).json()["data"]
    assert any(a["to_status"] == "CLOSED_CONFIRMED_MULE" for a in activity)


def test_audit_chain_intact_and_tamper_detected(client: TestClient) -> None:
    mlro = _token(client, "mlro@unionbank.co.in")
    mh = {"Authorization": f"Bearer {mlro}"}

    # Generate an audit trail: freeze an account (audited).
    acct = client.get("/api/v1/accounts?limit=1", headers=mh).json()["data"][0]
    client.post(
        f"/api/v1/accounts/{acct['id']}/actions",
        json={"action": "freeze", "reason": "audit test"},
        headers=mh,
    )

    entries = client.get("/api/v1/audit?limit=200", headers=mh)
    assert entries.status_code == 200
    data = entries.json()["data"]
    assert data, "no audit entries"
    # Law 3: only an 8-char fingerprint, never full hash/key material.
    assert all(len(e["fingerprint"]) == 8 for e in data)

    verify = client.get("/api/v1/audit/verify", headers=mh).json()["data"]
    assert verify["intact"] is True and verify["entries"] >= 1

    # Tamper directly in the DB → verify must now fail.
    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.models.audit import AuditEntry

    with SessionLocal() as db:
        first = db.execute(select(AuditEntry).order_by(AuditEntry.seq.asc())).scalars().first()
        first.action = "TAMPERED"
        db.commit()
    broken = client.get("/api/v1/audit/verify", headers=mh).json()["data"]
    assert broken["intact"] is False


def test_fairness_computed_from_real_data(client: TestClient) -> None:
    mlro = _token(client, "mlro@unionbank.co.in")
    fairness = client.get(
        "/api/v1/compliance/fairness", headers={"Authorization": f"Bearer {mlro}"}
    )
    assert fairness.status_code == 200
    data = fairness.json()["data"]
    assert "overall_fp_rate" in data and isinstance(data["segments"], list)


def test_auditor_cannot_see_accounts(client: TestClient) -> None:
    auditor = _token(client, "auditor@unionbank.co.in")
    ah = {"Authorization": f"Bearer {auditor}"}
    # Auditor may read the ledger...
    assert client.get("/api/v1/audit", headers=ah).status_code == 200
    # ...but not customer accounts.
    assert client.get("/api/v1/accounts", headers=ah).status_code == 403
