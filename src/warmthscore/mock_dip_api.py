"""
ARGUS-PRISM Mock DoT DIP API
==============================
Simulates responses from India's Department of Telecommunications (DoT)
Digital Intelligence Platform (DIP) for FRI scores and SIM swap events.

In production: replaced by live REST calls to the DoT DIP API
(access requires RBI/DoT inter-agency agreement under DPDP Act 2023).

FRI = Financial Risk Indicator — 0 to 100 scale assigned by DoT
based on SIM age, KYC quality, and complaint history.

SIM swap events returned as timestamped list (epoch ms).
"""

import hashlib
import random
from datetime import datetime, timezone, timedelta
from typing import Optional

# ── Deterministic mock data keyed on hashed account_id ───────────────────────
# This ensures same account always gets same mock FRI score (reproducible).

_FRI_OVERRIDE: dict[str, int] = {}       # account_id → FRI override for tests
_SIM_SWAP_OVERRIDE: dict[str, list] = {} # account_id → swap event list for tests


def _seed_from_id(account_id: str) -> int:
    """Derive a deterministic seed from account_id for reproducible mocks."""
    return int(hashlib.md5(account_id.encode()).hexdigest()[:8], 16)


class MockDIPClient:
    """
    Simulates the DoT Digital Intelligence Platform API.

    Mule accounts (identified by campaign_id pattern) get:
      - Low FRI scores (2–15) — fresh Tier-3 SIMs
      - SIM swap events just before UPI registration

    Legitimate accounts get:
      - Higher FRI scores (25–85) — established SIMs
      - No or rare SIM swap events
    """

    def get_fri_score(self, account_id: str) -> int:
        """
        Return FRI score (0–100) for an account.
        FRI < 30 = high-risk SIM (new, Tier-3, complaint history).
        """
        if account_id in _FRI_OVERRIDE:
            return _FRI_OVERRIDE[account_id]

        rng = random.Random(_seed_from_id(account_id))

        # Mule pattern: account IDs containing campaign markers get low FRI
        is_mule_pattern = (
            "MULE" in account_id.upper() or
            "C1-" in account_id or "C2-" in account_id or
            "C3-" in account_id or "C4-" in account_id or
            "C5-" in account_id or
            "DORM" in account_id or "STR-" in account_id or
            "RT-" in account_id or "LAY-" in account_id or
            "PROF-" in account_id
        )

        if is_mule_pattern:
            return rng.randint(2, 15)
        return rng.randint(25, 85)

    def get_sim_swap_events(
        self, account_id: str, window_hours: int = 72
    ) -> list[dict]:
        """
        Return list of SIM swap events within the window.
        Each event: {"timestamp_ms": int, "old_sim": str, "new_sim": str}
        """
        if account_id in _SIM_SWAP_OVERRIDE:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=window_hours)
            cutoff_ms = int(cutoff.timestamp() * 1000)
            return [
                e for e in _SIM_SWAP_OVERRIDE[account_id]
                if e["timestamp_ms"] >= cutoff_ms
            ]

        rng = random.Random(_seed_from_id(account_id + "swap"))

        # Mule pattern → plant 2–3 SIM swap events in window
        is_mule_pattern = (
            "MULE" in account_id.upper() or
            "SIM-TEST" in account_id or
            "DORM" in account_id
        )

        if is_mule_pattern and rng.random() < 0.7:
            num_swaps = rng.randint(2, 3)
            now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
            events = []
            for i in range(num_swaps):
                offset_ms = rng.randint(0, window_hours * 3_600_000)
                events.append({
                    "timestamp_ms": now_ms - offset_ms,
                    "old_sim": f"SIM-OLD-{account_id}-{i}",
                    "new_sim": f"SIM-NEW-{account_id}-{i}",
                })
            return sorted(events, key=lambda e: e["timestamp_ms"])

        return []

    def get_upi_registration_timestamp(self, account_id: str) -> Optional[int]:
        """Return UPI registration epoch ms (mocked)."""
        rng = random.Random(_seed_from_id(account_id + "upi"))
        days_ago = rng.randint(1, 10)
        dt = datetime.now(timezone.utc) - timedelta(days=days_ago)
        return int(dt.timestamp() * 1000)


# ── Test override helpers ─────────────────────────────────────────────────────

def override_fri(account_id: str, score: int):
    """Force a specific FRI score for testing."""
    _FRI_OVERRIDE[account_id] = score


def override_sim_swaps(account_id: str, events: list[dict]):
    """Force specific SIM swap events for testing."""
    _SIM_SWAP_OVERRIDE[account_id] = events


def clear_overrides():
    """Reset all test overrides."""
    _FRI_OVERRIDE.clear()
    _SIM_SWAP_OVERRIDE.clear()


# ── Singleton client ──────────────────────────────────────────────────────────

_dip_client: Optional[MockDIPClient] = None


def get_dip_client() -> MockDIPClient:
    global _dip_client
    if _dip_client is None:
        _dip_client = MockDIPClient()
    return _dip_client
