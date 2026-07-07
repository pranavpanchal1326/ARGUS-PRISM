"""Accounts API: lookup, forensic detail, PII masking by role, freeze RBAC."""

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
    simulator.load("recruiter_fanout", seed=555)
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


def _first_mule_id(client: TestClient, token: str) -> str:
    resp = client.get(
        "/api/v1/accounts?risk_tier=HOT&limit=1", headers={"Authorization": f"Bearer {token}"}
    )
    data = resp.json()["data"]
    if not data:
        resp = client.get(
            "/api/v1/accounts?limit=1", headers={"Authorization": f"Bearer {token}"}
        )
        data = resp.json()["data"]
    return data[0]["id"]


def test_analyst_sees_masked_pii(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    headers = {"Authorization": f"Bearer {token}"}
    acct_id = _first_mule_id(client, token)
    detail = client.get(f"/api/v1/accounts/{acct_id}", headers=headers).json()["data"]
    assert detail["pii_masked"] is True
    assert "*" in detail["holder"]  # masked


def test_mlro_sees_full_pii(client: TestClient) -> None:
    token = _token(client, "mlro@unionbank.co.in")
    headers = {"Authorization": f"Bearer {token}"}
    acct_id = _first_mule_id(client, token)
    detail = client.get(f"/api/v1/accounts/{acct_id}", headers=headers).json()["data"]
    assert detail["pii_masked"] is False
    assert "*" not in detail["holder"]


def test_drill_path_subresources(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    headers = {"Authorization": f"Bearer {token}"}
    acct_id = _first_mule_id(client, token)

    hist = client.get(f"/api/v1/accounts/{acct_id}/score-history", headers=headers)
    assert hist.status_code == 200 and isinstance(hist.json()["data"], list)

    txns = client.get(f"/api/v1/accounts/{acct_id}/transactions", headers=headers)
    assert txns.status_code == 200
    if txns.json()["data"]:
        t = txns.json()["data"][0]
        assert t["direction"] in {"IN", "OUT"}
        assert t["counterparty_ref"] is None or "*" in t["counterparty_ref"]

    sig = client.get(f"/api/v1/accounts/{acct_id}/signals", headers=headers)
    assert sig.status_code == 200
    assert "S2" in sig.json()["data"]["signals"] or sig.json()["data"]["score"] >= 0

    dev = client.get(f"/api/v1/accounts/{acct_id}/devices", headers=headers)
    assert dev.status_code == 200


def test_freeze_requires_mlro(client: TestClient) -> None:
    analyst = _token(client, "analyst@unionbank.co.in")
    mlro = _token(client, "mlro@unionbank.co.in")
    acct_id = _first_mule_id(client, mlro)

    # Analyst cannot freeze.
    denied = client.post(
        f"/api/v1/accounts/{acct_id}/actions",
        json={"action": "freeze", "reason": "test"},
        headers={"Authorization": f"Bearer {analyst}"},
    )
    assert denied.status_code == 403

    # MLRO can.
    ok = client.post(
        f"/api/v1/accounts/{acct_id}/actions",
        json={"action": "freeze", "reason": "confirmed mule"},
        headers={"Authorization": f"Bearer {mlro}"},
    )
    assert ok.status_code == 200
    assert ok.json()["data"]["status"] == "FROZEN"
