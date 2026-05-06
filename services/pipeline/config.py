"""
ARGUS-PRISM Pipeline Config
All connection settings in one place — override via env vars.
"""

import os

# ── Kafka ─────────────────────────────────────────────────────────────────────
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")

TOPICS = {
    "account": "account_events",
    "txn": "txn_events",
    "device": "device_events",
    "kyc": "kyc_events",
}

PRODUCER_CONFIG = {
    "bootstrap.servers": KAFKA_BOOTSTRAP,
    "acks": "all",
    "retries": 3,
    "linger.ms": 5,
}

CONSUMER_CONFIG_BASE = {
    "bootstrap.servers": KAFKA_BOOTSTRAP,
    "auto.offset.reset": "earliest",
    "enable.auto.commit": True,
    "auto.commit.interval.ms": 1000,
}

# ── Neo4j ─────────────────────────────────────────────────────────────────────
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "prism_password")

# ── PostgreSQL ────────────────────────────────────────────────────────────────
POSTGRES_DSN = os.getenv(
    "POSTGRES_DSN",
    "postgresql://prism_user:prism_password@localhost:5432/prism_db"
)

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

# ── Synthetic data paths ──────────────────────────────────────────────────────
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SYNTHETIC_DIR = REPO_ROOT / "data" / "synthetic_demo"

ACCOUNTS_FILE = SYNTHETIC_DIR / "accounts.json"
TRANSACTIONS_FILE = SYNTHETIC_DIR / "transactions.json"
DEVICE_EVENTS_FILE = SYNTHETIC_DIR / "device_events.json"
KYC_EVENTS_FILE = SYNTHETIC_DIR / "kyc_events.json"
