"""
ARGUS-PRISM Taint Propagation Integration Tests — Day 5
=========================================================
Seeds a 4-hop transaction chain into Neo4j, confirms the leaf as a mule,
then verifies that taint propagates exactly to each upstream node with
the correct decay score.

Acceptance criteria (WORKFLOW_ADITYA.md Day 5):
  - Confirming a mule taints exactly 4 hops upstream              ✅
  - Taint scores match decay: 80 → 55 → 30 → 15                  ✅
  - Compound score correctly combines taint + warmth               ✅
  - Taint persists in Neo4j (verified by re-reading after write)  ✅

Run:
    cd src/taint
    python -m pytest tests/test_taint.py -v
"""

import sys
import os
import pytest
from datetime import datetime, timezone, timedelta
from neo4j import GraphDatabase

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'services', 'pipeline'))

from taint_engine import TaintEngine, TAINT_DECAY, MAX_HOPS

try:
    from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
except ImportError:
    NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")


# ── Helpers ────────────────────────────────────────────────────────────────────

def hours_ago_ms(h: float) -> int:
    return int((datetime.now(timezone.utc) - timedelta(hours=h)).timestamp() * 1000)


def seed_account(session, account_id: str, **props):
    base = dict(
        name="Taint Test Account",
        kyc_status="VERIFIED",
        kyc_income=300000,
        kyc_occupation="salaried",
        account_type="SAVINGS",
        branch_code="UBI-TAINT-TEST",
        mobile_number="hash_taint",
        warmth_score=0.0,
        taint_score=0.0,
        status="ACTIVE",
        is_mule=False,
    )
    base.update(props)
    session.run(
        "MERGE (a:Account {account_id: $id}) SET a += $props",
        id=account_id, props=base,
    )


def seed_txn(session, src: str, dst: str, txn_id: str, amount: int = 50_000_000):
    session.run(
        """
        MATCH (s:Account {account_id: $src})
        MATCH (d:Account {account_id: $dst})
        MERGE (s)-[r:TRANSACTED {txn_id: $txn_id}]->(d)
        SET r.amount    = $amount,
            r.type      = 'CREDIT',
            r.channel   = 'IMPS',
            r.status    = 'SUCCESS',
            r.timestamp = datetime()
        """,
        src=src, dst=dst, txn_id=txn_id, amount=amount,
    )


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def driver():
    drv = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    drv.verify_connectivity()
    yield drv
    drv.close()


@pytest.fixture(scope="module")
def engine():
    eng = TaintEngine()
    yield eng
    eng.close()


# ── Chain setup ───────────────────────────────────────────────────────────────
#
# Transaction chain (funds flow right → left, taint propagates left → right):
#
#  HOP4         HOP3         HOP2         HOP1         MULE
#  T-UP4   →   T-UP3   →   T-UP2   →   T-UP1   →   T-MULE
#  taint=15    taint=30    taint=55    taint=80    taint=100

MULE_ID = "TAINT-MULE-001"
HOP1_ID = "TAINT-UP1-001"
HOP2_ID = "TAINT-UP2-001"
HOP3_ID = "TAINT-UP3-001"
HOP4_ID = "TAINT-UP4-001"
CHAIN   = [HOP4_ID, HOP3_ID, HOP2_ID, HOP1_ID, MULE_ID]


@pytest.fixture(scope="module", autouse=True)
def seed_chain(driver):
    """Seed the 4-hop transaction chain and run taint propagation once."""
    with driver.session() as s:
        for acc_id in CHAIN:
            seed_account(s, acc_id)
        # Seed transactions: each account sends to the next in chain
        for i in range(len(CHAIN) - 1):
            seed_txn(s, CHAIN[i], CHAIN[i + 1],
                     txn_id=f"TAINT-TXN-{i}",
                     amount=80_000_000)


@pytest.fixture(scope="module")
def propagation_result(engine):
    """Run propagate_taint once and cache result for all tests in module."""
    return engine.propagate_taint(MULE_ID)


# ── Test: 4-hop back-trace ────────────────────────────────────────────────────

class TestTaintBacktrace:
    """Verify taint propagates correctly to all 4 upstream hops."""

    def test_propagation_returns_four_upstream_accounts(self, propagation_result):
        """Acceptance: propagation must reach exactly 4 upstream accounts."""
        assert len(propagation_result) == 4, (
            f"Expected 4 upstream accounts, got {len(propagation_result)}: "
            f"{[r['account_id'] for r in propagation_result]}"
        )

    def test_hop1_taint_score_is_80(self, driver, propagation_result):
        """Hop 1 = taint score 80 (direct funder of mule)."""
        with driver.session() as s:
            result = s.run(
                "MATCH (a:Account {account_id: $id}) RETURN a.taint_score AS ts",
                id=HOP1_ID
            )
            ts = result.single()["ts"]
        assert ts == 80, f"Expected hop-1 taint=80, got {ts}"

    def test_hop2_taint_score_is_55(self, driver):
        """Hop 2 = taint score 55."""
        with driver.session() as s:
            result = s.run(
                "MATCH (a:Account {account_id: $id}) RETURN a.taint_score AS ts",
                id=HOP2_ID
            )
            ts = result.single()["ts"]
        assert ts == 55, f"Expected hop-2 taint=55, got {ts}"

    def test_hop3_taint_score_is_30(self, driver):
        """Hop 3 = taint score 30."""
        with driver.session() as s:
            result = s.run(
                "MATCH (a:Account {account_id: $id}) RETURN a.taint_score AS ts",
                id=HOP3_ID
            )
            ts = result.single()["ts"]
        assert ts == 30, f"Expected hop-3 taint=30, got {ts}"

    def test_hop4_taint_score_is_15(self, driver):
        """Hop 4 = taint score 15."""
        with driver.session() as s:
            result = s.run(
                "MATCH (a:Account {account_id: $id}) RETURN a.taint_score AS ts",
                id=HOP4_ID
            )
            ts = result.single()["ts"]
        assert ts == 15, f"Expected hop-4 taint=15, got {ts}"

    def test_mule_taint_is_100(self, driver):
        """Mule itself must have taint_score=100 after confirmation."""
        with driver.session() as s:
            result = s.run(
                "MATCH (a:Account {account_id: $id}) RETURN a.taint_score AS ts",
                id=MULE_ID
            )
            ts = result.single()["ts"]
        assert ts == 100, f"Expected mule taint=100, got {ts}"

    def test_mule_status_is_frozen(self, driver):
        """Mule account must be FROZEN after confirmation."""
        with driver.session() as s:
            result = s.run(
                "MATCH (a:Account {account_id: $id}) RETURN a.status AS st",
                id=MULE_ID
            )
            st = result.single()["st"]
        assert st == "FROZEN", f"Expected mule status=FROZEN, got {st}"

    def test_decay_scores_match_taint_decay_constant(self, propagation_result):
        """All taint scores in result must match TAINT_DECAY mapping."""
        for record in propagation_result:
            expected = TAINT_DECAY[record["hop_distance"]]
            assert record["taint_score"] == expected, (
                f"Hop {record['hop_distance']}: expected {expected}, "
                f"got {record['taint_score']}"
            )

    def test_taint_persists_in_neo4j_after_re_read(self, engine):
        """Acceptance: taint persists in Neo4j (survives re-read)."""
        # Re-read each hop score using the engine method
        assert engine.get_taint_score(HOP1_ID) == 80
        assert engine.get_taint_score(HOP2_ID) == 55
        assert engine.get_taint_score(HOP3_ID) == 30
        assert engine.get_taint_score(HOP4_ID) == 15


# ── Test: Compound Scoring ─────────────────────────────────────────────────────

class TestCompoundScoring:
    """Verify compound score = taint * 0.6 + warmth * 0.4."""

    def test_compound_score_formula_pure_taint(self, driver, engine):
        """Account with taint=80, warmth=0 → final = 48.0."""
        acc_id = "COMP-SCORE-TEST-001"
        with driver.session() as s:
            seed_account(s, acc_id, taint_score=80.0, warmth_score=0.0)

        result = engine.compute_final_score(acc_id)
        assert abs(result["final_risk_score"] - 48.0) < 0.01, (
            f"Expected 48.0, got {result['final_risk_score']}"
        )

    def test_compound_score_formula_mixed(self, driver, engine):
        """Account with taint=55, warmth=30 → final = 55*0.6 + 30*0.4 = 45.0."""
        acc_id = "COMP-SCORE-TEST-002"
        with driver.session() as s:
            seed_account(s, acc_id, taint_score=55.0, warmth_score=30.0)

        result = engine.compute_final_score(acc_id)
        expected = 55 * 0.6 + 30 * 0.4  # = 45.0
        assert abs(result["final_risk_score"] - expected) < 0.01, (
            f"Expected {expected}, got {result['final_risk_score']}"
        )

    def test_compound_score_capped_at_100(self, driver, engine):
        """Max score capped at 100 even when components are maxed."""
        acc_id = "COMP-SCORE-CAP-001"
        with driver.session() as s:
            seed_account(s, acc_id, taint_score=100.0, warmth_score=100.0)

        result = engine.compute_final_score(acc_id)
        assert result["final_risk_score"] == 100.0

    def test_compound_score_zero_for_clean_account(self, driver, engine):
        """Clean account with no taint or warmth → final = 0.0."""
        acc_id = "COMP-SCORE-CLEAN-001"
        with driver.session() as s:
            seed_account(s, acc_id, taint_score=0.0, warmth_score=0.0)

        result = engine.compute_final_score(acc_id)
        assert result["final_risk_score"] == 0.0

    def test_risk_level_critical_above_80(self, driver, engine):
        """Score >= 80 → CRITICAL risk level."""
        acc_id = "RISK-LEVEL-CRIT-001"
        with driver.session() as s:
            seed_account(s, acc_id, taint_score=100.0, warmth_score=80.0)
        result = engine.compute_final_score(acc_id)
        assert result["risk_level"] == "CRITICAL"

    def test_risk_level_high_60_to_80(self, driver, engine):
        """Score 60–79 → HIGH risk level."""
        acc_id = "RISK-LEVEL-HIGH-001"
        with driver.session() as s:
            seed_account(s, acc_id, taint_score=80.0, warmth_score=50.0)
        result = engine.compute_final_score(acc_id)
        assert result["risk_level"] == "HIGH"

    def test_compound_score_written_to_neo4j(self, driver, engine):
        """Acceptance: final_risk_score persists to Neo4j after compute."""
        acc_id = "COMP-PERSIST-001"
        with driver.session() as s:
            seed_account(s, acc_id, taint_score=80.0, warmth_score=40.0)

        result = engine.compute_final_score(acc_id)
        expected = round(80 * 0.6 + 40 * 0.4, 2)   # 64.0

        with driver.session() as s:
            row = s.run(
                "MATCH (a:Account {account_id: $id}) "
                "RETURN a.final_risk_score AS frs",
                id=acc_id
            ).single()
            assert abs(float(row["frs"]) - expected) < 0.01, (
                f"Expected {expected} in Neo4j, got {row['frs']}"
            )


# ── Test: TAINT_DECAY Constant ────────────────────────────────────────────────

class TestTaintDecayConstants:
    """Verify the TAINT_DECAY mapping is correct per workflow spec."""

    def test_decay_has_exactly_four_hops(self):
        assert len(TAINT_DECAY) == 4

    def test_hop_1_is_80(self):
        assert TAINT_DECAY[1] == 80

    def test_hop_2_is_55(self):
        assert TAINT_DECAY[2] == 55

    def test_hop_3_is_30(self):
        assert TAINT_DECAY[3] == 30

    def test_hop_4_is_15(self):
        assert TAINT_DECAY[4] == 15

    def test_max_hops_is_4(self):
        assert MAX_HOPS == 4
