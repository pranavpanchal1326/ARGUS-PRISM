"""
ARGUS-PRISM Flink Pipeline (Python Consumer)
=============================================
Consumes account_events + txn_events from Kafka and writes to Neo4j.
This Python consumer mirrors the logic of an Apache Flink streaming job
and is the primary data ingestion pipeline for the PRISM graph database.

In production: replaced by a compiled PyFlink / Flink JAR job submitted
to the Flink JobManager (running on port 8081).

Usage:
    python flink_pipeline.py                        # run pipeline (Ctrl+C to stop)
    python flink_pipeline.py --once                 # consume until EOF then exit
    python flink_pipeline.py --timeout 30           # run for 30 seconds then exit
"""

import json
import time
import signal
import logging
import argparse
from confluent_kafka import Consumer, KafkaError, KafkaException
from graph_writer import GraphWriter
from config import CONSUMER_CONFIG_BASE, TOPICS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("prism.pipeline")


class PRISMPipeline:
    """
    Streaming pipeline: Kafka topics → Neo4j graph.

    Consumes account_events and txn_events in a single consumer group,
    processes each message, and writes to Neo4j via GraphWriter.

    Latency target: < 2s end-to-end (Kafka publish → Neo4j write).
    """

    CONSUMER_GROUP = "prism-pipeline-group"

    def __init__(self):
        consumer_config = {
            **CONSUMER_CONFIG_BASE,
            "group.id": self.CONSUMER_GROUP,
        }
        self.consumer = Consumer(consumer_config)
        self.graph = GraphWriter()
        self._running = True
        self._stats = {
            "accounts_written": 0,
            "transactions_written": 0,
            "errors": 0,
            "messages_consumed": 0,
        }

        # Graceful shutdown on SIGINT / SIGTERM
        signal.signal(signal.SIGINT, self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)

        log.info("PRISM Pipeline initialized")
        log.info("  Consumer group : %s", self.CONSUMER_GROUP)
        log.info("  Topics         : %s, %s", TOPICS["account"], TOPICS["txn"])

    def _shutdown(self, signum, frame):
        log.info("Shutdown signal received — draining and stopping...")
        self._running = False

    def _handle_account_event(self, payload: dict):
        """Process account_event → create/update Account node in Neo4j."""
        try:
            self.graph.create_account(payload)
            self._stats["accounts_written"] += 1
            log.debug("Account written: %s", payload.get("account_id"))
        except Exception as e:
            self._stats["errors"] += 1
            log.error("Failed to write account %s: %s",
                      payload.get("account_id"), e)

    def _handle_txn_event(self, payload: dict):
        """Process txn_event → create TRANSACTED edge between Account nodes."""
        try:
            self.graph.create_transaction(payload)
            self._stats["transactions_written"] += 1
            log.debug("Transaction written: %s", payload.get("txn_id"))
        except Exception as e:
            self._stats["errors"] += 1
            log.error("Failed to write txn %s: %s",
                      payload.get("txn_id"), e)

    def _process_message(self, msg):
        """Route message to correct handler based on topic."""
        topic = msg.topic()
        try:
            payload = json.loads(msg.value().decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            log.warning("Malformed message on %s: %s", topic, e)
            self._stats["errors"] += 1
            return

        self._stats["messages_consumed"] += 1

        if topic == TOPICS["account"]:
            self._handle_account_event(payload)
        elif topic == TOPICS["txn"]:
            self._handle_txn_event(payload)
        else:
            log.warning("No handler for topic: %s", topic)

    def _log_stats(self):
        log.info(
            "Pipeline stats | accounts: %d | transactions: %d | errors: %d | total: %d",
            self._stats["accounts_written"],
            self._stats["transactions_written"],
            self._stats["errors"],
            self._stats["messages_consumed"],
        )

    def run(self, timeout_seconds: float = None, poll_timeout: float = 1.0):
        """
        Main pipeline loop.
        Args:
            timeout_seconds: Stop after N seconds (None = run forever).
            poll_timeout: Kafka poll timeout in seconds.
        """
        self.consumer.subscribe([TOPICS["account"], TOPICS["txn"]])
        log.info("Pipeline running — subscribed to %s, %s",
                 TOPICS["account"], TOPICS["txn"])

        start_time = time.time()
        last_stats_log = start_time

        try:
            while self._running:
                # Check timeout
                if timeout_seconds and (time.time() - start_time) > timeout_seconds:
                    log.info("Timeout reached (%ss) — stopping", timeout_seconds)
                    break

                msg = self.consumer.poll(timeout=poll_timeout)

                if msg is None:
                    continue

                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        log.debug("Reached end of partition %s [%d]",
                                  msg.topic(), msg.partition())
                        # In --once mode, EOF means we're done
                        if timeout_seconds == 0:
                            break
                    else:
                        raise KafkaException(msg.error())
                    continue

                self._process_message(msg)

                # Log stats every 5 seconds
                if time.time() - last_stats_log >= 5:
                    self._log_stats()
                    last_stats_log = time.time()

        finally:
            self.consumer.close()
            self.graph.close()
            self._log_stats()
            log.info("Pipeline stopped.")

        return self._stats


# ── CLI entry point ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="PRISM Kafka → Neo4j Pipeline")
    parser.add_argument(
        "--timeout",
        type=float,
        default=None,
        help="Stop after N seconds (default: run forever)"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Stop after first EOF (consume available messages then exit)"
    )
    args = parser.parse_args()

    pipeline = PRISMPipeline()

    if args.once:
        pipeline.run(timeout_seconds=30, poll_timeout=2.0)
    else:
        pipeline.run(timeout_seconds=args.timeout)


if __name__ == "__main__":
    main()
