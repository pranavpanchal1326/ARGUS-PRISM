import pytest
from datetime import datetime, timezone, timedelta
from services.ml.warmthscore.signals.signal6_sim_swap import SIMSwapSignal

@pytest.fixture
def signal():
    return SIMSwapSignal()

def test_swap_same_day_as_upi_max_score(signal):
    now = datetime.now(timezone.utc)
    data = {
        "account_id": "ACC1",
        "upi_registration_date": now.isoformat(),
        "swap_events": [
            {"swap_date": now.isoformat(), "old_iccid": "A", "new_iccid": "B"}
        ],
        "transactions_post_swap_24h": 0
    }
    res = signal.compute(data)
    assert res["features"][0] == 1.0 # 0 days diff
    assert res["features"][4] == 1.0 # Window score max

def test_swap_8_days_before_upi_half_score(signal):
    now = datetime.now(timezone.utc)
    data = {
        "upi_registration_date": now.isoformat(),
        "swap_events": [
            {"swap_date": (now - timedelta(days=8)).isoformat(), "old_iccid": "A", "new_iccid": "B"}
        ]
    }
    res = signal.compute(data)
    assert res["features"][0] == 0.0 # Capped at 1 - min(8/7, 1) = 0
    assert res["features"][4] == 0.5 # 8-14 days window

def test_swap_15_days_before_upi_zero_window_score(signal):
    now = datetime.now(timezone.utc)
    data = {
        "upi_registration_date": now.isoformat(),
        "swap_events": [
            {"swap_date": (now - timedelta(days=15)).isoformat(), "old_iccid": "A", "new_iccid": "B"}
        ]
    }
    res = signal.compute(data)
    assert res["features"][4] == 0.0

def test_empty_swap_events_all_zeros(signal):
    data = {
        "upi_registration_date": "2024-01-01T00:00:00Z",
        "swap_events": []
    }
    res = signal.compute(data)
    assert all(f == 0.0 for f in res["features"])

def test_no_upi_registration_date(signal):
    now = datetime.now(timezone.utc)
    data = {
        "upi_registration_date": None,
        "swap_events": [{"swap_date": now.isoformat(), "old_iccid": "A", "new_iccid": "B"}]
    }
    res = signal.compute(data)
    assert res["features"][0] == 0.0
    assert res["features"][4] == 0.0

def test_multiple_swaps_frequency_capped(signal):
    now = datetime.now(timezone.utc)
    data = {
        "swap_events": [
            {"swap_date": (now - timedelta(days=i)).isoformat(), "old_iccid": str(i), "new_iccid": str(i+1)}
            for i in range(10)
        ]
    }
    res = signal.compute(data)
    assert res["features"][1] == 1.0 # 10 swaps capped at 1.0

def test_iccid_two_changes_full_score(signal):
    data = {
        "swap_events": [
            {"swap_date": "2024-01-01", "old_iccid": "A", "new_iccid": "B"},
            {"swap_date": "2024-01-02", "old_iccid": "B", "new_iccid": "C"}
        ]
    }
    res = signal.compute(data)
    assert res["features"][2] == 1.0

def test_batch_empty_events_handled(signal):
    batch = [
        {"account_id": "1", "swap_events": []},
        {"account_id": "2", "swap_events": []}
    ]
    results = signal.compute_batch(batch)
    assert len(results) == 2
    assert results[0]["features"][0] == 0.0
