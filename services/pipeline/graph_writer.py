"""
ARGUS-PRISM Neo4j Graph Writer
================================
Account node CRUD + Transaction edge creation + Device node writes.
Used by both the Flink pipeline consumer and integration tests.

All writes use MERGE to be idempotent — safe to replay events.
"""

import logging
from datetime import datetime
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

log = logging.getLogger("prism.graph_writer")


class GraphWriter:
    """
    Manages all Neo4j write operations for PRISM.
    Uses connection pooling (default pool size = 50).
    All writes are idempotent via MERGE — safe for event replay.
    """

    def __init__(self, uri: str = NEO4J_URI,
                 user: str = NEO4J_USER,
                 password: str = NEO4J_PASSWORD):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        log.info("GraphWriter connected to %s", uri)

    def close(self):
        self.driver.close()

    def verify_connectivity(self) -> bool:
        try:
            self.driver.verify_connectivity()
            return True
        except ServiceUnavailable:
            return False

    # ── Account node ──────────────────────────────────────────────────────────

    def create_account(self, account: dict):
        """
        MERGE Account node — creates if not exists, updates properties if exists.
        Maps all fields from account_events Avro schema.
        """
        with self.driver.session() as session:
            session.run(
                """
                MERGE (a:Account {account_id: $account_id})
                SET a.name             = $name,
                    a.kyc_status       = $kyc_status,
                    a.kyc_income       = $kyc_income,
                    a.kyc_occupation   = $kyc_occupation,
                    a.account_type     = $account_type,
                    a.branch_code      = $branch_code,
                    a.mobile_number    = $mobile_number,
                    a.warmth_score     = $warmth_score,
                    a.taint_score      = $taint_score,
                    a.status           = $status,
                    a.fri_score        = $fri_score,
                    a.is_mule          = $is_mule,
                    a.campaign_id      = $campaign_id,
                    a.created_at       = datetime({epochMillis: $created_at}),
                    a.last_active      = CASE WHEN $last_active IS NOT NULL
                                             THEN datetime({epochMillis: $last_active})
                                             ELSE null END
                """,
                account_id=account["account_id"],
                name=account.get("name", "Unknown"),
                kyc_status=account.get("kyc_status", "PENDING"),
                kyc_income=account.get("kyc_income"),
                kyc_occupation=account.get("kyc_occupation"),
                account_type=account.get("account_type", "SAVINGS"),
                branch_code=account.get("branch_code", ""),
                mobile_number=account.get("mobile_number", ""),
                warmth_score=float(account.get("warmth_score", 0.0)),
                taint_score=float(account.get("taint_score", 0.0)),
                status=account.get("status", "ACTIVE"),
                fri_score=int(account.get("fri_score", 10)),
                is_mule=bool(account.get("is_mule", False)),
                campaign_id=account.get("campaign_id"),
                created_at=account.get("created_at", 0),
                last_active=account.get("last_active"),
            )

    def update_warmth_score(self, account_id: str, score: float):
        """Real-time WarmthScore update — called by WarmthScore engine."""
        with self.driver.session() as session:
            session.run(
                "MATCH (a:Account {account_id: $id}) SET a.warmth_score = $score",
                id=account_id, score=score
            )

    def update_account_status(self, account_id: str, status: str, reason: str = None):
        """Freeze / restrict account — legal trigger action."""
        with self.driver.session() as session:
            session.run(
                """
                MATCH (a:Account {account_id: $id})
                SET a.status = $status,
                    a.status_reason = $reason,
                    a.status_updated_at = datetime()
                """,
                id=account_id, status=status, reason=reason
            )

    def get_account(self, account_id: str) -> dict:
        with self.driver.session() as session:
            result = session.run(
                "MATCH (a:Account {account_id: $id}) RETURN a",
                id=account_id
            )
            record = result.single()
            return dict(record["a"]) if record else None

    def count_accounts(self) -> int:
        with self.driver.session() as session:
            result = session.run("MATCH (a:Account) RETURN count(a) AS cnt")
            return result.single()["cnt"]

    # ── Transaction edge ──────────────────────────────────────────────────────

    def create_transaction(self, txn: dict):
        """
        CREATE TRANSACTED relationship between two Account nodes.
        Uses MERGE on txn_id to prevent duplicates on replay.
        Falls back gracefully if either account node is missing (logs warning).
        """
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (from:Account {account_id: $from_id})
                MATCH (to:Account   {account_id: $to_id})
                MERGE (from)-[t:TRANSACTED {txn_id: $txn_id}]->(to)
                SET t.amount      = $amount,
                    t.type        = $txn_type,
                    t.channel     = $channel,
                    t.status      = $status,
                    t.pattern_tag = $pattern_tag,
                    t.is_test_credit = $is_test_credit,
                    t.timestamp   = datetime({epochMillis: $timestamp})
                RETURN count(t) AS created
                """,
                from_id=txn.get("from_account"),
                to_id=txn.get("to_account"),
                txn_id=txn.get("txn_id", ""),
                amount=int(txn.get("amount", 0)),
                txn_type=txn.get("txn_type", "CREDIT"),
                channel=txn.get("channel", "UPI"),
                status=txn.get("status", "SUCCESS"),
                pattern_tag=txn.get("pattern_tag"),
                is_test_credit=bool(txn.get("is_test_credit", False)),
                timestamp=int(txn.get("timestamp", 0)),
            )
            record = result.single()
            if not record or record["created"] == 0:
                log.warning(
                    "Transaction %s skipped — account node missing (from=%s to=%s)",
                    txn.get("txn_id"), txn.get("from_account"), txn.get("to_account")
                )

    def count_transactions(self) -> int:
        with self.driver.session() as session:
            result = session.run("MATCH ()-[t:TRANSACTED]->() RETURN count(t) AS cnt")
            return result.single()["cnt"]

    # ── Device node ────────────────────────────────────────────────────────────

    def create_device(self, device: dict):
        """MERGE Device node and link to Account via USES_DEVICE relationship."""
        with self.driver.session() as session:
            session.run(
                """
                MERGE (d:Device {imei: $imei})
                SET d.imei_prefix          = $imei_prefix,
                    d.sim_id               = $sim_id,
                    d.fingerprint          = $fingerprint,
                    d.is_blocked_cluster   = $is_blocked,
                    d.last_seen            = datetime({epochMillis: $last_seen})
                WITH d
                MATCH (a:Account {account_id: $account_id})
                MERGE (a)-[r:USES_DEVICE {event_type: $event_type}]->(d)
                SET r.registered_at = datetime({epochMillis: $timestamp})
                """,
                imei=device.get("imei", ""),
                imei_prefix=device.get("imei_prefix", ""),
                sim_id=device.get("sim_id", ""),
                fingerprint=device.get("fingerprint", ""),
                is_blocked=bool(device.get("is_blocked_imei_cluster", False)),
                last_seen=int(device.get("last_seen", 0)),
                account_id=device.get("account_id", ""),
                event_type=device.get("event_type", "ACCOUNT_LOGIN"),
                timestamp=int(device.get("timestamp", 0)),
            )

    # ── Bulk load ─────────────────────────────────────────────────────────────

    def bulk_create_accounts(self, accounts: list) -> int:
        """Batch MERGE accounts using UNWIND for performance."""
        with self.driver.session() as session:
            session.run(
                """
                UNWIND $accounts AS acc
                MERGE (a:Account {account_id: acc.account_id})
                SET a += {
                    name:           acc.name,
                    kyc_status:     acc.kyc_status,
                    kyc_income:     acc.kyc_income,
                    kyc_occupation: acc.kyc_occupation,
                    account_type:   acc.account_type,
                    branch_code:    acc.branch_code,
                    mobile_number:  acc.mobile_number,
                    warmth_score:   acc.warmth_score,
                    taint_score:    acc.taint_score,
                    status:         acc.status,
                    fri_score:      acc.fri_score,
                    is_mule:        acc.is_mule,
                    campaign_id:    acc.campaign_id
                }
                """,
                accounts=[{
                    "account_id":      a["account_id"],
                    "name":            a.get("name", "Unknown"),
                    "kyc_status":      a.get("kyc_status", "PENDING"),
                    "kyc_income":      a.get("kyc_income"),
                    "kyc_occupation":  a.get("kyc_occupation"),
                    "account_type":    a.get("account_type", "SAVINGS"),
                    "branch_code":     a.get("branch_code", ""),
                    "mobile_number":   a.get("mobile_number", ""),
                    "warmth_score":    float(a.get("warmth_score", 0.0)),
                    "taint_score":     float(a.get("taint_score", 0.0)),
                    "status":          a.get("status", "ACTIVE"),
                    "fri_score":       int(a.get("fri_score", 10)),
                    "is_mule":         bool(a.get("is_mule", False)),
                    "campaign_id":     a.get("campaign_id"),
                } for a in accounts]
            )
        log.info("Bulk created %d account nodes", len(accounts))
        return len(accounts)
