"""
ARGUS-PRISM WarmthScore Engine
================================
Real-time WarmthScore engine for Signals 4, 5, 6.

Subscribes to account_events + device_events Kafka topics,
computes signal scores on each event, and writes updated
warmth_score back to Neo4j Account node.

Also exposes:
  - write_warmth_score()   — direct Neo4j writer
  - trigger_kyc_action()   — KYC hold at 60, freeze at 80

Usage:
    python warmth_engine.py             # run as Kafka subscriber
    python warmth_engine.py --once      # process available events then exit
    python warmth_engine.py --account UBI-2026-000001  # score one account
"""

import os
import sys
import json
import time
import signal
import logging
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'services', 'pipeline'))

try:
    from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, CONSUMER_CONFIG_BASE, TOPICS
except ImportError:
    NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "prism_password")
    CONSUMER_CONFIG_BASE = {
        "bootstrap.servers": os.getenv("KAFKA_BOOTSTRAP", "localhost:9092"),
        "auto.offset.reset": "earliest",
        "enable.auto.commit": True,
    }
    TOPICS = {
        "account": "account_events",
        "device":  "device_events",
    }

from confluent_kafka import Consumer, KafkaError
from neo4j import GraphDatabase
from signals import compute_warmth_contribution

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("prism.warmthscore.engine")

# ── Thresholds (from PRISM.md) ────────────────────────────────────────────────
WARMTH_KYC_HOLD_THRESHOLD   = 60.0
WARMTH_FREEZE_THRESHOLD      = 80.0


# ── Neo4j warmth writer ───────────────────────────────────────────────────────

class WarmthNeo4jWriter:
    """Writes warmth_score updates to Neo4j Account nodes."""

    def __init__(self):
        self.driver = GraphDatabase.driver(
            NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)
        )

    def close(self):
        self.driver.close()

    def write_warmth_score(self, account_id: str,
                           score: float,
                           signals_fired: list[str]) -> float:
        """
        Write warmth_score to Neo4j. Accumulates with existing score
        (does not overwrite — adds the new signal contribution).
        Returns the new total warmth_score.
        """
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (a:Account {account_id: $id})
                WITH a,
                     CASE WHEN a.warmth_score IS NULL
                          THEN $score
                          ELSE a.warmth_score + $score
                     END AS raw_score
                SET a.warmth_score      = CASE WHEN raw_score > 100.0 THEN 100.0 ELSE raw_score END,
                    a.warmth_signals_fired = $signals,
                    a.warmth_updated_at    = datetime()
                RETURN a.warmth_score AS new_score
                """,
                id=account_id,
                score=score,
                signals=signals_fired,
            )
            record = result.single()
            if record:
                return float(record["new_score"])
            return 0.0

    def trigger_kyc_action(self, account_id: str, warmth_score: float):
        """
        Apply legal actions based on WarmthScore thresholds:
          >= 60 → KYC_HOLD + RE_VERIFICATION_REQUIRED
          >= 80 → FROZEN (outbound restricted per RBI KYC Master Direction S.38)
        """
        if warmth_score >= WARMTH_FREEZE_THRESHOLD:
            status = "FROZEN"
            reason = f"WARMTH_SCORE_{int(warmth_score)}_AUTO_FREEZE"
            log.warning("[FREEZE] %s — warmth=%.1f → FROZEN", account_id, warmth_score)
        elif warmth_score >= WARMTH_KYC_HOLD_THRESHOLD:
            status = "KYC_HOLD"
            reason = f"WARMTH_SCORE_{int(warmth_score)}_KYC_HOLD"
            log.warning("[KYC_HOLD] %s — warmth=%.1f → KYC_HOLD", account_id, warmth_score)
        else:
            return  # No action needed

        with self.driver.session() as session:
            session.run(
                """
                MATCH (a:Account {account_id: $id})
                SET a.status = $status,
                    a.status_reason = $reason,
                    a.status_updated_at = datetime(),
                    a.kyc_status = CASE WHEN $status = 'KYC_HOLD'
                                        THEN 'RE_VERIFICATION_REQUIRED'
                                        ELSE a.kyc_status END
                """,
                id=account_id,
                status=status,
                reason=reason,
            )


# ── Scoring an individual account ─────────────────────────────────────────────

def score_account(account_id: str,
                  writer: WarmthNeo4jWriter) -> dict:
    """
    Compute Signals 4+5+6 for an account and write to Neo4j.
    Returns scoring result dict.
    """
    result = compute_warmth_contribution(account_id)
    contribution = result["signals_456_contribution"]

    if contribution > 0:
        new_score = writer.write_warmth_score(
            account_id,
            contribution,
            result["signals_fired"],
        )
        result["neo4j_warmth_score"] = new_score
        writer.trigger_kyc_action(account_id, new_score)
        log.info(
            "Scored %s: signals=%s contribution=%.2f → warmth=%.1f",
            account_id, result["signals_fired"], contribution, new_score
        )
    else:
        result["neo4j_warmth_score"] = None

    return result


# ── Kafka-driven engine ───────────────────────────────────────────────────────

class WarmthScoringEngine:
    """
    Subscribes to account_events and device_events Kafka topics.
    On each event, triggers scoring for the affected account_id.
    """

    CONSUMER_GROUP = "prism-warmthscore-group"

    def __init__(self):
        consumer_config = {
            **CONSUMER_CONFIG_BASE,
            "group.id": self.CONSUMER_GROUP,
        }
        self.consumer = Consumer(consumer_config)
        self.writer = WarmthNeo4jWriter()
        self._running = True
        self._stats = {"scored": 0, "skipped": 0, "errors": 0}
        signal.signal(signal.SIGINT, self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)
        log.info("WarmthScoringEngine initialized — group: %s", self.CONSUMER_GROUP)

    def _shutdown(self, signum, frame):
        self._running = False

    def run(self, timeout_seconds: float = None, poll_timeout: float = 1.0):
        """Run the scoring loop until stopped or timeout reached."""
        self.consumer.subscribe([TOPICS["account"], TOPICS["device"]])
        log.info("Subscribed to %s, %s", TOPICS["account"], TOPICS["device"])
        start = time.time()

        try:
            while self._running:
                if timeout_seconds and (time.time() - start) > timeout_seconds:
                    break

                msg = self.consumer.poll(timeout=poll_timeout)
                if msg is None:
                    continue
                if msg.error():
                    if msg.error().code() != KafkaError._PARTITION_EOF:
                        log.error("Kafka error: %s", msg.error())
                    continue

                try:
                    payload = json.loads(msg.value().decode("utf-8"))
                    account_id = payload.get("account_id")
                    if not account_id:
                        self._stats["skipped"] += 1
                        continue

                    score_account(account_id, self.writer)
                    self._stats["scored"] += 1

                except Exception as e:
                    self._stats["errors"] += 1
                    log.error("Scoring error: %s", e)

        finally:
            self.consumer.close()
            self.writer.close()
            log.info("Engine stopped. Stats: %s", self._stats)

        return self._stats


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="PRISM WarmthScore Engine (Signals 4-6)")
    parser.add_argument("--account", type=str, help="Score a single account and exit")
    parser.add_argument("--timeout", type=float, default=None,
                        help="Stop after N seconds")
    parser.add_argument("--once", action="store_true",
                        help="Process available events then exit (30s max)")
    args = parser.parse_args()

    if args.account:
        writer = WarmthNeo4jWriter()
        try:
            result = score_account(args.account, writer)
            print(json.dumps(result, indent=2, default=str))
        finally:
            writer.close()
        return

    engine = WarmthScoringEngine()
    if args.once:
        engine.run(timeout_seconds=30, poll_timeout=2.0)
    else:
        engine.run(timeout_seconds=args.timeout)


if __name__ == "__main__":
    main()
