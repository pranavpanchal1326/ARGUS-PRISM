"""
PRISM V1 — PostgreSQL Query Layer

Centralized PostgreSQL queries for signal extraction (S4, S5).
All queries use SQLAlchemy async sessions.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("prism.pipeline.pg_queries")


async def get_account_metadata(
    account_id: str,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    S4/S5: Get account metadata from PostgreSQL for dormancy and FRI analysis.

    Returns dict with keys needed by S4 (DormantReactivation) and S5 (FRI):
        account_id, last_transaction_date, reactivation_date,
        last_session_device_id, current_device_id,
        last_session_imei_prefix, current_imei_prefix,
        first_reactivation_amount, last_kyc_date,
        historical_channels, current_channel,
        account_opened_at, dormancy_days
    """
    try:
        from services.api.db.models import Account, DeviceEvent

        # Get account
        result = await db.execute(
            select(Account).where(Account.account_id == account_id)
        )
        account = result.scalar_one_or_none()

        if account is None:
            logger.warning(f"Account {account_id} not found in PostgreSQL")
            return _empty_account_metadata(account_id)

        # Get device events for this account (ordered by timestamp)
        dev_result = await db.execute(
            select(DeviceEvent)
            .where(DeviceEvent.account_id == account_id)
            .order_by(DeviceEvent.event_timestamp.asc())
        )
        device_events = dev_result.scalars().all()

        # Extract device history
        last_device_id = None
        current_device_id = None
        last_imei_prefix = None
        current_imei_prefix = None

        if device_events:
            if len(device_events) >= 2:
                last_device_id = device_events[-2].imei
                last_imei_prefix = device_events[-2].imei[:8] if device_events[-2].imei else None
            current_device_id = device_events[-1].imei
            current_imei_prefix = device_events[-1].imei[:8] if device_events[-1].imei else None

        # Build historical channels from device events
        historical_channels = list({
            ev.event_type for ev in device_events[:-1]
        }) if len(device_events) > 1 else []
        current_channel = device_events[-1].event_type if device_events else "UPI"

        # Determine reactivation date (last transaction or now)
        reactivation_date = datetime.now(timezone.utc).isoformat()
        last_tx_date = account.last_transaction_at.isoformat() if account.last_transaction_at else None

        return {
            "account_id": account_id,
            "last_transaction_date": last_tx_date,
            "reactivation_date": reactivation_date,
            "last_session_device_id": last_device_id,
            "current_device_id": current_device_id,
            "last_session_imei_prefix": last_imei_prefix,
            "current_imei_prefix": current_imei_prefix,
            "first_reactivation_amount": 0.0,  # Will be populated by simulator events
            "last_kyc_date": None,  # KYC date not stored separately; use account_opened_at
            "historical_channels": historical_channels,
            "current_channel": current_channel,
            "account_opened_at": account.account_opened_at.isoformat() if account.account_opened_at else None,
            "dormancy_days": account.dormancy_days or 0,
            "kyc_status": account.kyc_status,
            "account_status": account.account_status,
        }
    except Exception as e:
        logger.error(f"PG account metadata query failed for {account_id}: {e}")
        return _empty_account_metadata(account_id)


async def get_fri_data(
    account_id: str,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    S5: Get FRI (Financial Risk Indicator) data for contradiction analysis.

    In production, FRI comes from DoT DIP API. Here we derive it from
    account metadata. FRI tier 1 = low risk, tier 4 = high risk.

    Returns dict with keys:
        account_id, fri_tier, sim_activation_date, complaint_count
    """
    try:
        from services.api.db.models import Account, DeviceEvent

        result = await db.execute(
            select(Account).where(Account.account_id == account_id)
        )
        account = result.scalar_one_or_none()

        if account is None:
            return {
                "account_id": account_id,
                "fri_tier": 1,  # Default: low risk (no data = unknown)
                "sim_activation_date": datetime.now(timezone.utc).isoformat(),
                "complaint_count": 0,
            }

        # Derive FRI tier from account status
        # In production this comes from DoT DIP API
        status = account.account_status or "ACTIVE"
        if status in ("RESTRICTED", "FROZEN"):
            fri_tier = 4
        elif status == "KYC_FLAGGED":
            fri_tier = 3
        elif status == "MONITORING":
            fri_tier = 2
        else:
            fri_tier = 1  # ACTIVE = low external risk (potential contradiction)

        # SIM activation date: use UPI registration date as proxy
        sim_date = account.upi_registered_at or account.account_opened_at
        sim_activation_date = sim_date.isoformat() if sim_date else datetime.now(timezone.utc).isoformat()

        return {
            "account_id": account_id,
            "fri_tier": fri_tier,
            "sim_activation_date": sim_activation_date,
            "complaint_count": 0,  # Would come from complaint system
        }
    except Exception as e:
        logger.error(f"PG FRI query failed for {account_id}: {e}")
        return {
            "account_id": account_id,
            "fri_tier": 1,
            "sim_activation_date": datetime.now(timezone.utc).isoformat(),
            "complaint_count": 0,
        }


async def get_sim_swap_data(
    account_id: str,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    S6: Get SIM swap event data for velocity analysis.

    Delegates to DoTMockService which simulates the telecom registry profiling
    under the legal framework mandate.
    """
    try:
        from services.pipeline.dot_mock_service import DoTMockService
        return await DoTMockService.get_sim_profile(account_id, db)
    except Exception as e:
        logger.error(f"PG SIM swap query failed for {account_id}: {e}")
        return _empty_sim_swap_data(account_id)


def _empty_account_metadata(account_id: str) -> Dict[str, Any]:
    """Returns a safe empty metadata dict that won't crash signal modules."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "account_id": account_id,
        "last_transaction_date": now,
        "reactivation_date": now,
        "last_session_device_id": None,
        "current_device_id": None,
        "last_session_imei_prefix": None,
        "current_imei_prefix": None,
        "first_reactivation_amount": 0.0,
        "last_kyc_date": None,
        "historical_channels": [],
        "current_channel": "UPI",
        "account_opened_at": now,
        "dormancy_days": 0,
        "kyc_status": "COMPLETE",
        "account_status": "ACTIVE",
    }


def _empty_sim_swap_data(account_id: str) -> Dict[str, Any]:
    """Returns safe empty SIM swap data."""
    return {
        "account_id": account_id,
        "upi_registration_date": None,
        "swap_events": [],
        "transactions_post_swap_24h": 0,
    }
