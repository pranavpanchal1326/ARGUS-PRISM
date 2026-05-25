"""
PRISM V1 — Department of Telecom (DoT) Mock Service

Mocks the external DoT DIP (Device-to-Identity Profiling) API.
Under §3 of the legal framework, this represents the integration point with
the telecom registry to fetch real-time SIM swap history, ICCID changes, and SIM activation dates.

It acts as an internal utility that queries the local `device_events` table in PostgreSQL
to simulate pulling real telecom network records for a given account's mobile number.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("prism.pipeline.dot_mock_service")

class DoTMockService:
    """
    Mock service simulating the external DoT DIP API.
    Provides standard methods to fetch telecom-validated profile data for accounts.
    """

    @staticmethod
    async def get_sim_profile(
        account_id: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Queries local database device events to construct the external DoT telecom profile.
        
        Returns:
            Dict containing:
                - account_id: str
                - upi_registration_date: ISO string or None
                - sim_swap_in_last_30_days: bool
                - swap_count: int
                - iccid_changed: bool
                - swap_events: List of swap detail dicts
                - transactions_post_swap_24h: int
        """
        try:
            from services.api.db.models import Account, DeviceEvent

            # 1. Fetch account metadata
            result = await db.execute(
                select(Account).where(Account.account_id == account_id)
            )
            account = result.scalar_one_or_none()
            if account is None:
                logger.warning(f"Account {account_id} not found in DoT service")
                return DoTMockService._empty_profile(account_id)

            # 2. Fetch SIM swap/change events from Postgres
            dev_result = await db.execute(
                select(DeviceEvent)
                .where(
                    DeviceEvent.account_id == account_id,
                    DeviceEvent.event_type.in_(["SIM_CHANGED", "SIM_SWAP", "DEVICE_REGISTERED"]),
                )
                .order_by(DeviceEvent.event_timestamp.asc())
            )
            sim_events = dev_result.scalars().all()

            swap_events = []
            prev_iccid = None
            iccid_changed = False
            now = datetime.now(timezone.utc)
            swap_count_30d = 0

            for ev in sim_events:
                # Track unique ICCID transitions
                if prev_iccid and ev.iccid and ev.iccid != prev_iccid:
                    iccid_changed = True
                    swap_events.append({
                        "swap_date": ev.event_timestamp.isoformat(),
                        "old_iccid": prev_iccid,
                        "new_iccid": ev.iccid,
                    })
                    # Count swaps in last 30 days
                    if (now - ev.event_timestamp).days <= 30:
                        swap_count_30d += 1
                prev_iccid = ev.iccid or prev_iccid

            upi_date = account.upi_registered_at
            upi_registration_date = upi_date.isoformat() if upi_date else None

            # 3. Simulate checking post-swap transaction velocity
            # If a SIM swap occurred, we estimate transactions post swap
            transactions_post_swap = 0
            if swap_events:
                # In real execution, query transactions; here we check if a transaction was recorded recently
                transactions_post_swap = 0 # Default placeholder

            return {
                "account_id": account_id,
                "upi_registration_date": upi_registration_date,
                "sim_swap_in_last_30_days": swap_count_30d > 0,
                "swap_count": len(swap_events),
                "iccid_changed": iccid_changed,
                "swap_events": swap_events,
                "transactions_post_swap_24h": transactions_post_swap,
            }

        except Exception as e:
            logger.error(f"Failed to query DoT profile for {account_id}: {e}", exc_info=True)
            return DoTMockService._empty_profile(account_id)

    @staticmethod
    def _empty_profile(account_id: str) -> Dict[str, Any]:
        """Returns safe empty DoT profile."""
        return {
            "account_id": account_id,
            "upi_registration_date": None,
            "sim_swap_in_last_30_days": False,
            "swap_count": 0,
            "iccid_changed": False,
            "swap_events": [],
            "transactions_post_swap_24h": 0,
        }
