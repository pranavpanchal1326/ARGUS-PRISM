"""
Integration tests for AutoSTR API.
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone
from unittest.mock import MagicMock, AsyncMock

from services.api.main import app
from services.api.dependencies import get_db

# Shared mock for DB verification
db_mock = AsyncMock()

async def override_get_db():
    yield db_mock

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)
client.headers.update({
    "X-PRISM-User": "test-user",
    "X-PRISM-Role": "MLRO"
})

@pytest.fixture
def valid_payload():
    return {
        "case_id": "UBI-API-TEST-001",
        "reporting_entity_code": "UBI0001",
        "principal_officer_name": "Pranav",
        "principal_officer_designation": "CCO",
        "principal_officer_email": "cco@ubi.com",
        "detection_timestamp": datetime.now(timezone.utc).isoformat(),
        "threshold_crossed": 80.0,
        "accounts": [
            {
                "account_id": "ACC-1",
                "account_type": "SAVINGS",
                "holder_name": "John",
                "mobile_raw": "9876543210",
                "aadhaar_raw": "123412341234",
                "pan_raw": "ABCDE1234F",
                "branch_code": "B",
                "ifsc": "I",
                "kyc_status": "VERIFIED",
                "warmth_score": 85.0,
                "risk_level": "CRITICAL"
            }
        ],
        "transactions": [
            {
                "transaction_id": "T-1",
                "transaction_type": "UPI",
                "amount": 1000.0,
                "transaction_timestamp": datetime.now(timezone.utc).isoformat(),
                "source_account_id": "S",
                "destination_account_id": "D",
                "channel": "C",
                "device_id_raw": "D",
                "ip_address_raw": "1.1.1.1"
            }
        ],
        "signal_scores": [
            {"signal_name": "s1", "raw_score": 0.9, "weighted_score": 10.0, "shap_impact": 1.0},
            {"signal_name": "s2", "raw_score": 0.9, "weighted_score": 10.0, "shap_impact": 1.0},
            {"signal_name": "s3", "raw_score": 0.9, "weighted_score": 10.0, "shap_impact": 1.0},
            {"signal_name": "s4", "raw_score": 0.9, "weighted_score": 10.0, "shap_impact": 1.0},
            {"signal_name": "s5", "raw_score": 0.9, "weighted_score": 10.0, "shap_impact": 1.0},
            {"signal_name": "s6", "raw_score": 0.9, "weighted_score": 10.0, "shap_impact": 1.0},
        ],
        "shap_attribution": {
            "primary_signal": "s1", "primary_impact": 1.0,
            "secondary_signal": "s2", "secondary_impact": 1.0,
            "tertiary_signal": "s3", "tertiary_impact": 1.0
        }
    }

def test_generate_returns_200(valid_payload):
    response = client.post("/api/autostr/generate/UBI-API-TEST-001", json=valid_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == "UBI-API-TEST-001"
    assert data["status"] == "COMPLETE"

def test_case_id_mismatch_returns_400(valid_payload):
    response = client.post("/api/autostr/generate/WRONG-ID", json=valid_payload)
    assert response.status_code == 400

def test_all_legal_flags_true_on_success(valid_payload):
    response = client.post("/api/autostr/generate/UBI-API-TEST-001", json=valid_payload)
    data = response.json()
    assert data["pmla_s12_fulfilled"] == True
    assert data["sc_writ_03_2025_fulfilled"] == True
    assert data["rbi_csf_fulfilled"] == True
    assert data["all_legal_obligations_met"] == True

def test_audit_log_written(valid_payload):
    db_mock.reset_mock()
    client.post("/api/autostr/generate/UBI-API-TEST-001", json=valid_payload)
    # Check if execute was called with the correct action
    assert db_mock.execute.called
    args, kwargs = db_mock.execute.call_args
    query = str(args[0])
    params = args[1]
    assert "INSERT INTO audit_log" in query
    assert params["action"] == "STR_GENERATED"
    assert params["target_id"] == "UBI-API-TEST-001"

def test_generation_time_under_60_seconds(valid_payload):
    # Add more transactions to payload
    for i in range(19):
        valid_payload["transactions"].append(valid_payload["transactions"][0])
    
    response = client.post("/api/autostr/generate/UBI-API-TEST-001", json=valid_payload)
    data = response.json()
    assert data["total_generation_time_seconds"] < 60
