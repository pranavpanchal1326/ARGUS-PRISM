"""
ARGUS-PRISM Live Demo Simulator
================================
Runs continuously to simulate a live mule detection environment.
Works both locally and on Railway deployment.
Never floods the database; keeps dashboard populated with fresh data.
"""

import os
import sys
import json
import time
import uuid
import random
import logging
import signal
import threading
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, List

# Get config from parent module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import TOPICS

from confluent_kafka import Producer, KafkaException

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", os.getenv("KAFKA_BOOTSTRAP", "localhost:9092"))
POSTGRES_DSN = os.getenv("DATABASE_URL", "postgresql://prism_user:prism_password@localhost:5432/prism_db")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "prism_password")

# Warming scenario timing (compressed 72hr into 5 minutes = 300 seconds total)
STAGE_DURATIONS = {
    "COLD": 60,        # 0-60 seconds: score 20-30
    "WARMING": 60,     # 60-120 seconds: score 40-55
    "HOT": 60,         # 120-180 seconds: score 65-72
    "CRITICAL": 60,    # 180-240 seconds: score 80-88
    "CONFIRMED": 60,   # 240-300 seconds: score 88-95
}

# Known suspicious IMEI prefix (used for device clustering)
SUSPICIOUS_IMEI_PREFIX = "24942603"

# ──────────────────────────────────────────────────────────────────────────────
# Logging Setup
# ──────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger("prism.simulator")


def format_time(t: float) -> str:
    """Format timestamp as HH:MM:SS"""
    return time.strftime("%H:%M:%S", time.localtime(t))


# ──────────────────────────────────────────────────────────────────────────────
# Kafka Producer
# ──────────────────────────────────────────────────────────────────────────────

class KafkaPublisher:
    """Wrapper around confluent_kafka.Producer with retry logic."""

    def __init__(self, bootstrap_servers: str = KAFKA_BOOTSTRAP):
        self.bootstrap = bootstrap_servers
        self.producer = None
        self._connect()

    def _connect(self):
        """Initialize or re-initialize Kafka producer."""
        config = {
            "bootstrap.servers": self.bootstrap,
            "acks": "all",
            "retries": 3,
            "linger.ms": 5,
        }
        self.producer = Producer(config)
        log.info("Kafka producer connected to %s", self.bootstrap)

    def _retry_on_failure(self, func, *args, **kwargs):
        """Retry function on Kafka failure with backoff."""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                return func(*args, **kwargs)
            except KafkaException as e:
                if attempt < max_retries - 1:
                    log.warning("Kafka operation failed, retrying... (%d/%d)", attempt + 1, max_retries)
                    time.sleep(2)
                    self._connect()
                else:
                    raise

    def publish(self, topic: str, key: str, payload: dict) -> bool:
        """Publish event to Kafka topic."""
        try:
            self.producer.produce(
                topic=topic,
                key=key.encode("utf-8") if isinstance(key, str) else key,
                value=json.dumps(payload, default=str).encode("utf-8"),
                callback=lambda err, msg: None,
            )
            self.producer.poll(0)
            return True
        except KafkaException as e:
            log.error("Failed to publish to %s: %s", topic, e)
            return False

    def flush(self):
        """Flush all pending messages."""
        try:
            self.producer.flush()
        except Exception as e:
            log.warning("Flush error: %s", e)


# ──────────────────────────────────────────────────────────────────────────────
# PostgreSQL Client (Direct Connection)
# ──────────────────────────────────────────────────────────────────────────────

class PostgresClient:
    """Simplified PostgreSQL client for cleanup operations."""

    def __init__(self, dsn: str = POSTGRES_DSN):
        self.dsn = dsn
        self._conn = None
        self._connected = False

    def _connect(self):
        """Connect to PostgreSQL using psycopg2."""
        try:
            import psycopg2
            self._conn = psycopg2.connect(self.dsn)
            self._connected = True
            log.info("PostgreSQL connected")
        except Exception as e:
            self._connected = False
            log.warning("PostgreSQL connection failed: %s", e)

    def execute(self, query: str, params: tuple = None):
        """Execute query and return results."""
        if not self._connected:
            self._connect()
        if not self._connected:
            return None
        try:
            with self._conn.cursor() as cur:
                cur.execute(query, params)
                if query.strip().upper().startswith("SELECT"):
                    return cur.fetchall()
                self._conn.commit()
                return cur.rowcount if cur.rowcount is not None else 0
        except Exception as e:
            log.warning("PostgreSQL query failed: %s", e)
            self._connected = False
            return 0 if not query.strip().upper().startswith("SELECT") else None

    def close(self):
        """Close connection."""
        if self._conn:
            self._conn.close()
            self._connected = False


# ──────────────────────────────────────────────────────────────────────────────
# Neo4j Client (Direct Connection)
# ──────────────────────────────────────────────────────────────────────────────

class Neo4jClient:
    """Simplified Neo4j client for cleanup operations."""

    def __init__(self, uri: str = NEO4J_URI, user: str = NEO4J_USER, password: str = NEO4J_PASSWORD):
        self.uri = uri
        self.user = user
        self.password = password
        self._driver = None
        self._connected = False

    def _connect(self):
        """Connect to Neo4j."""
        try:
            from neo4j import GraphDatabase
            self._driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self._driver.verify_connectivity()
            self._connected = True
            log.info("Neo4j connected to %s", self.uri)
        except Exception as e:
            self._connected = False
            log.warning("Neo4j connection failed: %s", e)

    def execute(self, query: str, parameters: dict = None):
        """Execute Cypher query."""
        if not self._connected:
            self._connect()
        if not self._connected:
            return None
        try:
            with self._driver.session() as session:
                result = session.run(query, parameters or {})
                # For cleanup queries, we want to return the count if possible
                # If it's a DELETE query, it might not return anything unless we explicitly RETURN
                # We call .data() or similar to get the records before the session closes
                return list(result)
        except Exception as e:
            log.warning("Neo4j query failed: %s", e)
            self._connected = False
            return None

    def close(self):
        """Close connection."""
        if self._driver:
            self._driver.close()
            self._connected = False


# ──────────────────────────────────────────────────────────────────────────────
# Account State Management
# ──────────────────────────────────────────────────────────────────────────────

class LiveAccount:
    """Represents a live account being warmed through the simulation."""

    def __init__(self, account_id: str, created_at: float):
        self.account_id = account_id
        self.created_at = created_at
        self.stage = "COLD"
        self.stage_start = created_at
        self.cumulative_seconds = 0  # Total time spent across all stages
        self.warmth_score = 25.0
        self.risk_level = "LOW"
        self.name = f"Live User {account_id[-4:]}"
        self.kyc_occupation = "freelancer"
        self.mobile_number = f"9{random.randint(100000000, 999999999)}"

    def get_stage_index(self) -> int:
        """Return index for current stage (0=COLD, 4=CONFIRMED)."""
        stages = ["COLD", "WARMING", "HOT", "CRITICAL", "CONFIRMED"]
        return stages.index(self.stage) if self.stage in stages else 0

    def get_stage_duration(self) -> int:
        """Get duration of current stage in seconds."""
        return STAGE_DURATIONS.get(self.stage, 60)

    def update(self, now: float) -> Optional[dict]:
        """
        Update account state. Returns escalation info if stage changed.
        Returns None if no escalation needed.
        """
        # Track total elapsed seconds across all stages
        self.cumulative_seconds += (now - self.stage_start)
        self.stage_start = now

        # Determine target stage and score based on cumulative elapsed time
        if self.cumulative_seconds < 60:
            target_stage = "COLD"
            self.warmth_score = 20 + (50 * (self.cumulative_seconds / 60))  # 20-30
            self.risk_level = "LOW"
        elif self.cumulative_seconds < 120:
            target_stage = "WARMING"
            self.warmth_score = 40 + (15 * ((self.cumulative_seconds - 60) / 60))  # 40-55
            self.risk_level = "MEDIUM"
        elif self.cumulative_seconds < 180:
            target_stage = "HOT"
            self.warmth_score = 65 + (7 * ((self.cumulative_seconds - 120) / 60))  # 65-72
            self.risk_level = "HIGH"
        elif self.cumulative_seconds < 240:
            target_stage = "CRITICAL"
            self.warmth_score = 80 + (8 * ((self.cumulative_seconds - 180) / 60))  # 80-88
            self.risk_level = "CRITICAL"
        else:
            target_stage = "CONFIRMED"
            self.warmth_score = 88 + (7 * ((self.cumulative_seconds - 240) / 60))  # 88-95
            self.risk_level = "CRITICAL"

        # Check for stage change
        if target_stage != self.stage:
            old_stage = self.stage
            self.stage = target_stage
            return {
                "old_stage": old_stage,
                "new_stage": target_stage,
                "score": self.warmth_score,
            }
        return None


# ──────────────────────────────────────────────────────────────────────────────
# Main Simulator
# ──────────────────────────────────────────────────────────────────────────────

class LiveSimulator:
    """Main simulator class orchestrating all components."""

    def __init__(self):
        self.account_id_counter = 0
        self.accounts: Dict[str, LiveAccount] = {}
        self.known_suspicious_accounts: List[str] = []
        self.known_recruiter_accounts: List[str] = []
        self.triggers_fired: Dict[str, set] = {}  # Track fired triggers per account
        self.last_cleanup = 0
        self.running = True

        # Initialize Kafka producer
        self.kafka = KafkaPublisher(KAFKA_BOOTSTRAP)

        # Initialize database clients (will connect on first use)
        self.pg = PostgresClient()
        self.neo4j = Neo4jClient()

        # Seed data
        self.seed_data: Dict = {}

    def _load_seed_data(self):
        """Load seed data from JSON files."""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = None
        for _ in range(4):
            candidate = os.path.join(current_dir, "data", "synthetic_demo")
            if os.path.isdir(candidate):
                data_dir = candidate
                break
            current_dir = os.path.dirname(current_dir)
        
        if not data_dir:
            data_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                "data", "synthetic_demo"
            )
        log.info("Resolved seed data directory to: %s", data_dir)
        self.seed_data = {
            "accounts": [],
            "transactions": [],
            "device_events": [],
            "kyc_events": [],
        }

        try:
            with open(os.path.join(data_dir, "accounts.json")) as f:
                self.seed_data["accounts"] = json.load(f)
        except Exception as e:
            log.warning("Failed to load accounts.json: %s", e)

        try:
            with open(os.path.join(data_dir, "transactions.json")) as f:
                self.seed_data["transactions"] = json.load(f)
        except Exception as e:
            log.warning("Failed to load transactions.json: %s", e)

        try:
            with open(os.path.join(data_dir, "device_events.json")) as f:
                self.seed_data["device_events"] = json.load(f)
        except Exception as e:
            log.warning("Failed to load device_events.json: %s", e)

        try:
            with open(os.path.join(data_dir, "kyc_events.json")) as f:
                self.seed_data["kyc_events"] = json.load(f)
        except Exception as e:
            log.warning("Failed to load kyc_events.json: %s", e)

    def _get_timestamp(self) -> float:
        """Get current timestamp in epoch milliseconds."""
        return time.time() * 1000

    def _generate_account_id(self) -> str:
        """Generate a new LIVE-XXXX account ID."""
        self.account_id_counter += 1
        return f"LIVE-{random.randint(1000, 9999)}"

    def _get_existing_account_id(self) -> Optional[str]:
        """Get a random existing account for transactions."""
        if self.accounts:
            return random.choice(list(self.accounts.keys()))
        return None

    def _get_existing_suspicious_account(self) -> Optional[str]:
        """Get a known suspicious account for device clustering."""
        if self.known_suspicious_accounts:
            return random.choice(self.known_suspicious_accounts)
        return None

    def _get_existing_recruiter_account(self) -> Optional[str]:
        """Get a known recruiter account for link creation."""
        if self.known_recruiter_accounts:
            return random.choice(self.known_recruiter_accounts)
        return None

    # ────────────────────────────────────────────────────────────────────────
    # Event Publishing Methods
    # ────────────────────────────────────────────────────────────────────────

    def _insert_warmth_score(self, account_id: str, score: float, risk_level: str, stage: str, timestamp=None):
        """Insert high-fidelity timeline records realistically distributed with SHAP signal attributions."""
        # Stage-based highly realistic signal vectors and SHAP signal impacts
        # S1: Test Credit, S2: Blocked IMEI Proximity, S3: Velocity, S4: Dormancy/Age, S5: FRI Contradiction, S6: SIM Swap
        s1, s2, s3, s4, s5, s6 = 0.05, 0.05, 0.05, 0.05, 0.05, 0.05
        
        if stage == "COLD":
            s1 = random.uniform(0.05, 0.15)
            s4 = random.uniform(0.1, 0.2)
        elif stage == "WARMING":
            # S1 (Test Credit) and S2 (Device Fingerprint) go high (0.3 - 0.6)
            s1 = random.uniform(0.3, 0.6)
            s2 = random.uniform(0.3, 0.6)
            s4 = random.uniform(0.1, 0.25)
        elif stage == "HOT":
            # S3 (Velocity) and S6 (SIM Swap) go high (0.4 - 0.8)
            s1 = random.uniform(0.3, 0.5)
            s2 = random.uniform(0.3, 0.5)
            s3 = random.uniform(0.4, 0.8)
            s6 = random.uniform(0.4, 0.8)
        elif stage in ("CRITICAL", "CONFIRMED"):
            # S5 (FRI Contradiction) and structuring go high (0.7 - 0.95)
            s1 = random.uniform(0.4, 0.6)
            s2 = random.uniform(0.4, 0.6)
            s3 = random.uniform(0.6, 0.85)
            s5 = random.uniform(0.7, 0.95)
            s6 = random.uniform(0.5, 0.85)

        # Sort the contributions to get SHAP top 3
        signals = [
            ("S1", s1), ("S2", s2), ("S3", s3), ("S4", s4), ("S5", s5), ("S6", s6)
        ]
        sorted_signals = sorted(signals, key=lambda x: abs(x[1]), reverse=True)
        
        # Convert timestamp to datetime if provided, else use current time
        computed_at = timestamp if timestamp else datetime.now(timezone.utc)
        
        try:
            self.pg.execute(
                """
                INSERT INTO warmth_scores (
                    account_id, warmth_score, risk_level,
                    signal_1_score, signal_2_score, signal_3_score,
                    signal_4_score, signal_5_score, signal_6_score,
                    shap_top1_signal, shap_top1_impact,
                    shap_top2_signal, shap_top2_impact,
                    shap_top3_signal, shap_top3_impact,
                    computed_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    account_id, score, risk_level,
                    s1, s2, s3, s4, s5, s6,
                    sorted_signals[0][0], sorted_signals[0][1],
                    sorted_signals[1][0], sorted_signals[1][1],
                    sorted_signals[2][0], sorted_signals[2][1],
                    computed_at
                )
            )
        except Exception as e:
            log.warning("Failed to insert warmth score timeline point: %s", e)

    def _publish_account_event(self, account: LiveAccount, event_type: str = "ACCOUNT_CREATED"):
        """Publish account event to Kafka and persist to PostgreSQL."""
        payload = {
            "event_id": str(uuid.uuid4()),
            "event_type": event_type,
            "account_id": account.account_id,
            "name": account.name,
            "kyc_status": "COMPLETE",
            "kyc_income": round(random.uniform(100000, 500000), 2),
            "kyc_occupation": account.kyc_occupation,
            "account_type": "SAVINGS",
            "branch_code": "400001",
            "mobile_number": account.mobile_number,
            "warmth_score": account.warmth_score,
            "taint_score": 0.0,
            "status": "ACTIVE",
            "fri_score": random.randint(5, 25),
            "is_mule": False,
            "campaign_id": "LIVE_SIM_2026",
            "created_at": int(account.created_at * 1000),
            "last_active": int(self._get_timestamp()),
            "event_timestamp": int(self._get_timestamp()),
            "source_system": "LIVE_SIMULATOR",
        }

        # Persist to PostgreSQL first so that scoring API doesn't fail
        self.pg.execute(
            """
            INSERT INTO accounts (
                account_id, account_holder_name, account_type, branch_code, ifsc_code,
                mobile_number, kyc_status, account_status, current_warmth_score,
                warmth_risk_level, taint_score, is_confirmed_mule, account_opened_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (account_id) DO UPDATE SET
                current_warmth_score = EXCLUDED.current_warmth_score,
                warmth_risk_level = EXCLUDED.warmth_risk_level
            """,
            (
                account.account_id, account.name, "SAVINGS", "400001", "UBIN0000001",
                account.mobile_number, "COMPLETE", "ACTIVE", account.warmth_score,
                account.risk_level, 0.0, False, datetime.fromtimestamp(account.created_at, tz=timezone.utc)
            )
        )

        if event_type == "ACCOUNT_CREATED":
            # Retrospective timeline backfilling for high-fidelity multi-point chart visualization
            now_dt = datetime.now(timezone.utc)
            stages = ["COLD", "WARMING", "HOT", "CRITICAL", "CONFIRMED"]
            try:
                curr_idx = stages.index(account.stage)
            except ValueError:
                curr_idx = 0

            for idx in range(curr_idx + 1):
                stg = stages[idx]
                if stg == "COLD":
                    score_val = 25.0
                    risk_val = "LOW"
                elif stg == "WARMING":
                    score_val = 52.0
                    risk_val = "MEDIUM"
                elif stg == "HOT":
                    score_val = 70.0
                    risk_val = "HIGH"
                elif stg == "CRITICAL":
                    score_val = 84.0
                    risk_val = "CRITICAL"
                else:
                    score_val = 92.0
                    risk_val = "CRITICAL"

                offset_hours = curr_idx - idx
                stg_timestamp = now_dt - timedelta(hours=offset_hours)
                self._insert_warmth_score(account.account_id, score_val, risk_val, stg, stg_timestamp)

        self.kafka.publish(TOPICS["account"], account.account_id, payload)
        return payload

    def _publish_txn_event(self, from_account: str, to_account: str, amount: float,
                           txn_type: str = "CREDIT", channel: str = "UPI",
                           pattern_tag: str = None, is_test_credit: bool = False):
        """Publish transaction event to Kafka."""
        payload = {
            "event_id": str(uuid.uuid4()),
            "txn_id": str(uuid.uuid4().hex[:12]).upper(),
            "txn_type": txn_type,
            "channel": channel,
            "from_account": from_account,
            "to_account": to_account,
            "amount": amount,
            "currency": "INR",
            "description": f"Test {txn_type.lower()} transaction",
            "status": "SUCCESS",
            "pattern_tag": pattern_tag,
            "is_test_credit": is_test_credit,
            "timestamp": int(self._get_timestamp()),
            "event_timestamp": int(self._get_timestamp()),
            "source_system": "LIVE_SIMULATOR",
        }
        self.kafka.publish(TOPICS["txn"], from_account, payload)
        return payload

    def _publish_device_event(self, account: LiveAccount, event_type: str,
                              is_blocked_imei: bool = False):
        """Publish device event to Kafka."""
        # Generate random IMEI
        imei = f"{SUSPICIOUS_IMEI_PREFIX}{random.randint(1000000000, 9999999999)}"
        fingerprint = uuid.uuid4().hex

        # If we have a suspicious account, share its IMEI
        suspicious = self._get_existing_suspicious_account()
        if suspicious and account.account_id != suspicious:
            # Use a known suspicious IMEI prefix
            imei = f"{SUSPICIOUS_IMEI_PREFIX}{random.randint(1000000000, 9999999999)}"
            is_blocked_imei = True

        payload = {
            "event_id": str(uuid.uuid4()),
            "event_type": event_type,
            "account_id": account.account_id,
            "imei": imei,
            "imei_prefix": imei[:8],
            "sim_id": uuid.uuid4().hex,
            "fingerprint": fingerprint,
            "is_blocked_imei_cluster": is_blocked_imei,
            "previous_imei": None,
            "sim_swap_timestamp": None,
            "upi_registration_timestamp": int(self._get_timestamp()),
            "last_seen": int(self._get_timestamp()),
            "timestamp": int(self._get_timestamp()),
            "event_timestamp": int(self._get_timestamp()),
            "source_system": "LIVE_SIMULATOR",
        }
        self.kafka.publish(TOPICS["device"], account.account_id, payload)
        return payload

    def _publish_kyc_event(self, account: LiveAccount, event_type: str,
                           triggered_by: str = "SYSTEM"):
        """Publish KYC event to Kafka."""
        payload = {
            "event_id": str(uuid.uuid4()),
            "event_type": event_type,
            "account_id": account.account_id,
            "kyc_status": "VERIFIED",
            "triggered_by": triggered_by,
            "legal_authority": "RBI KYC Master Direction 2016 S.38",
            "mlro_id": None,
            "warmth_score_at_trigger": account.warmth_score,
            "resolution_deadline": None,
            "timestamp": int(self._get_timestamp()),
            "event_timestamp": int(self._get_timestamp()),
            "source_system": "LIVE_SIMULATOR",
        }
        self.kafka.publish(TOPICS["kyc"], account.account_id, payload)
        return payload

    # ────────────────────────────────────────────────────────────────────────
    # Trigger Logic
    # ────────────────────────────────────────────────────────────────────────

    def _trigger_kyc(self, account: LiveAccount):
        """Trigger KYC event when score threshold reached."""
        if "KYC" not in self.triggers_fired.get(account.account_id, set()):
            self._publish_kyc_event(account, "KYC_TRIGGERED", "SCORE_THRESHOLD")
            self.triggers_fired.setdefault(account.account_id, set()).add("KYC")
            log.info("[SIMULATOR] %s | LEGAL TRIGGER | %s | KYC triggered at score %.1f",
                     format_time(time.time()), account.account_id, account.warmth_score)

    def _trigger_restriction(self, account: LiveAccount):
        """Restrict account when score threshold reached."""
        if "RESTRICTION" not in self.triggers_fired.get(account.account_id, set()):
            # Publish restriction update
            self._publish_account_event(account, "ACCOUNT_UPDATED")
            log.info("[SIMULATOR] %s | LEGAL TRIGGER | %s | RESTRICTION triggered at score %.1f",
                     format_time(time.time()), account.account_id, account.warmth_score)
            self.triggers_fired.setdefault(account.account_id, set()).add("RESTRICTION")

    def _trigger_cbi_evidence(self, account: LiveAccount):
        """Publish CBI evidence package when score threshold reached."""
        if "CBI" not in self.triggers_fired.get(account.account_id, set()):
            # Publish evidence link to recruiter
            recruiter = self._get_existing_recruiter_account()
            if recruiter:
                self._publish_txn_event(
                    from_account=account.account_id,
                    to_account=recruiter,
                    amount=50000,
                    txn_type="DEBIT",
                    pattern_tag="STRUCTURING"
                )
            log.info("[SIMULATOR] %s | AUTOSTR | %s | CBI evidence package triggered",
                     format_time(time.time()), account.account_id)
            self.triggers_fired.setdefault(account.account_id, set()).add("CBI")

    # ────────────────────────────────────────────────────────────────────────
    # Main Operations
    # ────────────────────────────────────────────────────────────────────────

    def _check_database_activity(self) -> bool:
        """Check if there's recent activity in the database."""
        # Check PostgreSQL for recent LIVE-* accounts created in last 30 minutes
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)

        try:
            # Try to query existing accounts
            result = self.pg.execute(
                """
                SELECT COUNT(*) FROM accounts
                WHERE account_id LIKE 'LIVE-%%'
                AND created_at > %s
                """,
                (cutoff,)
            )
            if result and result[0][0] > 0:
                log.info("[SIMULATOR] %s | STARTUP | Found %d recent LIVE-* accounts",
                         format_time(time.time()), result[0][0])
                return True
        except Exception as e:
            log.warning("PostgreSQL query failed (continuing): %s", e)

        # Check Neo4j as backup
        try:
            result = self.neo4j.execute(
                """
                MATCH (a:Account)
                WHERE a.account_id STARTS WITH 'LIVE-'
                AND a.created_at > datetime() - duration('PT30M')
                RETURN count(a) AS cnt
                """
            )
            if result:
                records = list(result)
                if records and records[0]["cnt"] > 0:
                    log.info("[SIMULATOR] %s | STARTUP | Found %d recent LIVE-* accounts in Neo4j",
                             format_time(time.time()), records[0]["cnt"])
                    return True
        except Exception as e:
            log.warning("Neo4j query failed (continuing): %s", e)

        return False

    def _mini_seed(self):
        """Create minimal seed data (3 accounts, 1 campaign)."""
        log.info("[SIMULATOR] %s | STARTUP | No recent activity found, mini-seeding...",
                 format_time(time.time()))

        # Create 3 seed accounts at different warming stages
        seed_configs = [
            {"stage": "COLD", "score": 25.0, "risk": "LOW"},
            {"stage": "WARMING", "score": 55.0, "risk": "MEDIUM"},
            {"stage": "CRITICAL", "score": 82.0, "risk": "CRITICAL"},
        ]

        for i, config in enumerate(seed_configs):
            account = LiveAccount(f"LIVE-{random.randint(1000, 9999)}", time.time())
            account.stage = config["stage"]
            account.warmth_score = config["score"]
            account.risk_level = config["risk"]

            # Publish account event
            self._publish_account_event(account)
            log.info("[SIMULATOR] %s | STARTUP | Created seed account: %s | score: %.1f | %s",
                     format_time(time.time()), account.account_id,
                     account.warmth_score, account.risk_level)

            self.accounts[account.account_id] = account
            self.known_suspicious_accounts.append(account.account_id)

            # Create some seed transactions
            if i > 0:
                prev_account = list(self.accounts.values())[i - 1]
                self._publish_txn_event(
                    from_account=account.account_id,
                    to_account=prev_account.account_id,
                    amount=random.uniform(10000, 50000),
                    pattern_tag="TEST_CREDIT",
                    is_test_credit=True
                )

        log.info("[SIMULATOR] %s | STARTUP | Ready — live warming scenarios active",
                 format_time(time.time()))

    def _create_new_account(self):
        """Create a new suspicious account and start warming it."""
        account_id = self._generate_account_id()
        now = time.time()
        account = LiveAccount(account_id, now)

        # Publish account event
        self._publish_account_event(account)
        log.info("[SIMULATOR] %s | NEW ACCOUNT | %s | stage: %s | score: %.1f | %s",
                 format_time(now), account_id, account.stage,
                 account.warmth_score, account.risk_level)

        self.accounts[account_id] = account

    def _create_new_recruiter(self):
        """Create a new recruiter account (used later for link creation)."""
        account_id = self._generate_account_id()
        now = time.time()
        account = LiveAccount(account_id, now)
        account.stage = "CONFIRMED"
        account.warmth_score = 92.0
        account.risk_level = "CRITICAL"
        account.kyc_occupation = "business_owner"

        # Publish account event
        self._publish_account_event(account)
        log.info("[SIMULATOR] %s | NEW ACCOUNT | %s | recruiter | score: %.1f | %s",
                 format_time(now), account_id, account.warmth_score, account.risk_level)

        self.accounts[account_id] = account
        self.known_recruiter_accounts.append(account_id)

    def _warm_account(self, account: LiveAccount, now: float):
        """Publish warming events for an account based on its stage."""
        elapsed = now - account.stage_start
        stage_duration = account.get_stage_duration()

        if account.stage == "COLD" and elapsed >= 60:
            # Transition to WARMING - publish 3 test credits
            for _ in range(3):
                src = self._get_existing_account_id()
                if src and src != account.account_id:
                    self._publish_txn_event(
                        from_account=src,
                        to_account=account.account_id,
                        amount=500,
                        pattern_tag="TEST_CREDIT",
                        is_test_credit=True
                    )
                    log.info("[SIMULATOR] %s | TXN EVENT | %s | test credit ₹500 | UPI",
                             format_time(now), account.account_id)

            # Device event with shared IMEI
            self._publish_device_event(account, "UPI_DEVICE_REGISTERED", True)
            log.info("[SIMULATOR] %s | DEVICE EVENT | %s | IMEI shared with known suspicious account",
                     format_time(now), account.account_id)

        elif account.stage == "WARMING" and elapsed >= 60:
            # Transition to HOT - velocity spike and SIM swap
            for _ in range(5):
                self._publish_txn_event(
                    from_account=account.account_id,
                    to_account=self._get_existing_account_id() or account.account_id,
                    amount=random.uniform(5000, 20000),
                    pattern_tag="VELOCITY_SPIKE",
                    is_test_credit=False
                )
            log.info("[SIMULATOR] %s | TXN EVENT | %s | velocity spike 5 txns | UPI",
                     format_time(now), account.account_id)

            self._publish_device_event(account, "SIM_SWAP_DETECTED")
            log.info("[SIMULATOR] %s | DEVICE EVENT | %s | SIM swap detected",
                     format_time(now), account.account_id)

            # KYC trigger at score 65-72
            self._trigger_kyc(account)

        elif account.stage == "HOT" and elapsed >= 60:
            # Transition to CRITICAL - round-trip transaction and FRI contradiction
            # Round trip: send money out then back in
            dest = self._get_existing_account_id()
            if dest and dest != account.account_id:
                self._publish_txn_event(
                    from_account=account.account_id,
                    to_account=dest,
                    amount=100000,
                    txn_type="DEBIT",
                    pattern_tag="ROUND_TRIP"
                )
                time.sleep(0.1)
                self._publish_txn_event(
                    from_account=dest,
                    to_account=account.account_id,
                    amount=100000,
                    txn_type="CREDIT",
                    pattern_tag="ROUND_TRIP"
                )
            log.info("[SIMULATOR] %s | TXN EVENT | %s | round-trip transaction | IMPS",
                     format_time(now), account.account_id)

            # FRI contradiction KYC event
            self._publish_kyc_event(account, "KYC_FRI_CONTRADICTION", "ANALYST_REVIEW")
            log.info("[SIMULATOR] %s | KYC EVENT | %s | FRI contradiction detected",
                     format_time(now), account.account_id)

            # Restriction trigger at score 80-88
            self._trigger_restriction(account)

        elif account.stage == "CRITICAL" and elapsed >= 60:
            # Transition to CONFIRMED - link to recruiter
            recruiter = self._get_existing_recruiter_account()
            if recruiter:
                self._publish_txn_event(
                    from_account=account.account_id,
                    to_account=recruiter,
                    amount=250000,
                    txn_type="DEBIT",
                    pattern_tag="STRUCTURING"
                )
            log.info("[SIMULATOR] %s | TXN EVENT | %s | link to recruiter | NEFT",
                     format_time(now), account.account_id)

            self._trigger_cbi_evidence(account)

    def _escalate_accounts(self, now: float):
        """Check and escalate all accounts that have completed their stage."""
        for account_id, account in list(self.accounts.items()):
            if account.stage == "CONFIRMED":
                continue  # Already at max stage

            stage_duration = account.get_stage_duration()
            elapsed = now - account.stage_start

            if elapsed >= stage_duration:
                old_stage = account.stage
                escalation = account.update(now)

                if escalation:
                    log.info("[SIMULATOR] %s | ESCALATE | %s | %s → %s | score: %.1f",
                             format_time(now), account_id,
                             escalation["old_stage"], escalation["new_stage"],
                             account.warmth_score)
                    log.info("[SIMULATOR] %s | ESCALATE | %s | updated to score %.1f",
                             format_time(now), account_id, account.warmth_score)

                    # Update accounts table in PostgreSQL
                    try:
                        self.pg.execute(
                            """
                            UPDATE accounts
                            SET current_warmth_score = %s,
                                warmth_risk_level = %s,
                                updated_at = %s
                            WHERE account_id = %s
                            """,
                            (account.warmth_score, account.risk_level, datetime.now(timezone.utc), account_id)
                        )
                    except Exception as e:
                        log.warning("Failed to update account warmth score in database: %s", e)

                    # Insert high-fidelity timeline record realistically distributed with SHAP signal attributions
                    self._insert_warmth_score(account_id, account.warmth_score, account.risk_level, account.stage)

    def _cleanup_database(self, now: float):
        """Clean up old LIVE-* accounts from database."""
        two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)

        # PostgreSQL cleanup
        pg_deleted = 0
        try:
            res = self.pg.execute(
                """
                DELETE FROM accounts
                WHERE account_id LIKE 'LIVE-%%'
                AND created_at < %s
                """,
                (two_hours_ago,)
            )
            pg_deleted += res if isinstance(res, int) else 0
        except Exception as e:
            log.warning("PostgreSQL cleanup failed: %s", e)

        try:
            res = self.pg.execute(
                """
                DELETE FROM warmth_scores
                WHERE account_id LIKE 'LIVE-%%'
                AND computed_at < %s
                """,
                (two_hours_ago,)
            )
            pg_deleted += res if isinstance(res, int) else 0
        except Exception as e:
            log.warning("PostgreSQL warmthscore cleanup failed: %s", e)

        # Neo4j cleanup
        neo4j_deleted = 0
        try:
            records = self.neo4j.execute(
                """
                MATCH (a:Account)
                WHERE a.account_id STARTS WITH 'LIVE-'
                AND a.created_at < datetime() - duration('PT2H')
                DETACH DELETE a
                RETURN count(a) AS cnt
                """
            )
            if records and len(records) > 0:
                neo4j_deleted = records[0].get("cnt", 0)
        except Exception as e:
            log.warning("Neo4j cleanup failed: %s", e)

        if pg_deleted > 0 or neo4j_deleted > 0:
            log.info("[SIMULATOR] %s | CLEANUP | Removed %d expired LIVE-* accounts",
                     format_time(now), pg_deleted + neo4j_deleted)

    def _run_loop(self):
        """Main event loop."""
        last_txn_time = 0
        last_device_time = 0
        last_kyc_time = 0
        last_new_account_time = 0
        last_cleanup_time = 0
        last_escalation_time = 0
        last_recruiter_time = 0

        while self.running:
            now = time.time()

            # Transaction every 10 seconds
            if now - last_txn_time >= 10:
                last_txn_time = now
                account = self._get_existing_account_id()
                if account:
                    self._publish_txn_event(
                        from_account=account,
                        to_account=self._get_existing_account_id() or account,
                        amount=random.uniform(1000, 50000),
                        channel=random.choice(["IMPS", "NEFT", "UPI"]),
                        is_test_credit=False
                    )
                    log.info("[SIMULATOR] %s | TXN EVENT | %s | txn %.0f | %s",
                             format_time(now), account,
                             random.uniform(1000, 50000),
                             random.choice(["IMPS", "NEFT", "UPI"]))

            # Device event every 20 seconds
            if now - last_device_time >= 20:
                last_device_time = now
                account = self._get_existing_account_id()
                if account:
                    self._publish_device_event(
                        self.accounts.get(account) or LiveAccount(account, now),
                        "UPI_DEVICE_REGISTERED"
                    )
                    log.info("[SIMULATOR] %s | DEVICE EVENT | %s | new device registered",
                             format_time(now), account)

            # KYC event every 30 seconds (from existing accounts)
            if now - last_kyc_time >= 30:
                last_kyc_time = now
                account = self._get_existing_account_id()
                if account and account in self.accounts:
                    self._publish_kyc_event(
                        self.accounts[account],
                        "KYC_STATUS_CHECK",
                        "AUTO_MONITOR"
                    )
                    log.info("[SIMULATOR] %s | KYC EVENT | %s | status check",
                             format_time(now), account)

            # New account every 60 seconds
            if now - last_new_account_time >= 60:
                last_new_account_time = now
                self._create_new_account()

            # Recruiters every 5 minutes (to have targets for linking)
            if now - last_recruiter_time >= 300:
                last_recruiter_time = now
                self._create_new_recruiter()

            # Cleanup every 5 minutes
            if now - last_cleanup_time >= 300:
                last_cleanup_time = now
                self._cleanup_database(now)

            # Escalation check every 5 seconds
            if now - last_escalation_time >= 5:
                last_escalation_time = now
                self._escalate_accounts(now)

                # Also warm accounts that are in progress
                for account_id, account in list(self.accounts.items()):
                    if account.stage != "CONFIRMED":
                        stage_duration = account.get_stage_duration()
                        elapsed = now - account.stage_start
                        if elapsed < stage_duration:
                            self._warm_account(account, now)

            time.sleep(1)

    def run(self):
        """Run the simulator with proper startup and cleanup."""
        # Print banner
        print("=" * 60)
        print("ARGUS-PRISM Live Demo Simulator")
        print("-" * 60)
        print("Mode        : Continuous (runs forever)")
        print("New account : Every 60 seconds")
        print("Cleanup     : Every 5 minutes (keeps DB clean)")
        print("Warming     : 72hr compressed into 5 minutes")
        print("Press Ctrl+C to stop cleanly")
        print("=" * 60)

        # Load seed data
        self._load_seed_data()

        # Check for existing activity
        has_activity = self._check_database_activity()

        if not has_activity:
            self._mini_seed()

        # Run main loop
        try:
            self._run_loop()
        except KeyboardInterrupt:
            log.info("[SIMULATOR] Stopped cleanly")
        finally:
            if self.pg._connected:
                self.pg.close()
            if self.neo4j._connected:
                self.neo4j.close()


# ──────────────────────────────────────────────────────────────────────────────
# Entry Point
# ──────────────────────────────────────────────────────────────────────────────

def main():
    """Main entry point."""
    simulator = LiveSimulator()
    simulator.run()


if __name__ == "__main__":
    main()
