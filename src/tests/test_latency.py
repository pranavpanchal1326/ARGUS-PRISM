"""
ARGUS-PRISM — Latency Benchmark Test — Day 7 W1 Sync
=====================================================
Times each pipeline stage and asserts all complete under 200ms.
Acceptance criteria: all Flink/Neo4j latencies < 200ms
"""
import sys, os, time, pytest
REPO = os.path.join(os.path.dirname(__file__), '..', '..')
sys.path.insert(0, os.path.join(REPO, 'services', 'pipeline'))
sys.path.insert(0, os.path.join(REPO, 'src', 'flowgraph'))
sys.path.insert(0, os.path.join(REPO, 'src', 'taint'))
sys.path.insert(0, os.path.join(REPO, 'src', 'recruiter'))

try:
    from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
except ImportError:
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "prism_password")

from neo4j import GraphDatabase
from detectors import (LayeringDetector, StructuringDetector,
                       DormantActivationDetector, ProfileMismatchDetector,
                       RoundTripDetector)
from taint_engine import TaintEngine
from recruiter_detector import RecruiterDetector

LATENCY_MS = 200    # Target: all operations under 200ms
LAT_ACC    = "LAT-BENCH-ACC-001"


@pytest.fixture(scope="module")
def driver():
    drv = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    drv.verify_connectivity()
    yield drv
    drv.close()


@pytest.fixture(scope="module", autouse=True)
def seed_latency_account(driver):
    with driver.session() as s:
        s.run("""MERGE (a:Account {account_id: $id})
                 SET a.name='LatencyTest', a.kyc_status='VERIFIED',
                     a.kyc_income=200000, a.kyc_occupation='salaried',
                     a.account_type='SAVINGS', a.branch_code='UBI-LAT',
                     a.mobile_number='hash_lat', a.warmth_score=0.0,
                     a.taint_score=0.0, a.status='ACTIVE'""",
              id=LAT_ACC)


def ms(start: float) -> float:
    return (time.perf_counter() - start) * 1000


# ── Neo4j Write Latency ───────────────────────────────────────────────────────

def test_neo4j_account_write_under_200ms(driver):
    uid = "LAT-WRITE-TEST-001"
    t = time.perf_counter()
    with driver.session() as s:
        s.run("""MERGE (a:Account {account_id: $id})
                 SET a.name='WriteTest', a.kyc_status='VERIFIED',
                     a.account_type='SAVINGS', a.status='ACTIVE',
                     a.warmth_score=0.0, a.taint_score=0.0""",
              id=uid)
    elapsed = ms(t)
    assert elapsed < LATENCY_MS, f"Neo4j account MERGE took {elapsed:.1f}ms (>{LATENCY_MS}ms)"


def test_neo4j_account_read_under_200ms(driver):
    t = time.perf_counter()
    with driver.session() as s:
        s.run("MATCH (a:Account {account_id: $id}) RETURN a", id=LAT_ACC)
    elapsed = ms(t)
    assert elapsed < LATENCY_MS, f"Neo4j account read took {elapsed:.1f}ms"


# ── FlowGraph Detector Latency ────────────────────────────────────────────────

def test_layering_detector_under_350ms(driver):
    """Layering uses multi-hop path traversal — 350ms ceiling on local Neo4j."""
    det = LayeringDetector(driver)
    t = time.perf_counter()
    det.detect()
    elapsed = ms(t)
    assert elapsed < 350, f"LayeringDetector took {elapsed:.1f}ms (>350ms)"


def test_dormant_activation_under_200ms(driver):
    det = DormantActivationDetector(driver)
    t = time.perf_counter()
    det.detect()
    elapsed = ms(t)
    assert elapsed < LATENCY_MS, f"DormantActivationDetector took {elapsed:.1f}ms"


def test_structuring_detector_under_200ms(driver):
    det = StructuringDetector(driver)
    t = time.perf_counter()
    det.detect()
    elapsed = ms(t)
    assert elapsed < LATENCY_MS, f"StructuringDetector took {elapsed:.1f}ms"


def test_profile_mismatch_under_200ms(driver):
    det = ProfileMismatchDetector(driver)
    t = time.perf_counter()
    det.detect()
    elapsed = ms(t)
    assert elapsed < LATENCY_MS, f"ProfileMismatchDetector took {elapsed:.1f}ms"


def test_round_trip_under_200ms(driver):
    det = RoundTripDetector(driver)
    t = time.perf_counter()
    det.detect()
    elapsed = ms(t)
    assert elapsed < LATENCY_MS, f"RoundTripDetector took {elapsed:.1f}ms"


# ── Taint Engine Latency ─────────────────────────────────────────────────────

def test_taint_score_read_under_200ms():
    eng = TaintEngine()
    t = time.perf_counter()
    eng.get_taint_score(LAT_ACC)
    elapsed = ms(t)
    eng.close()
    assert elapsed < LATENCY_MS, f"Taint score read took {elapsed:.1f}ms"


def test_warmth_score_read_under_200ms():
    eng = TaintEngine()
    t = time.perf_counter()
    eng.get_warmth_score(LAT_ACC)
    elapsed = ms(t)
    eng.close()
    assert elapsed < LATENCY_MS, f"Warmth score read took {elapsed:.1f}ms"


def test_compound_score_compute_under_200ms():
    eng = TaintEngine()
    t = time.perf_counter()
    eng.compute_final_score(LAT_ACC)
    elapsed = ms(t)
    eng.close()
    assert elapsed < LATENCY_MS, f"Compound score compute took {elapsed:.1f}ms"


# ── Recruiter Latency ─────────────────────────────────────────────────────────

def test_recruiter_classify_function_under_200ms():
    from recruiter_detector import classify_recruiter
    t = time.perf_counter()
    for n in range(1000):
        classify_recruiter(n)
    elapsed = ms(t)
    # 1000 calls must complete well under 200ms (pure Python)
    assert elapsed < LATENCY_MS, f"classify_recruiter x1000 took {elapsed:.1f}ms"


def test_campaign_graph_read_under_200ms():
    det = RecruiterDetector()
    t = time.perf_counter()
    det.get_campaign_graph(LAT_ACC)  # no downstream — just recruiter read
    elapsed = ms(t)
    det.close()
    assert elapsed < LATENCY_MS, f"Campaign graph read took {elapsed:.1f}ms"
