"""
ARGUS-PRISM WarmthScore Signal Tests — Day 4
=============================================
Unit tests for Signals 4, 5, 6.

Acceptance criteria (WORKFLOW_ADITYA.md Day 4):
  - Signal 4 returns score > 0.5 for dormant accounts with device changes  ✅
  - Signal 5 detects contradiction when FRI < 30 but internal warmth > 60  ✅
  - Signal 6 flags accounts with 2+ SIM swaps in 72hr                      ✅
  - Neo4j Account nodes have warmth_score property updated in real-time     ✅

Run:
    cd src/warmthscore
    python -m pytest tests/test_signals.py -v
"""

import sys
import os
import time
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from neo4j import GraphDatabase

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'services', 'pipeline'))

import mock_dip_api as dip_module
from mock_dip_api import override_fri, override_sim_swaps, clear_overrides, get_dip_client
from signals import (
    signal_4_dormant_device_change,
    signal_5_fri_contradiction,
    signal_6_sim_swap_velocity,
    compute_warmth_contribution,
    get_partial_warmth,
    SIGNAL_WEIGHTS,
)
from warmth_engine import WarmthNeo4jWriter, score_account, WARMTH_KYC_HOLD_THRESHOLD, WARMTH_FREEZE_THRESHOLD

try:
    from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
except ImportError:
    NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")


# ── Helpers ────────────────────────────────────────────────────────────────────

def now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)

def hours_ago_ms(h: float) -> int:
    return int((datetime.now(timezone.utc) - timedelta(hours=h)).timestamp() * 1000)


def seed_account(session, account_id: str, **props):
    base = dict(
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
    )
    base.update(props)
    session.run(
        "MERGE (a:Account {account_id: $id}) SET a += $props",
        id=account_id, props=base,
    )


def seed_device(session, account_id: str, imei: str,
                event_type: str = "UPI_DEVICE_REGISTERED"):
    session.run(
        """
        MERGE (d:Device {imei: $imei})
        SET d.imei_prefix = $prefix, d.last_seen = datetime()
        WITH d
        MATCH (a:Account {account_id: $acc_id})
        MERGE (a)-[r:USES_DEVICE {event_type: $evt}]->(d)
        SET r.registered_at = datetime()
        """,
        imei=imei, prefix=imei[:8], acc_id=account_id, evt=event_type,
    )


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def driver():
    drv = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    drv.verify_connectivity()
    yield drv
    drv.close()


@pytest.fixture(autouse=True)
def reset_dip_overrides():
    clear_overrides()
    yield
    clear_overrides()


# ── Signal 4 Tests ─────────────────────────────────────────────────────────────

class TestSignal4DormantDeviceChange:
    """Signal 4: Dormant Reactivation + Device Change."""

    ACCOUNT = "S4-TEST-DORMANT-001"

    @pytest.fixture(autouse=True)
    def seed(self, driver):
        with driver.session() as s:
            seed_account(s, self.ACCOUNT, kyc_occupation="farmer")
            # Set last_active = 150 days ago (Neo4j datetime for duration comparison)
            s.run(
                "MATCH (a:Account {account_id: $id}) "
                "SET a.last_active = datetime() - duration('P150D')",
                id=self.ACCOUNT,
            )
            # Two device events = device change on reactivation
            seed_device(s, self.ACCOUNT, "IMEI-S4-OLD-001",
                        event_type="UPI_DEVICE_REGISTERED")
            seed_device(s, self.ACCOUNT, "IMEI-S4-NEW-002",
                        event_type="UPI_DEVICE_CHANGED")

    def test_signal_4_triggers_for_dormant_with_device_change(self):
        """Acceptance: Signal 4 returns > 0.5 for dormant account with device change."""
        score = signal_4_dormant_device_change(self.ACCOUNT)
        assert score > 0.5, (
            f"Expected Signal 4 > 0.5 for 150-day dormant account, got {score:.3f}"
        )

    def test_signal_4_score_formula(self):
        """Score = min(1.0, dormant_days/180 + 0.3) → for 150d: 150/180+0.3 = 1.133 → capped 1.0."""
        score = signal_4_dormant_device_change(self.ACCOUNT)
        # 150 days: 150/180 + 0.3 = 1.133 → capped at 1.0
        assert 0.9 <= score <= 1.0, f"Score out of expected range: {score}"

    def test_signal_4_returns_zero_for_active_account(self, driver):
        """Signal 4 must NOT fire for recently active accounts."""
        acc_id = "S4-ACTIVE-CONTROL"
        with driver.session() as s:
            seed_account(s, acc_id)
            # last_active = 5 days ago (not dormant)
            s.run(
                "MATCH (a:Account {account_id: $id}) "
                "SET a.last_active = datetime() - duration('P5D')",
                id=acc_id,
            )
        score = signal_4_dormant_device_change(acc_id)
        assert score == 0.0, f"Signal 4 should not fire for active account, got {score}"

    def test_signal_4_returns_zero_without_device_change(self, driver):
        """Signal 4 must NOT fire if device hasn't changed (only one device)."""
        acc_id = "S4-NODVC-CONTROL"
        with driver.session() as s:
            seed_account(s, acc_id)
            s.run(
                "MATCH (a:Account {account_id: $id}) "
                "SET a.last_active = datetime() - duration('P150D')",
                id=acc_id,
            )
            # Only ONE device — no change
            seed_device(s, acc_id, "IMEI-S4-SINGLE-001",
                        event_type="UPI_DEVICE_REGISTERED")
        score = signal_4_dormant_device_change(acc_id)
        assert score == 0.0, (
            f"Signal 4 must not fire without device change, got {score}"
        )


# ── Signal 5 Tests ─────────────────────────────────────────────────────────────

class TestSignal5FRIContradiction:
    """Signal 5: FRI Contradiction — FRI < 30 but warmth > 60."""

    ACCOUNT = "S5-TEST-FRI-001"

    @pytest.fixture(autouse=True)
    def seed(self, driver):
        with driver.session() as s:
            seed_account(s, self.ACCOUNT,
                         warmth_score=65.0,   # Already flagged by other signals
                         kyc_occupation="student")

    def test_signal_5_triggers_on_contradiction(self):
        """Acceptance: Signal 5 returns 0.85 when FRI < 30 AND warmth > 60."""
        override_fri(self.ACCOUNT, 12)   # Force FRI = 12 (low risk on paper)
        # warmth_score=65 seeded in Neo4j
        score = signal_5_fri_contradiction(self.ACCOUNT)
        assert score == 0.85, (
            f"Expected 0.85 for FRI=12, warmth=65, got {score}"
        )

    def test_signal_5_does_not_trigger_high_fri(self):
        """Signal 5 must NOT fire when FRI >= 30."""
        override_fri(self.ACCOUNT, 55)   # High FRI — legitimate SIM
        score = signal_5_fri_contradiction(self.ACCOUNT)
        assert score == 0.0, (
            f"Signal 5 must not fire for high FRI, got {score}"
        )

    def test_signal_5_does_not_trigger_low_warmth(self, driver):
        """Signal 5 must NOT fire when warmth <= 60 (no internal evidence yet)."""
        acc_id = "S5-LOW-WARMTH-CTRL"
        with driver.session() as s:
            seed_account(s, acc_id, warmth_score=10.0)
        override_fri(acc_id, 8)   # Very low FRI but warmth also low
        score = signal_5_fri_contradiction(acc_id)
        assert score == 0.0, (
            f"Signal 5 must not fire when warmth <= 60, got {score}"
        )

    def test_signal_5_score_is_fixed_085(self):
        """Score must always be 0.85 when triggered (per workflow spec)."""
        override_fri(self.ACCOUNT, 5)
        score = signal_5_fri_contradiction(self.ACCOUNT)
        assert score == 0.85


# ── Signal 6 Tests ─────────────────────────────────────────────────────────────

class TestSignal6SIMSwapVelocity:
    """Signal 6: SIM Swap Velocity — 2+ SIM swaps in 72hr."""

    ACCOUNT = "S6-TEST-SIMSWAP-001"

    def test_signal_6_triggers_with_two_swaps(self):
        """Acceptance: Signal 6 flags accounts with 2+ SIM swaps in 72hr."""
        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        override_sim_swaps(self.ACCOUNT, [
            {"timestamp_ms": hours_ago_ms(10), "old_sim": "SIM-A", "new_sim": "SIM-B"},
            {"timestamp_ms": hours_ago_ms(5),  "old_sim": "SIM-B", "new_sim": "SIM-C"},
        ])
        score = signal_6_sim_swap_velocity(self.ACCOUNT)
        assert score > 0.0, "Expected Signal 6 to fire for 2 swaps"
        assert score >= 0.70, f"Expected >= 0.70 for 2 swaps, got {score}"

    def test_signal_6_formula(self):
        """Score = min(1.0, num_swaps * 0.35) — 2 swaps → 0.70."""
        override_sim_swaps(self.ACCOUNT, [
            {"timestamp_ms": hours_ago_ms(10), "old_sim": "SIM-A", "new_sim": "SIM-B"},
            {"timestamp_ms": hours_ago_ms(5),  "old_sim": "SIM-B", "new_sim": "SIM-C"},
        ])
        score = signal_6_sim_swap_velocity(self.ACCOUNT)
        assert abs(score - 0.70) < 0.001, f"Expected 0.70 for 2 swaps, got {score}"

    def test_signal_6_three_swaps_capped_at_1(self):
        """3 swaps → 0.35*3=1.05 → capped at 1.0."""
        override_sim_swaps(self.ACCOUNT, [
            {"timestamp_ms": hours_ago_ms(30), "old_sim": "S1", "new_sim": "S2"},
            {"timestamp_ms": hours_ago_ms(20), "old_sim": "S2", "new_sim": "S3"},
            {"timestamp_ms": hours_ago_ms(10), "old_sim": "S3", "new_sim": "S4"},
        ])
        score = signal_6_sim_swap_velocity(self.ACCOUNT)
        assert score == 1.0, f"Expected 1.0 for 3 swaps (capped), got {score}"

    def test_signal_6_does_not_trigger_one_swap(self):
        """Signal 6 must NOT fire for a single SIM swap."""
        override_sim_swaps(self.ACCOUNT, [
            {"timestamp_ms": hours_ago_ms(10), "old_sim": "SIM-A", "new_sim": "SIM-B"},
        ])
        score = signal_6_sim_swap_velocity(self.ACCOUNT)
        assert score == 0.0, f"Signal 6 must not fire for 1 swap, got {score}"

    def test_signal_6_ignores_old_swaps_outside_window(self):
        """Swaps older than 72hr must NOT count."""
        override_sim_swaps(self.ACCOUNT, [
            {"timestamp_ms": hours_ago_ms(100), "old_sim": "SIM-A", "new_sim": "SIM-B"},
            {"timestamp_ms": hours_ago_ms(90),  "old_sim": "SIM-B", "new_sim": "SIM-C"},
        ])
        score = signal_6_sim_swap_velocity(self.ACCOUNT)
        assert score == 0.0, (
            f"Signal 6 must ignore swaps > 72hr old, got {score}"
        )


# ── Neo4j WarmthScore Write Tests ─────────────────────────────────────────────

class TestWarmthNeo4jWriter:
    """Verify warmth_score property is written to Neo4j Account nodes."""

    ACCOUNT = "WARMTH-WRITE-TEST-001"

    @pytest.fixture(autouse=True)
    def seed(self, driver):
        with driver.session() as s:
            seed_account(s, self.ACCOUNT, warmth_score=0.0)

    def test_write_warmth_score_persists_to_neo4j(self, driver):
        """Acceptance: Neo4j Account nodes have warmth_score updated in real-time."""
        writer = WarmthNeo4jWriter()
        try:
            new_score = writer.write_warmth_score(
                self.ACCOUNT, 45.0, ["signal_4", "signal_6"]
            )
            assert new_score == 45.0, f"Expected 45.0, got {new_score}"

            # Verify directly in Neo4j
            with driver.session() as s:
                result = s.run(
                    "MATCH (a:Account {account_id: $id}) RETURN a.warmth_score AS ws",
                    id=self.ACCOUNT
                )
                record = result.single()
                assert record is not None
                assert abs(float(record["ws"]) - 45.0) < 0.01
        finally:
            writer.close()

    def test_warmth_score_accumulates(self):
        """Multiple score writes accumulate — they do not overwrite."""
        writer = WarmthNeo4jWriter()
        try:
            writer.write_warmth_score(self.ACCOUNT, 20.0, ["signal_4"])
            new_score = writer.write_warmth_score(self.ACCOUNT, 25.0, ["signal_6"])
            assert new_score == 45.0, f"Expected accumulated 45.0, got {new_score}"
        finally:
            writer.close()

    def test_warmth_score_capped_at_100(self):
        """WarmthScore must never exceed 100."""
        writer = WarmthNeo4jWriter()
        try:
            writer.write_warmth_score(self.ACCOUNT, 80.0, ["signal_4"])
            new_score = writer.write_warmth_score(self.ACCOUNT, 50.0, ["signal_5"])
            assert new_score == 100.0, f"Score should be capped at 100, got {new_score}"
        finally:
            writer.close()

    def test_kyc_hold_triggered_at_60(self, driver):
        """KYC hold action triggered when warmth reaches 60."""
        writer = WarmthNeo4jWriter()
        try:
            writer.trigger_kyc_action(self.ACCOUNT, 65.0)
            with driver.session() as s:
                result = s.run(
                    "MATCH (a:Account {account_id: $id}) "
                    "RETURN a.status AS status, a.kyc_status AS kyc",
                    id=self.ACCOUNT
                )
                record = result.single()
                assert record["status"] == "KYC_HOLD"
                assert record["kyc"] == "RE_VERIFICATION_REQUIRED"
        finally:
            writer.close()

    def test_freeze_triggered_at_80(self, driver):
        """Account freeze triggered when warmth reaches 80."""
        writer = WarmthNeo4jWriter()
        try:
            writer.trigger_kyc_action(self.ACCOUNT, 82.0)
            with driver.session() as s:
                result = s.run(
                    "MATCH (a:Account {account_id: $id}) RETURN a.status AS status",
                    id=self.ACCOUNT
                )
                assert result.single()["status"] == "FROZEN"
        finally:
            writer.close()


# ── Combined Scoring Test ──────────────────────────────────────────────────────

class TestCombinedScoring:
    """Verify all 3 signals combine correctly into WarmthScore contribution."""

    def test_mule_account_exceeds_60_warmth(self, driver):
        """
        A mule account triggering all 3 signals must reach 60+ contribution.
        Max possible from signals 4+5+6: 25+30+20 = 75 warmth points.
        """
        acc_id = "COMBINED-MULE-TEST-001"
        with driver.session() as s:
            seed_account(s, acc_id, warmth_score=65.0, kyc_occupation="farmer")
            s.run(
                "MATCH (a:Account {account_id: $id}) "
                "SET a.last_active = datetime() - duration('P200D')",
                id=acc_id
            )
            seed_device(s, acc_id, "IMEI-CMB-OLD-001", "UPI_DEVICE_REGISTERED")
            seed_device(s, acc_id, "IMEI-CMB-NEW-002", "UPI_DEVICE_CHANGED")

        override_fri(acc_id, 8)
        override_sim_swaps(acc_id, [
            {"timestamp_ms": hours_ago_ms(10), "old_sim": "S1", "new_sim": "S2"},
            {"timestamp_ms": hours_ago_ms(5),  "old_sim": "S2", "new_sim": "S3"},
        ])

        result = compute_warmth_contribution(acc_id)
        assert result["signals_456_contribution"] >= 60.0, (
            f"Combined mule signals should produce >= 60 contribution, "
            f"got {result['signals_456_contribution']}"
        )
        assert len(result["signals_fired"]) == 3, (
            f"All 3 signals should fire, got: {result['signals_fired']}"
        )
