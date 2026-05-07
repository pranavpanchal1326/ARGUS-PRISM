import pytest
import datetime
from services.ml.warmthscore.signals.signal_1_test_credit import evaluate

def test_clean_account_scores_low():
    acc_meta = {"account_id": "UBI-01", "account_opened_at": datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=10)}
    txs = []
    res = evaluate(txs, acc_meta)
    assert res["raw_score"] < 0.3
    assert res["triggered"] is False

def test_classic_mule_pattern_scores_high():
    acc_opened = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=10)
    acc_meta = {"account_id": "UBI-02", "account_opened_at": acc_opened}
    
    txs = []
    # 5 micro-credits, ₹100-200 each, source age < 15, variance < 200s, acc age < 12h
    for i in range(5):
        txs.append({
            "transaction_id": f"tx_{i}",
            "amount": 150.0,
            "direction": "CREDIT",
            "source_account_id": f"src_{i}",
            "source_account_age_days": 10,
            "source_account_dormant": False,
            "timestamp": acc_opened + datetime.timedelta(hours=5, seconds=i*30),
            "channel": "UPI"
        })
        
    res = evaluate(txs, acc_meta)
    assert res["raw_score"] >= 0.75
    assert res["triggered"] is True

def test_rule_override_triggers():
    acc_opened = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=18)
    acc_meta = {"account_id": "UBI-03", "account_opened_at": acc_opened}
    
    txs = []
    # exactly 4 micro-credits, source age 20 days, timing variance ~150s (std of evenly spaced points needs to be < 300)
    # std of [0, 100, 200, 300] is around 111
    for i in range(4):
        txs.append({
            "transaction_id": f"tx_{i}",
            "amount": 200.0,
            "direction": "CREDIT",
            "source_account_id": f"src_{i}",
            "source_account_age_days": 20,
            "source_account_dormant": False,
            "timestamp": acc_opened + datetime.timedelta(hours=2, seconds=i*100),
            "channel": "UPI"
        })
        
    res = evaluate(txs, acc_meta)
    assert res["raw_score"] >= 0.75

def test_empty_transaction_list():
    acc_meta = {"account_id": "UBI-04", "account_opened_at": datetime.datetime.now(datetime.timezone.utc)}
    res = evaluate([], acc_meta)
    assert res["raw_score"] == 0.0

def test_merchant_cashback_scores_low():
    acc_opened = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=100)
    acc_meta = {"account_id": "UBI-05", "account_opened_at": acc_opened}
    
    txs = []
    # 12 micro-credits (cashback pattern), source age 1000 days, high timing variance (std of hours)
    for i in range(12):
        txs.append({
            "transaction_id": f"tx_{i}",
            "amount": 10.0,
            "direction": "CREDIT",
            "source_account_id": "src_merchant",
            "source_account_age_days": 1000,
            "source_account_dormant": False,
            "timestamp": acc_opened + datetime.timedelta(hours=1 + i*3, minutes=(i%3)*45),
            "channel": "UPI"
        })
        
    res = evaluate(txs, acc_meta)
    assert res["raw_score"] < 0.4

def test_confidence_calculation_correct():
    acc_opened = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=10)
    acc_meta = {"account_id": "UBI-06", "account_opened_at": acc_opened}
    
    txs = []
    for i in range(5):
        txs.append({
            "transaction_id": f"tx_{i}",
            "amount": 400.0,  # 400 doesn't trigger avg amount (must be 50-300)
            "direction": "CREDIT",
            "source_account_id": f"src_{i}",
            "source_account_age_days": 10,
            "source_account_dormant": True,
            "timestamp": acc_opened + datetime.timedelta(hours=5, seconds=i*30),
            "channel": "UPI"
        })
        
    res = evaluate(txs, acc_meta)
    assert 0.7 <= res["confidence"] <= 0.8

def test_explanation_string_not_empty():
    acc_meta = {"account_id": "UBI-07", "account_opened_at": datetime.datetime.now(datetime.timezone.utc)}
    txs = [{"transaction_id": "t1", "amount": 100.0, "direction": "CREDIT", "source_account_id": "s1", "source_account_age_days": 5, "source_account_dormant": False, "timestamp": acc_meta["account_opened_at"] + datetime.timedelta(hours=1), "channel": "UPI"}]
    res = evaluate(txs, acc_meta)
    assert "Signal 1" in res["trigger_reason"]
    assert len(res["trigger_reason"]) > 10

def test_evaluate_never_raises():
    res = evaluate([{"malformed": "data"}], {"missing": "data"})
    assert res["raw_score"] == 0.0
    assert "failed" in res["trigger_reason"].lower()
