"""
ARGUS-PRISM Recruiter Unit Tests — Day 6
==========================================
Seeds 3 synthetic recruiter campaigns in Neo4j, then verifies:
  - Detection fires for accounts with 5+ downstream in 48hr
  - Classification tiers are correct (Coordinator/Orchestrator/Platform)
  - Campaign freeze sets FROZEN on recruiter + all downstream
  - Campaign graph returns correct subgraph

Acceptance criteria (WORKFLOW_ADITYA.md Day 6):
  - Recruiter detected when source sends to 5+ accounts in 48hr  ✅
  - Classification labels coordinator / orchestrator / platform   ✅
  - Campaign freeze flags recruiter + all downstream as FROZEN    ✅
  - API returns full campaign graph with node classifications      ✅

Run:
    cd src/recruiter
    python -m pytest tests/test_recruiter.py -v
"""

import sys
import os
import pytest
from datetime import datetime, timezone, timedelta
from neo4j import GraphDatabase

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'services', 'pipeline'))

from recruiter_detector import (
    RecruiterDetector,
    classify_recruiter,
    COORDINATOR_MIN,
    ORCHESTRATOR_MIN,
    PLATFORM_MIN,
    WARMING_AMOUNT_MAX,
    DETECTION_WINDOW_HOURS,
)

try:
    from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
except ImportError:
    NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")


# ── Helpers ────────────────────────────────────────────────────────────────────

def seed_account(session, account_id: str, **props):
    base = dict(
        name="Recruiter Test Account",
        kyc_status="VERIFIED",
        kyc_income=200000,
        kyc_occupation="farmer",
        account_type="SAVINGS",
        branch_code="UBI-REC-TEST",
        mobile_number="hash_recruiter",
        warmth_score=0.0,
        taint_score=0.0,
        status="ACTIVE",
        is_mule=False,
        is_recruiter=False,
    )
    base.update(props)
    session.run(
        "MERGE (a:Account {account_id: $id}) SET a += $props",
        id=account_id, props=base,
    )


def seed_warming_txn(session, src: str, dst: str, txn_id: str,
                     amount: int = 2000, hours_ago: float = 12):
    """Seed a small warming transaction within the 48hr window."""
    session.run(
        """
        MATCH (s:Account {account_id: $src})
        MATCH (d:Account {account_id: $dst})
        MERGE (s)-[r:TRANSACTED {txn_id: $txn_id}]->(d)
        SET r.amount    = $amount,
            r.type      = 'CREDIT',
            r.channel   = 'UPI',
            r.status    = 'SUCCESS',
            r.timestamp = datetime() - duration($ago)
        """,
        src=src, dst=dst, txn_id=txn_id,
        amount=amount, ago=f"PT{hours_ago}H",
    )


# ── Campaign seeds ─────────────────────────────────────────────────────────────
#
# REC-COORD  → 7  warming accounts  (CAMPAIGN_COORDINATOR)
# REC-ORCH   → 15 warming accounts  (INDUSTRIAL_ORCHESTRATOR)
# REC-PLAT   → 28 warming accounts  (PLATFORM_SCALE)

COORD_RECRUITER = "REC-COORD-001"
ORCH_RECRUITER  = "REC-ORCH-001"
PLAT_RECRUITER  = "REC-PLAT-001"

COORD_COUNT = 7
ORCH_COUNT  = 15
PLAT_COUNT  = 28


@pytest.fixture(scope="module")
def driver():
    drv = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    drv.verify_connectivity()
    yield drv
    drv.close()


@pytest.fixture(scope="module")
def detector():
    det = RecruiterDetector()
    yield det
    det.close()


@pytest.fixture(scope="module", autouse=True)
def seed_campaigns(driver):
    """Seed all three recruiter campaigns once for the whole module."""
    with driver.session() as s:
        # Seed all recruiters
        for rid in [COORD_RECRUITER, ORCH_RECRUITER, PLAT_RECRUITER]:
            seed_account(s, rid, warmth_score=25.0)

        # Coordinator campaign: 7 downstream
        for i in range(COORD_COUNT):
            tid = f"REC-COORD-TARGET-{i:03d}"
            seed_account(s, tid)
            seed_warming_txn(s, COORD_RECRUITER, tid,
                             txn_id=f"TXN-COORD-{i}", amount=1500)

        # Orchestrator campaign: 15 downstream
        for i in range(ORCH_COUNT):
            tid = f"REC-ORCH-TARGET-{i:03d}"
            seed_account(s, tid)
            seed_warming_txn(s, ORCH_RECRUITER, tid,
                             txn_id=f"TXN-ORCH-{i}", amount=3000)

        # Platform-scale campaign: 28 downstream
        for i in range(PLAT_COUNT):
            tid = f"REC-PLAT-TARGET-{i:03d}"
            seed_account(s, tid)
            seed_warming_txn(s, PLAT_RECRUITER, tid,
                             txn_id=f"TXN-PLAT-{i}", amount=4500)


# ── Test: classify_recruiter() ────────────────────────────────────────────────

class TestClassifyRecruiter:
    """Verify classification tier logic is correct per workflow spec."""

    def test_below_threshold_is_not_recruiter(self):
        assert classify_recruiter(4) == "NOT_A_RECRUITER"

    def test_exactly_5_is_coordinator(self):
        assert classify_recruiter(5) == "CAMPAIGN_COORDINATOR"

    def test_10_is_coordinator(self):
        assert classify_recruiter(10) == "CAMPAIGN_COORDINATOR"

    def test_11_is_orchestrator(self):
        assert classify_recruiter(11) == "INDUSTRIAL_ORCHESTRATOR"

    def test_25_is_orchestrator(self):
        assert classify_recruiter(25) == "INDUSTRIAL_ORCHESTRATOR"

    def test_26_is_platform_scale(self):
        assert classify_recruiter(26) == "PLATFORM_SCALE"

    def test_100_is_platform_scale(self):
        assert classify_recruiter(100) == "PLATFORM_SCALE"


# ── Test: Recruiter Detection ─────────────────────────────────────────────────

class TestRecruiterDetection:
    """Verify recruiters are correctly detected from Neo4j."""

    @pytest.fixture(scope="class")
    def all_recruiters(self, detector):
        return detector.detect_recruiters()

    def _find(self, recruiters, rid):
        return next((r for r in recruiters if r["recruiter_id"] == rid), None)

    def test_detects_coordinator_recruiter(self, all_recruiters):
        """Acceptance: Recruiter detected when source sends to 5+ accounts in 48hr."""
        r = self._find(all_recruiters, COORD_RECRUITER)
        assert r is not None, f"{COORD_RECRUITER} should be detected"

    def test_coordinator_classification(self, all_recruiters):
        """Acceptance: classification correctly labels coordinator."""
        r = self._find(all_recruiters, COORD_RECRUITER)
        assert r["classification"] == "CAMPAIGN_COORDINATOR", (
            f"Expected CAMPAIGN_COORDINATOR, got {r['classification']}"
        )

    def test_coordinator_downstream_count(self, all_recruiters):
        r = self._find(all_recruiters, COORD_RECRUITER)
        assert r["downstream_count"] == COORD_COUNT, (
            f"Expected {COORD_COUNT}, got {r['downstream_count']}"
        )

    def test_detects_orchestrator_recruiter(self, all_recruiters):
        r = self._find(all_recruiters, ORCH_RECRUITER)
        assert r is not None, f"{ORCH_RECRUITER} should be detected"

    def test_orchestrator_classification(self, all_recruiters):
        r = self._find(all_recruiters, ORCH_RECRUITER)
        assert r["classification"] == "INDUSTRIAL_ORCHESTRATOR"

    def test_orchestrator_downstream_count(self, all_recruiters):
        r = self._find(all_recruiters, ORCH_RECRUITER)
        assert r["downstream_count"] == ORCH_COUNT

    def test_detects_platform_scale_recruiter(self, all_recruiters):
        r = self._find(all_recruiters, PLAT_RECRUITER)
        assert r is not None, f"{PLAT_RECRUITER} should be detected"

    def test_platform_scale_classification(self, all_recruiters):
        r = self._find(all_recruiters, PLAT_RECRUITER)
        assert r["classification"] == "PLATFORM_SCALE"

    def test_platform_scale_downstream_count(self, all_recruiters):
        r = self._find(all_recruiters, PLAT_RECRUITER)
        assert r["downstream_count"] == PLAT_COUNT

    def test_no_false_positive_for_legitimate_account(self, driver, detector):
        """Account sending to <5 accounts must NOT be detected as recruiter."""
        legit_id = "REC-LEGIT-CTRL-001"
        with driver.session() as s:
            seed_account(s, legit_id)
            for i in range(3):  # Only 3 downstream — below threshold
                tid = f"REC-LEGIT-TARGET-{i}"
                seed_account(s, tid)
                seed_warming_txn(s, legit_id, tid,
                                 txn_id=f"TXN-LEGIT-{i}", amount=2000)

        recruiters = detector.detect_recruiters()
        ids = [r["recruiter_id"] for r in recruiters]
        assert legit_id not in ids, (
            f"Legitimate account with 3 downstream should not be detected"
        )


# ── Test: Campaign Graph ───────────────────────────────────────────────────────

class TestCampaignGraph:
    """Verify get_campaign_graph returns correct subgraph."""

    def test_campaign_graph_has_correct_downstream_count(self, detector):
        graph = detector.get_campaign_graph(COORD_RECRUITER)
        assert graph["downstream_count"] == COORD_COUNT

    def test_campaign_graph_has_recruiter_node(self, detector):
        graph = detector.get_campaign_graph(COORD_RECRUITER)
        assert graph["recruiter"]["account_id"] == COORD_RECRUITER

    def test_campaign_graph_has_classification(self, detector):
        graph = detector.get_campaign_graph(COORD_RECRUITER)
        assert graph["classification"] == "CAMPAIGN_COORDINATOR"

    def test_campaign_graph_has_edges(self, detector):
        graph = detector.get_campaign_graph(COORD_RECRUITER)
        assert len(graph["downstream_accounts"]) == COORD_COUNT

    def test_campaign_graph_edge_amounts_below_threshold(self, detector):
        graph = detector.get_campaign_graph(COORD_RECRUITER)
        for edge in graph["downstream_accounts"]:
            assert edge["amount"] < WARMING_AMOUNT_MAX, (
                f"Edge amount {edge['amount']} exceeds warming threshold"
            )

    def test_campaign_graph_unknown_recruiter_returns_error(self, detector):
        graph = detector.get_campaign_graph("REC-NONEXISTENT-999")
        assert "error" in graph


# ── Test: Campaign Freeze ─────────────────────────────────────────────────────

class TestCampaignFreeze:
    """Verify one-click campaign freeze freezes recruiter + all downstream."""

    @pytest.fixture(scope="class")
    def freeze_result(self, detector):
        """Run freeze on ORCH_RECRUITER once."""
        return detector.freeze_campaign(ORCH_RECRUITER)

    def test_freeze_returns_recruiter_frozen_true(self, freeze_result):
        assert freeze_result["recruiter_frozen"] is True

    def test_freeze_downstream_count_matches_seeded(self, freeze_result):
        """Acceptance: campaign freeze flags recruiter + all downstream as FROZEN."""
        assert freeze_result["downstream_count"] == ORCH_COUNT, (
            f"Expected {ORCH_COUNT} frozen downstream, "
            f"got {freeze_result['downstream_count']}"
        )

    def test_freeze_total_count_includes_recruiter(self, freeze_result):
        assert freeze_result["total_frozen"] == ORCH_COUNT + 1

    def test_recruiter_status_frozen_in_neo4j(self, driver):
        with driver.session() as s:
            result = s.run(
                "MATCH (a:Account {account_id: $id}) RETURN a.status AS st",
                id=ORCH_RECRUITER
            )
            assert result.single()["st"] == "FROZEN"

    def test_recruiter_frozen_reason_correct(self, driver):
        with driver.session() as s:
            result = s.run(
                "MATCH (a:Account {account_id: $id}) "
                "RETURN a.frozen_reason AS fr",
                id=ORCH_RECRUITER
            )
            assert result.single()["fr"] == "RECRUITER"

    def test_downstream_accounts_frozen_in_neo4j(self, driver):
        """Verify at least 10 downstream accounts are FROZEN in Neo4j."""
        with driver.session() as s:
            result = s.run(
                """
                MATCH (a:Account)
                WHERE a.frozen_reason = 'CAMPAIGN_CONNECTED'
                  AND a.recruiter_id = $rid
                RETURN count(a) AS cnt
                """,
                rid=ORCH_RECRUITER
            )
            cnt = result.single()["cnt"]
        assert cnt == ORCH_COUNT, (
            f"Expected {ORCH_COUNT} downstream FROZEN, got {cnt}"
        )

    def test_audit_event_written_to_neo4j(self, driver):
        """Freeze must write AuditEvent node to Neo4j."""
        with driver.session() as s:
            result = s.run(
                """
                MATCH (audit:AuditEvent {action: 'CAMPAIGN_FREEZE', target: $rid})
                RETURN count(audit) AS cnt
                """,
                rid=ORCH_RECRUITER
            )
            cnt = result.single()["cnt"]
        assert cnt >= 1, "Expected AuditEvent node written to Neo4j"
