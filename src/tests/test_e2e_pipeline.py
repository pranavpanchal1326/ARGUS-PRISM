"""
ARGUS-PRISM — Full E2E Pipeline Integration Test — Day 7 W1 Sync
Paths configured by conftest.py in this directory.
"""
import os
import pytest

# Config loaded from services/pipeline/config.py (via conftest.py sys.path)
try:
    from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
except ImportError:
    NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

from neo4j import GraphDatabase
from detectors import (LayeringDetector, RoundTripDetector, StructuringDetector,
                       DormantActivationDetector, ProfileMismatchDetector)
from taint_engine import TaintEngine, TAINT_DECAY
from recruiter_detector import RecruiterDetector

PFX          = "E2E-W1-"
MULE_ID      = f"{PFX}MULE-001"
HOP1_ID      = f"{PFX}HOP1-001"
HOP2_ID      = f"{PFX}HOP2-001"
HOP3_ID      = f"{PFX}HOP3-001"
HOP4_ID      = f"{PFX}HOP4-001"
RECRUITER_ID = f"{PFX}REC-001"
LAY_SRC      = f"{PFX}LAY-SRC"
LAY1, LAY2, LAY3 = f"{PFX}LAY1", f"{PFX}LAY2", f"{PFX}LAY3"
WARM_COUNT   = 7


def _seed(s, account_id, **kw):
    base = dict(name="E2E", kyc_status="VERIFIED", kyc_income=150000,
                kyc_occupation="farmer", account_type="SAVINGS",
                branch_code="UBI-E2E", mobile_number="hash",
                warmth_score=70.0, taint_score=0.0, status="ACTIVE",
                is_mule=False, fri_score=8)
    base.update(kw)
    s.run("MERGE (a:Account {account_id: $id}) SET a += $p", id=account_id, p=base)


def _txn(s, src, dst, txn_id, amount=80_000_000, hrs=1, channel="IMPS"):
    s.run("""MATCH (a:Account {account_id:$s}) MATCH (b:Account {account_id:$d})
             MERGE (a)-[r:TRANSACTED {txn_id:$t}]->(b)
             SET r.amount=$amt, r.type='CREDIT', r.channel=$ch,
                 r.status='SUCCESS', r.timestamp=datetime()-duration($ago)""",
          s=src, d=dst, t=txn_id, amt=amount, ch=channel, ago=f"PT{hrs}H")


@pytest.fixture(scope="module")
def driver():
    drv = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    drv.verify_connectivity()
    yield drv
    drv.close()


@pytest.fixture(scope="module", autouse=True)
def seed(driver):
    with driver.session() as s:
        # Taint chain
        for aid in [HOP4_ID, HOP3_ID, HOP2_ID, HOP1_ID, MULE_ID]:
            _seed(s, aid, warmth_score=70.0)
        s.run("MATCH (a:Account {account_id:$id}) SET a.last_active=datetime()-duration('P150D')",
              id=MULE_ID)
        _txn(s, HOP4_ID, HOP3_ID, f"{PFX}T43")
        _txn(s, HOP3_ID, HOP2_ID, f"{PFX}T32")
        _txn(s, HOP2_ID, HOP1_ID, f"{PFX}T21")
        _txn(s, HOP1_ID, MULE_ID, f"{PFX}T1M")
        _txn(s, HOP1_ID, MULE_ID, f"{PFX}TRECENT", amount=5_000_000, hrs=2)
        # Recruiter
        _seed(s, RECRUITER_ID, warmth_score=30.0)
        for i in range(WARM_COUNT):
            wid = f"{PFX}WARM-{i:03d}"
            _seed(s, wid)
            _txn(s, RECRUITER_ID, wid, f"{PFX}WTXN-{i}", amount=2000, hrs=10, channel="UPI")
        # Layering chain
        for aid in [LAY_SRC, LAY1, LAY2, LAY3]:
            _seed(s, aid)
        _txn(s, LAY_SRC, LAY1, f"{PFX}L01", hrs=1)
        _txn(s, LAY1,   LAY2, f"{PFX}L12", hrs=1)
        _txn(s, LAY2,   LAY3, f"{PFX}L23", hrs=1)


# ── Step 1: Connectivity ───────────────────────────────────────────────────────

def test_neo4j_connectivity(driver):
    with driver.session() as s:
        r = s.run("RETURN 1 AS ok")
        assert r.single()["ok"] == 1


def test_all_e2e_accounts_seeded(driver):
    for aid in [MULE_ID, HOP1_ID, HOP2_ID, HOP3_ID, HOP4_ID, RECRUITER_ID]:
        with driver.session() as s:
            r = s.run("MATCH (a:Account {account_id:$id}) RETURN count(a) AS c", id=aid)
            assert r.single()["c"] == 1, f"{aid} missing"


# ── Step 2: FlowGraph ─────────────────────────────────────────────────────────

def test_layering_detector_fires(driver):
    det = LayeringDetector(driver)
    results = det.detect()
    assert isinstance(results, list)
    assert len(results) > 0, "LayeringDetector returned no results"


def test_dormant_activation_detector_flags_mule(driver):
    det = DormantActivationDetector(driver)
    results = det.detect()
    # FlowAlert has .account_ids (list), not .account_id
    all_flagged = [aid for alert in results for aid in alert.account_ids]
    assert MULE_ID in all_flagged, \
        f"DormantActivationDetector did not flag {MULE_ID}. Flagged: {all_flagged}"


def test_structuring_detector_runs(driver):
    assert isinstance(StructuringDetector(driver).detect(), list)


def test_round_trip_detector_runs(driver):
    assert isinstance(RoundTripDetector(driver).detect(), list)


def test_profile_mismatch_detector_runs(driver):
    assert isinstance(ProfileMismatchDetector(driver).detect(), list)


# ── Step 3: Taint ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def taint_result():
    eng = TaintEngine()
    r = eng.propagate_taint(MULE_ID)
    eng.close()
    return r


def test_taint_propagates_four_hops(taint_result):
    assert len(taint_result) == 4


def test_taint_hop1_score_80(driver):
    with driver.session() as s:
        r = s.run("MATCH (a:Account {account_id:$id}) RETURN a.taint_score AS ts", id=HOP1_ID)
        assert r.single()["ts"] == 80


def test_taint_hop4_score_15(driver):
    with driver.session() as s:
        r = s.run("MATCH (a:Account {account_id:$id}) RETURN a.taint_score AS ts", id=HOP4_ID)
        assert r.single()["ts"] == 15


def test_mule_frozen_after_taint(driver):
    with driver.session() as s:
        r = s.run("MATCH (a:Account {account_id:$id}) RETURN a.status AS st", id=MULE_ID)
        assert r.single()["st"] == "FROZEN"


def test_compound_score_above_70():
    eng = TaintEngine()
    result = eng.compute_final_score(HOP1_ID)
    eng.close()
    # HOP1: taint=80, warmth=70 → 80*0.6 + 70*0.4 = 76.0
    assert result["final_risk_score"] >= 70.0


# ── Step 4: Recruiter ─────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def recruiters():
    det = RecruiterDetector()
    r = det.detect_recruiters()
    det.close()
    return r


def test_recruiter_detected(recruiters):
    ids = [r["recruiter_id"] for r in recruiters]
    assert RECRUITER_ID in ids, f"{RECRUITER_ID} not detected as recruiter"


def test_recruiter_classified_coordinator(recruiters):
    r = next(x for x in recruiters if x["recruiter_id"] == RECRUITER_ID)
    assert r["classification"] == "CAMPAIGN_COORDINATOR"


def test_campaign_freeze_total(driver):
    det = RecruiterDetector()
    result = det.freeze_campaign(RECRUITER_ID)
    det.close()
    assert result["total_frozen"] == WARM_COUNT + 1
    with driver.session() as s:
        r = s.run("MATCH (a:Account {account_id:$id}) RETURN a.status AS st", id=RECRUITER_ID)
        assert r.single()["st"] == "FROZEN"


# ── Step 5: Pipeline Summary ──────────────────────────────────────────────────

def test_all_decay_hops_correct(driver):
    expected = {HOP1_ID: 80, HOP2_ID: 55, HOP3_ID: 30, HOP4_ID: 15}
    for aid, score in expected.items():
        with driver.session() as s:
            r = s.run("MATCH (a:Account {account_id:$id}) RETURN a.taint_score AS ts", id=aid)
            assert r.single()["ts"] == score


def test_final_risk_score_persisted_to_neo4j(driver):
    with driver.session() as s:
        r = s.run("MATCH (a:Account {account_id:$id}) RETURN a.final_risk_score AS frs", id=HOP1_ID)
        frs = r.single()["frs"]
    assert frs is not None and frs >= 70.0
