import pytest
from datetime import datetime, timezone, timedelta
from services.ml.warmthscore.signals.signal5_fri_contradiction import FRIContradictionSignal

@pytest.fixture
def signal():
    return FRIContradictionSignal()

@pytest.fixture
def partial_signals():
    return {
        "S1": {"features": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8]}, # conf=0.8
        "S2": {"features": [0.1]*9}, # conf=0.1
        "S3": {"features": [0.1]*8}, # conf=0.1
        "S4": {"features": [0.1]*6 + [0.8]} # conf=0.8
    }

def test_perfect_evasion_pattern_fri_low_high_internal(signal, partial_signals):
    # Mean conf = (0.8+0.1+0.1+0.8)/4 = 0.45
    # Let's make internal higher
    partial_signals["S1"]["features"][6] = 1.0
    partial_signals["S4"]["features"][6] = 1.0
    # Mean = (1+0.1+0.1+1)/4 = 0.55. Still not 0.6.
    partial_signals["S2"]["features"][8] = 0.5
    # Mean = (1+0.5+0.1+1)/4 = 0.65
    
    data = {
        "account_id": "ACC1",
        "fri_tier": 1,
        "sim_activation_date": datetime.now(timezone.utc).isoformat(),
        "complaint_count": 0
    }
    res = signal.compute(data, partial_signals)
    assert res["features"][5] == 1.0 # Perfect evasion

def test_fri_very_high_no_contradiction(signal, partial_signals):
    data = {
        "account_id": "ACC2",
        "fri_tier": 4,
        "sim_activation_date": datetime.now(timezone.utc).isoformat()
    }
    res = signal.compute(data, partial_signals)
    assert res["features"][0] == 1.0 # FRI norm = 1.0
    assert res["features"][2] == 0.0 # No contradiction (internal < external)

def test_new_sim_amplifies_score(signal, partial_signals):
    now = datetime.now(timezone.utc)
    data = {
        "fri_tier": 1,
        "sim_activation_date": (now - timedelta(days=1)).isoformat()
    }
    res = signal.compute(data, partial_signals)
    assert res["features"][3] > 0.9

def test_old_sim_reduces_score(signal, partial_signals):
    now = datetime.now(timezone.utc)
    data = {
        "fri_tier": 1,
        "sim_activation_date": (now - timedelta(days=200)).isoformat()
    }
    res = signal.compute(data, partial_signals)
    assert res["features"][3] == 0.0 # Capped at 1.0 - min(200/90, 1.0) = 0.0

def test_invalid_fri_tier_raises(signal, partial_signals):
    with pytest.raises(ValueError):
        signal.compute({"fri_tier": 5}, partial_signals)

def test_missing_signal_key_raises(signal, partial_signals):
    del partial_signals["S1"]
    with pytest.raises(ValueError):
        signal.compute({"fri_tier": 1}, partial_signals)

def test_wrong_feature_length_raises(signal, partial_signals):
    partial_signals["S1"]["features"] = [0.0] * 5
    with pytest.raises(ValueError):
        signal.compute({"fri_tier": 1}, partial_signals)

def test_zero_complaints_with_low_fri_and_high_internal(signal, partial_signals):
    partial_signals["S1"]["features"][6] = 0.9
    partial_signals["S4"]["features"][6] = 0.9
    # Mean ~ 0.5
    data = {
        "fri_tier": 1,
        "sim_activation_date": datetime.now(timezone.utc).isoformat(),
        "complaint_count": 0
    }
    res = signal.compute(data, partial_signals)
    assert res["features"][5] == 0.7 # Pattern detected Tier 1 + internal >= 0.4
