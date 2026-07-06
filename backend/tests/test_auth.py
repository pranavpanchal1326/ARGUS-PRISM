"""End-to-end auth: login → enrol → TOTP verify → me → refresh → logout.

Also asserts the two V2-sin inversions: a different secret on every enrolment, and
no secret material anywhere except the one-time otpauth URI.
"""

from __future__ import annotations

import re
from urllib.parse import parse_qs, urlparse

import pyotp
import pytest
from fastapi.testclient import TestClient

from app.auth.seed import DEV_PASSWORD
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _secret_from_uri(uri: str) -> str:
    return parse_qs(urlparse(uri).query)["secret"][0]


def _login(client: TestClient, email: str = "analyst@unionbank.co.in") -> str:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": DEV_PASSWORD})
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["mfa_required"] is True
    return data["mfa_token"]


def _enroll_and_verify(client: TestClient, mfa_token: str) -> dict:
    enroll = client.post(
        "/api/v1/auth/mfa/enroll", headers={"Authorization": f"Bearer {mfa_token}"}
    )
    assert enroll.status_code == 200, enroll.text
    uri = enroll.json()["data"]["otpauth_uri"]
    secret = _secret_from_uri(uri)
    code = pyotp.TOTP(secret).now()
    verify = client.post(
        "/api/v1/auth/mfa/verify", json={"mfa_token": mfa_token, "code": code}
    )
    assert verify.status_code == 200, verify.text
    return verify.json()["data"]


def test_full_login_flow(client: TestClient) -> None:
    mfa_token = _login(client)
    tokens = _enroll_and_verify(client, mfa_token)
    assert tokens["token_type"] == "bearer"
    assert tokens["access_token"] and tokens["refresh_token"]

    auth = {"Authorization": f"Bearer {tokens['access_token']}"}
    me = client.get("/api/v1/auth/me", headers=auth)
    assert me.status_code == 200
    body = me.json()["data"]
    assert body["email"] == "analyst@unionbank.co.in"
    assert body["role"] == "FRAUD_ANALYST"
    assert body["mfa_active"] is True
    assert len(body["sessions"]) >= 1
    # Law 3: no secret material must appear in the profile.
    assert "mfa_secret" not in body and "secret" not in me.text.lower()


def test_refresh_rotates(client: TestClient) -> None:
    mfa_token = _login(client)
    tokens = _enroll_and_verify(client, mfa_token)
    r = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200
    new_tokens = r.json()["data"]
    assert new_tokens["refresh_token"] != tokens["refresh_token"]
    # Old refresh token is now revoked (rotation).
    reuse = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert reuse.status_code == 401


def test_enrollment_secret_differs_every_time(client: TestClient) -> None:
    mfa_token = _login(client, "mlro@unionbank.co.in")
    headers = {"Authorization": f"Bearer {mfa_token}"}
    s1 = _secret_from_uri(client.post("/api/v1/auth/mfa/enroll", headers=headers).json()["data"]["otpauth_uri"])
    s2 = _secret_from_uri(client.post("/api/v1/auth/mfa/enroll", headers=headers).json()["data"]["otpauth_uri"])
    assert s1 != s2, "regenerating enrolment must yield a different secret (the V2 sin, inverted)"


def test_bad_password_is_problem_json(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/login", json={"email": "analyst@unionbank.co.in", "password": "wrong"}
    )
    assert resp.status_code == 401
    assert resp.headers["content-type"].startswith("application/problem+json")
    assert resp.json()["code"] == "invalid_credentials"


def test_wrong_totp_rejected(client: TestClient) -> None:
    mfa_token = _login(client)
    client.post("/api/v1/auth/mfa/enroll", headers={"Authorization": f"Bearer {mfa_token}"})
    bad = client.post("/api/v1/auth/mfa/verify", json={"mfa_token": mfa_token, "code": "000000"})
    assert bad.status_code == 401
    assert bad.json()["code"] in {"invalid_code", "mfa_not_enrolled"}


def test_me_requires_auth(client: TestClient) -> None:
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert re.search("not_authenticated|invalid", resp.text)
