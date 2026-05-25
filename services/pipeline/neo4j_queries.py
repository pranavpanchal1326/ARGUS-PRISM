"""
PRISM V1 — Neo4j Query Layer

Centralized Cypher queries for signal extraction.
Each function returns structured data ready for signal module consumption.

All queries are async-compatible and include graceful fallback on connection errors.
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("prism.pipeline.neo4j_queries")


async def get_recent_credits(
    account_id: str,
    neo4j_driver,
    hours: int = 72,
    max_amount: float = 500.0,
) -> List[Dict[str, Any]]:
    """
    S1: Query Neo4j for credits to this account in last N hours
    where amount < max_amount AND source_account has no prior relationship.

    Returns list of transaction dicts with keys:
        transaction_id, amount, direction, timestamp, source_account_id,
        source_account_age_days, source_account_dormant
    """
    try:
        query = """
        MATCH (target:Account {account_id: $account_id})<-[cr:CREDIT]-(source:Account)
        WHERE cr.timestamp > datetime() - duration({hours: $hours})
          AND cr.amount <= $max_amount
          AND cr.amount >= 1.0
        OPTIONAL MATCH (target)-[prior:TRANSACTION]-(source)
        WHERE prior.timestamp < cr.timestamp - duration({hours: 72})
        WITH cr, source, COUNT(prior) AS prior_count
        WHERE prior_count = 0
        RETURN cr.transaction_id AS transaction_id,
               cr.amount AS amount,
               'CREDIT' AS direction,
               cr.timestamp AS timestamp,
               source.account_id AS source_account_id,
               duration.inDays(source.account_opened_at, datetime()).days AS source_account_age_days,
               source.dormancy_days > 90 AS source_account_dormant
        ORDER BY cr.timestamp ASC
        """
        async with neo4j_driver.session() as session:
            result = await session.run(
                query,
                account_id=account_id,
                hours=hours,
                max_amount=max_amount,
            )
            records = [dict(record) for record in await result.data()]
            logger.debug(f"S1 query: {len(records)} credits found for {account_id}")
            return records
    except Exception as e:
        logger.error(f"Neo4j S1 query failed for {account_id}: {e}")
        return []


async def get_device_events(
    account_id: str,
    neo4j_driver,
) -> Dict[str, Any]:
    """
    S2: Query Neo4j for device fingerprint data.

    Returns dict with keys:
        device_events: List of {event_type, imei, iccid, device_model, timestamp_epoch}
        account_created_epoch: int
        blocked_imei_prefixes: List[str]
        shared_imeis: Set[str]  (IMEIs linked to multiple accounts)
    """
    try:
        # Get device events for this account
        event_query = """
        MATCH (a:Account {account_id: $account_id})-[:HAS_DEVICE]->(d:Device)
        OPTIONAL MATCH (d)-[evt:DEVICE_EVENT]->(a)
        RETURN d.imei AS imei,
               d.iccid AS iccid,
               d.device_model AS device_model,
               evt.event_type AS event_type,
               evt.timestamp_epoch AS timestamp_epoch,
               a.account_opened_epoch AS account_created_epoch
        ORDER BY evt.timestamp_epoch ASC
        """

        # Get shared IMEIs (linked to multiple accounts)
        shared_query = """
        MATCH (a:Account {account_id: $account_id})-[:HAS_DEVICE]->(d:Device)
        WITH d
        MATCH (d)<-[:HAS_DEVICE]-(other:Account)
        WHERE other.account_id <> $account_id
        RETURN d.imei AS shared_imei
        """

        # Get blocked IMEI prefixes from registry
        blocked_query = """
        MATCH (b:BlockedIMEIPrefix)
        RETURN b.prefix AS prefix
        LIMIT 100
        """

        async with neo4j_driver.session() as session:
            events_result = await session.run(event_query, account_id=account_id)
            events_data = await events_result.data()

            shared_result = await session.run(shared_query, account_id=account_id)
            shared_data = await shared_result.data()

            blocked_result = await session.run(blocked_query)
            blocked_data = await blocked_result.data()

        device_events = []
        account_created_epoch = 0
        for record in events_data:
            if record.get("account_created_epoch"):
                account_created_epoch = int(record["account_created_epoch"])
            if record.get("event_type"):
                device_events.append({
                    "event_type": record["event_type"],
                    "imei": record.get("imei", ""),
                    "iccid": record.get("iccid", ""),
                    "device_model": record.get("device_model", ""),
                    "timestamp_epoch": int(record.get("timestamp_epoch", 0)),
                })

        shared_imeis = {r["shared_imei"] for r in shared_data if r.get("shared_imei")}
        blocked_prefixes = [r["prefix"] for r in blocked_data if r.get("prefix")]

        return {
            "account_id": account_id,
            "device_events": device_events,
            "account_created_epoch": account_created_epoch,
            "blocked_imei_prefixes": blocked_prefixes,
            "shared_imeis": shared_imeis,
        }
    except Exception as e:
        logger.error(f"Neo4j S2 query failed for {account_id}: {e}")
        return {
            "account_id": account_id,
            "device_events": [],
            "account_created_epoch": 0,
            "blocked_imei_prefixes": [],
            "shared_imeis": set(),
        }


async def get_transaction_velocity(
    account_id: str,
    neo4j_driver,
    hours: int = 72,
) -> Dict[str, Any]:
    """
    S3: Get transaction counts per hour for velocity derivative analysis.

    Returns dict with keys:
        transactions: List of {transaction_id, amount, direction, timestamp_epoch, channel, counterparty_account_id}
        account_created_epoch: int
        observation_window_hours: float
    """
    try:
        query = """
        MATCH (a:Account {account_id: $account_id})
        OPTIONAL MATCH (a)-[tx:TRANSACTION]-()
        WHERE tx.timestamp > datetime() - duration({hours: $hours})
        RETURN a.account_opened_epoch AS account_created_epoch,
               tx.transaction_id AS transaction_id,
               tx.amount AS amount,
               tx.direction AS direction,
               tx.timestamp_epoch AS timestamp_epoch,
               tx.channel AS channel,
               tx.counterparty_account_id AS counterparty_account_id
        ORDER BY tx.timestamp_epoch ASC
        """
        async with neo4j_driver.session() as session:
            result = await session.run(query, account_id=account_id, hours=hours)
            records = await result.data()

        account_created_epoch = 0
        transactions = []
        for record in records:
            if record.get("account_created_epoch"):
                account_created_epoch = int(record["account_created_epoch"])
            if record.get("transaction_id"):
                transactions.append({
                    "transaction_id": record["transaction_id"],
                    "amount": float(record.get("amount", 0.0)),
                    "direction": record.get("direction", "CREDIT"),
                    "timestamp_epoch": int(record.get("timestamp_epoch", 0)),
                    "channel": record.get("channel", "UPI"),
                    "counterparty_account_id": record.get("counterparty_account_id", ""),
                })

        return {
            "account_id": account_id,
            "transactions": transactions,
            "account_created_epoch": account_created_epoch,
            "observation_window_hours": float(hours),
        }
    except Exception as e:
        logger.error(f"Neo4j S3 query failed for {account_id}: {e}")
        return {
            "account_id": account_id,
            "transactions": [],
            "account_created_epoch": 0,
            "observation_window_hours": float(hours),
        }
