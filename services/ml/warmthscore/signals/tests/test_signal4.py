import pytest
from datetime import datetime, timezone, timedelta
from services.ml.warmthscore.signals.signal4_dormant_reactivation import DormantReactivationSignal

@pytest.fixture
def signal():
    return DormantReactivationSignal()

def test_fully_dormant_account_max_score(signal):
    now = datetime.now(timezone.utc)
    data = {
        "account_id": "ACC1",
        "last_transaction_date": (now - timedelta(days=800)).isoformat(),
        "reactivation_date": now.isoformat(),
        "last_session_device_id": "OLD_DEV",
        "current_device_id": "NEW_DEV",
        "last_session_imei_prefix": "11111111",
        "current_imei_prefix": "22222222",
        "first_reactivation_amount": 600000.0,
        "last_kyc_date": (now - timedelta(days=1200)).isoformat(),
        "historical_channels": ["BRANCH"],
        "current_channel": "UPI"
    }
    res = signal.compute(data)
    assert res["features"][0] == 1.0 # Dormancy days capped at 730
    assert res["features"][1] == 1.0 # New device
    assert res["features"][2] == 1.0 # Amount capped at 500k
    assert res["features"][3] == 1.0 # KYC days capped at 1095
    assert res["features"][6] == 1.0 # Max confidence

def test_same_device_no_penalty(signal):
    now = datetime.now(timezone.utc)
    data = {
        "account_id": "ACC2",
        "last_transaction_date": (now - timedelta(days=10)).isoformat(),
        "reactivation_date": now.isoformat(),
        "last_session_device_id": "SAME_DEV",
        "current_device_id": "SAME_DEV",
        "first_reactivation_amount": 1000.0,
        "historical_channels": ["UPI"],
        "current_channel": "UPI"
    }
    res = signal.compute(data)
    assert res["features"][1] == 0.0
    assert res["features"][4] == 0.0

def test_new_device_full_penalty(signal):
    now = datetime.now(timezone.utc)
    data = {
        "account_id": "ACC3",
        "reactivation_date": now.isoformat(),
        "last_session_device_id": "OLD",
        "current_device_id": "NEW",
        "last_session_imei_prefix": "1",
        "current_imei_prefix": "2"
    }
    res = signal.compute(data)
    assert res["features"][1] == 1.0

def test_none_last_transaction_date(signal):
    now = datetime.now(timezone.utc)
    data = {
        "reactivation_date": now.isoformat(),
        "last_transaction_date": None
    }
    res = signal.compute(data)
    assert res["features"][0] == 1.0

def test_none_last_kyc_date(signal):
    now = datetime.now(timezone.utc)
    data = {
        "reactivation_date": now.isoformat(),
        "last_kyc_date": None
    }
    res = signal.compute(data)
    assert res["features"][3] == 1.0

def test_none_device_history(signal):
    now = datetime.now(timezone.utc)
    data = {
        "reactivation_date": now.isoformat(),
        "last_session_device_id": None
    }
    res = signal.compute(data)
    assert res["features"][1] == 1.0

def test_invalid_negative_amount_raises(signal):
    with pytest.raises(ValueError):
        signal.compute({"reactivation_date": "2024-01-01", "first_reactivation_amount": -1})

def test_batch_one_failure_doesnt_stop_others(signal):
    batch = [
        {"reactivation_date": datetime.now(timezone.utc).isoformat()},
        {"invalid": "data"} # This will fail
    ]
    results = signal.compute_batch(batch)
    assert len(results) == 2
    assert "error" in results[1]
