"""AutoSTR — the demo-critical acceptance criteria (PRD §5.8).

- Async job assembles → seals three packages.
- All three download (XML, PDF, in-memory JSON) — no memory:// 404.
- Regenerating produces a new job, new timestamp, new fingerprint.
- Zero key material in any response (only an 8-char fingerprint).
- MLRO countersignature marks the package submitted.
"""

from __future__ import annotations

import time
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
    simulator.load("recruiter_fanout", seed=88)
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


def _make_case(client: TestClient, headers: dict) -> str:
    alert = client.get("/api/v1/alerts?limit=1", headers=headers).json()["data"][0]
    return client.post(
        "/api/v1/cases", json={"title": "STR case", "alert_id": alert["id"]}, headers=headers
    ).json()["data"]["id"]


def _generate_and_wait(client: TestClient, headers: dict, case_id: str) -> dict:
    job = client.post(f"/api/v1/autostr/{case_id}/generate", headers=headers)
    assert job.status_code == 202
    job_id = job.json()["data"]["id"]
    for _ in range(40):
        status = client.get(f"/api/v1/autostr/jobs/{job_id}", headers=headers).json()["data"]
        if status["status"] in {"SEALED", "FAILED"}:
            return status
        time.sleep(0.25)
    raise AssertionError("job did not seal in time")


def test_generate_seal_download_all_three(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    headers = {"Authorization": f"Bearer {token}"}
    case_id = _make_case(client, headers)

    status = _generate_and_wait(client, headers, case_id)
    assert status["status"] == "SEALED"

    packages = client.get(f"/api/v1/autostr/{case_id}/packages", headers=headers).json()["data"]
    types = {p["type"] for p in packages}
    assert types == {"FIU_STR_XML", "CBI_PDF", "RBI_JSON"}
    for p in packages:
        # Law 3: fingerprint is exactly 8 chars; no hash/seal/key fields present.
        assert len(p["fingerprint"]) == 8
        assert "signature" not in p and "content" not in p

    # Every package downloads (including the in-memory RBI JSON).
    for p in packages:
        dl = client.get(f"/api/v1/autostr/packages/{p['id']}/download", headers=headers)
        assert dl.status_code == 200
        assert len(dl.content) > 0
        if p["type"] == "CBI_PDF":
            assert dl.content[:4] == b"%PDF"


def test_regeneration_is_verifiably_different(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    headers = {"Authorization": f"Bearer {token}"}
    case_id = _make_case(client, headers)

    _generate_and_wait(client, headers, case_id)
    first = client.get(f"/api/v1/autostr/{case_id}/packages", headers=headers).json()["data"]
    first_fps = {p["type"]: p["fingerprint"] for p in first}

    time.sleep(0.05)
    _generate_and_wait(client, headers, case_id)
    second = client.get(f"/api/v1/autostr/{case_id}/packages", headers=headers).json()["data"]
    # A new run added new packages with new fingerprints (content embeds a timestamp).
    newest = {}
    for p in sorted(second, key=lambda x: x["generated_at"]):
        newest[p["type"]] = p["fingerprint"]
    assert any(newest[t] != first_fps[t] for t in first_fps)


def test_no_key_material_leaks(client: TestClient) -> None:
    token = _token(client, "analyst@unionbank.co.in")
    headers = {"Authorization": f"Bearer {token}"}
    case_id = _make_case(client, headers)
    _generate_and_wait(client, headers, case_id)
    raw = client.get(f"/api/v1/autostr/{case_id}/packages", headers=headers).text.lower()
    for banned in ("signature", "hmac", "private", "begin", "secret", "signing_key"):
        assert banned not in raw, f"leaked '{banned}' in package response"


def test_mlro_countersignature(client: TestClient) -> None:
    analyst = _token(client, "analyst@unionbank.co.in")
    mlro = _token(client, "mlro@unionbank.co.in")
    ah = {"Authorization": f"Bearer {analyst}"}
    mh = {"Authorization": f"Bearer {mlro}"}
    case_id = _make_case(client, ah)
    _generate_and_wait(client, ah, case_id)
    pkg = client.get(f"/api/v1/autostr/{case_id}/packages", headers=ah).json()["data"][0]

    # Analyst cannot approve.
    assert client.post(f"/api/v1/autostr/packages/{pkg['id']}/approve", headers=ah).status_code == 403
    # MLRO can.
    ok = client.post(f"/api/v1/autostr/packages/{pkg['id']}/approve", headers=mh)
    assert ok.status_code == 200 and ok.json()["data"]["status"] == "SUBMITTED"
    assert ok.json()["data"]["approved_by"] == "mlro@unionbank.co.in"
