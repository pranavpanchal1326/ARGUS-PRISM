"""
ARGUS-PRISM FlowGraph Detector Tests — Day 3
=============================================
Unit tests for all 5 detectors using synthetic mule data seeded into Neo4j.

Each test:
  1. Seeds Neo4j with specific pattern (layering chain, round-trip, etc.)
  2. Runs the detector
  3. Asserts it fired on the expected accounts

Acceptance criteria (WORKFLOW_ADITYA.md Day 3):
  - Each detector returns results against synthetic mule data       ✅
  - Layering catches 3-hop chains in demo dataset                   ✅
  - Round-trip finds planted cycles in demo accounts                ✅
  - Structuring flags accounts doing sub-₹10L splits                ✅
  - Dormant detects 90d-inactive-then-credit accounts               ✅
  - Profile mismatch flags student accounts with high volume        ✅
  - PS3 requirement = COMPLETE                                      ✅

Run:
    cd src/flowgraph
    python -m pytest tests/test_detectors.py -v
"""

import sys
import os
import time
import pytest
from datetime import datetime, timezone, timedelta
from neo4j import GraphDatabase

# Path setup
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'services', 'pipeline'))

from detectors import (
    LayeringDetector,
    RoundTripDetector,
    StructuringDetector,
    DormantActivationDetector,
    ProfileMismatchDetector,
    FlowAlert,
)

try:
    from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
except ImportError:
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")


# ── Helpers ────────────────────────────────────────────────────────────────────

def now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)

def hours_ago_ms(h: float) -> int:
    return int((datetime.now(timezone.utc) - timedelta(hours=h)).timestamp() * 1000)

def days_ago_ms(d: int) -> int:
    return int((datetime.now(timezone.utc) - timedelta(days=d)).timestamp() * 1000)

def make_account(session, account_id: str, **kwargs):
    defaults = dict(
        name="Test Account",
        kyc_status="VERIFIED",
        kyc_income=300000,
        kyc_occupation="salaried",
        account_type="SAVINGS",
        branch_code="UBI-BR-TEST",
        mobile_number="hash_test",
        warmth_score=0.0,
        taint_score=0.0,
        status="ACTIVE",
        fri_score=10,
        is_mule=False,
        campaign_id=None,
        created_at=days_ago_ms(30),
        last_active=hours_ago_ms(1),
    )
    defaults.update(kwargs)
    defaults["account_id"] = account_id
    session.run(
        """
        MERGE (a:Account {account_id: $account_id})
        SET a += $props
        """,
        account_id=account_id,
        props={k: v for k, v in defaults.items() if k != "account_id"},
    )

def make_txn(session, txn_id: str, from_id: str, to_id: str,
             amount: int, timestamp_ms: int, channel: str = "UPI",
             txn_type: str = "CREDIT"):
    session.run(
        """
        MATCH (f:Account {account_id: $from_id})
        MATCH (t:Account {account_id: $to_id})
        MERGE (f)-[r:TRANSACTED {txn_id: $txn_id}]->(t)
        SET r.amount    = $amount,
            r.type      = $txn_type,
            r.channel   = $channel,
            r.status    = 'SUCCESS',
            r.timestamp = datetime({epochMillis: $ts})
        """,
        txn_id=txn_id, from_id=from_id, to_id=to_id,
        amount=amount, txn_type=txn_type, channel=channel, ts=timestamp_ms,
    )


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def driver():
    drv = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    drv.verify_connectivity()
    yield drv
    drv.close()


# ── Test: Detector 1 — Layering ───────────────────────────────────────────────

class TestLayeringDetector:
    """Layering: 3+ accounts in a chain within 6-hour window."""

    ACCOUNTS = ["LAY-A", "LAY-B", "LAY-C", "LAY-D"]

    @pytest.fixture(autouse=True)
    def seed(self, driver):
        """Seed a 3-hop layering chain with timestamps within last 6 hours."""
        with driver.session() as s:
            for acc_id in self.ACCOUNTS:
                make_account(s, acc_id)
            # Chain: LAY-A → LAY-B → LAY-C → LAY-D (3 hops, within 6hr)
            for i, (src, dst) in enumerate(zip(self.ACCOUNTS, self.ACCOUNTS[1:])):
                make_txn(s, f"LAY-TXN-{i}", src, dst,
                         amount=50_000_000,
                         timestamp_ms=hours_ago_ms(5 - i))

    def test_layering_detected(self, driver):
        detector = LayeringDetector(driver)
        alerts = detector.detect()
        assert len(alerts) >= 1, "Expected at least 1 layering alert"

    def test_layering_alert_contains_chain_accounts(self, driver):
        detector = LayeringDetector(driver)
        alerts = detector.detect()
        all_flagged = {acc for a in alerts for acc in a.account_ids}
        # At least 2 of our planted accounts must appear
        overlap = all_flagged & set(self.ACCOUNTS)
        assert len(overlap) >= 2, (
            f"Expected layering chain accounts in alerts, got: {all_flagged}"
        )

    def test_layering_alert_severity_is_critical(self, driver):
        detector = LayeringDetector(driver)
        alerts = detector.detect()
        assert all(a.severity == "CRITICAL" for a in alerts)

    def test_layering_has_hop_count_in_evidence(self, driver):
        detector = LayeringDetector(driver)
        alerts = detector.detect()
        assert all("hop_count" in a.evidence for a in alerts)


# ── Test: Detector 2 — Round-Trip ─────────────────────────────────────────────

class TestRoundTripDetector:
    """Round-trip: cycle A → B → C → A within 72 hours."""

    ACCOUNTS = ["RT-A", "RT-B", "RT-C"]

    @pytest.fixture(autouse=True)
    def seed(self, driver):
        with driver.session() as s:
            for acc_id in self.ACCOUNTS:
                make_account(s, acc_id)
            # Plant directed cycle: RT-A → RT-B → RT-C → RT-A
            cycle = [("RT-A", "RT-B"), ("RT-B", "RT-C"), ("RT-C", "RT-A")]
            for i, (src, dst) in enumerate(cycle):
                make_txn(s, f"RT-TXN-{i}", src, dst,
                         amount=85_000_000,
                         timestamp_ms=hours_ago_ms(60 - i * 10),
                         channel="IMPS")

    def test_round_trip_detected(self, driver):
        detector = RoundTripDetector(driver)
        alerts = detector.detect()
        assert len(alerts) >= 1, "Expected at least 1 round-trip alert"

    def test_round_trip_origin_is_flagged(self, driver):
        detector = RoundTripDetector(driver)
        alerts = detector.detect()
        all_flagged = {acc for a in alerts for acc in a.account_ids}
        overlap = all_flagged & set(self.ACCOUNTS)
        assert len(overlap) >= 1, (
            f"Expected round-trip participants in alerts, got: {all_flagged}"
        )

    def test_round_trip_evidence_has_total_flow(self, driver):
        detector = RoundTripDetector(driver)
        alerts = detector.detect()
        assert all("total_flow_paise" in a.evidence for a in alerts)


# ── Test: Detector 3 — Structuring ────────────────────────────────────────────

class TestStructuringDetector:
    """Structuring: 4+ transactions just below ₹10L in 24 hours."""

    ACCOUNT = "STR-ACC-001"
    DEST = "STR-DEST-001"

    @pytest.fixture(autouse=True)
    def seed(self, driver):
        with driver.session() as s:
            make_account(s, self.ACCOUNT, kyc_occupation="homemaker", kyc_income=120000)
            make_account(s, self.DEST)
            # Plant 5 transactions at ₹9.5L each within last 24hr
            for i in range(5):
                make_txn(s, f"STR-TXN-{i}", self.ACCOUNT, self.DEST,
                         amount=95_000_000,    # ₹9,50,000 in paise
                         timestamp_ms=hours_ago_ms(20 - i),
                         channel="NEFT")

    def test_structuring_detected(self, driver):
        detector = StructuringDetector(driver)
        alerts = detector.detect()
        flagged_ids = [a.account_ids[0] for a in alerts]
        assert self.ACCOUNT in flagged_ids, (
            f"Expected {self.ACCOUNT} in structuring alerts, got: {flagged_ids}"
        )

    def test_structuring_evidence_has_txn_count(self, driver):
        detector = StructuringDetector(driver)
        alerts = detector.detect()
        our_alerts = [a for a in alerts if self.ACCOUNT in a.account_ids]
        assert len(our_alerts) >= 1
        assert our_alerts[0].evidence["txn_count"] >= 4


# ── Test: Detector 4 — Dormant Activation ────────────────────────────────────

class TestDormantActivationDetector:
    """Dormant activation: account silent 90+ days receives credit."""

    DORMANT_ACCOUNT = "DORM-ACC-001"
    SOURCE_ACCOUNT  = "DORM-SRC-001"

    @pytest.fixture(autouse=True)
    def seed(self, driver):
        with driver.session() as s:
            make_account(s, self.DORMANT_ACCOUNT,
                         kyc_occupation="farmer",
                         last_active=days_ago_ms(200))
            # Override last_active as Neo4j datetime so duration() comparison works
            s.run(
                "MATCH (a:Account {account_id: $id}) "
                "SET a.last_active = datetime() - duration('P200D')",
                id=self.DORMANT_ACCOUNT,
            )
            make_account(s, self.SOURCE_ACCOUNT)
            make_txn(s, "DORM-TXN-001",
                     self.SOURCE_ACCOUNT, self.DORMANT_ACCOUNT,
                     amount=200_000_000,
                     timestamp_ms=hours_ago_ms(12),
                     txn_type="CREDIT")

    def test_dormant_activation_detected(self, driver):
        detector = DormantActivationDetector(driver)
        alerts = detector.detect()
        flagged_ids = [a.account_ids[0] for a in alerts]
        assert self.DORMANT_ACCOUNT in flagged_ids, (
            f"Expected {self.DORMANT_ACCOUNT} in dormant alerts, got: {flagged_ids}"
        )

    def test_dormant_alert_has_dormant_days_in_evidence(self, driver):
        detector = DormantActivationDetector(driver)
        alerts = detector.detect()
        our = [a for a in alerts if self.DORMANT_ACCOUNT in a.account_ids]
        assert len(our) >= 1
        assert our[0].evidence.get("dormant_days", 0) >= 90

    def test_dormant_long_gap_escalates_to_critical(self, driver):
        """180+ days dormancy must escalate to CRITICAL."""
        detector = DormantActivationDetector(driver)
        alerts = detector.detect()
        our = [a for a in alerts if self.DORMANT_ACCOUNT in a.account_ids]
        # Our account is 200 days dormant → should be CRITICAL
        assert our[0].severity == "CRITICAL"


# ── Test: Detector 5 — Profile Mismatch ──────────────────────────────────────

class TestProfileMismatchDetector:
    """Profile mismatch: student/farmer with high-volume transactions."""

    MISMATCH_ACCOUNT = "PROF-ACC-001"
    DEST_ACCOUNT     = "PROF-DEST-001"

    @pytest.fixture(autouse=True)
    def seed(self, driver):
        with driver.session() as s:
            # Student account with very low declared income
            make_account(s, self.MISMATCH_ACCOUNT,
                         kyc_occupation="student",
                         kyc_income=80000)    # ₹80,000/yr declared
            make_account(s, self.DEST_ACCOUNT)
            # Plant 60 transactions with high avg amount in last 30 days
            for i in range(60):
                make_txn(s, f"PROF-TXN-{i}",
                         self.MISMATCH_ACCOUNT, self.DEST_ACCOUNT,
                         amount=80_000_000,   # ₹8,00,000 avg — way above income
                         timestamp_ms=days_ago_ms(i % 29),
                         channel="UPI")

    def test_profile_mismatch_detected(self, driver):
        detector = ProfileMismatchDetector(driver)
        alerts = detector.detect()
        flagged_ids = [a.account_ids[0] for a in alerts]
        assert self.MISMATCH_ACCOUNT in flagged_ids, (
            f"Expected {self.MISMATCH_ACCOUNT} in profile mismatch alerts, "
            f"got: {flagged_ids}"
        )

    def test_profile_mismatch_evidence_contains_kyc_fields(self, driver):
        detector = ProfileMismatchDetector(driver)
        alerts = detector.detect()
        our = [a for a in alerts if self.MISMATCH_ACCOUNT in a.account_ids]
        assert len(our) >= 1
        ev = our[0].evidence
        assert ev.get("kyc_occupation") == "student"
        assert ev.get("txn_freq_30d", 0) >= 50


# ── PS3 Compliance Test ───────────────────────────────────────────────────────

class TestPS3Compliance:
    """Meta-test: all 5 detectors must be importable and runnable."""

    def test_all_five_detectors_are_defined(self, driver):
        from detectors import ALL_DETECTORS
        assert len(ALL_DETECTORS) == 5, (
            f"Expected 5 detectors, found {len(ALL_DETECTORS)}"
        )

    def test_all_detectors_have_name_and_description(self):
        from detectors import ALL_DETECTORS
        from neo4j import GraphDatabase as GDB
        drv = GDB.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        for Cls in ALL_DETECTORS:
            d = Cls(drv)
            assert d.name, f"{Cls.__name__} missing name"
            assert d.description, f"{Cls.__name__} missing description"
            assert d.severity in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
        drv.close()

    def test_all_detectors_runnable_without_crash(self, driver):
        """Every detector must run against live Neo4j without raising."""
        from detectors import ALL_DETECTORS
        for Cls in ALL_DETECTORS:
            detector = Cls(driver)
            try:
                alerts = detector.detect()
                assert isinstance(alerts, list)
            except Exception as e:
                pytest.fail(f"{Cls.__name__}.detect() raised: {e}")
