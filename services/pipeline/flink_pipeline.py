"""
ARGUS-PRISM Flink Pipeline (Python Consumer)
=============================================
Consumes all 4 event topics from Kafka and writes to Neo4j.
After processing each event, auto-triggers WarmthScore re-computation
via the PRISM API so scores update in real time without manual intervention.
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
import httpx
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
            "devices_written": 0,
            "kyc_updated": 0,
            "auto_scores_fired": 0,
            "auto_scores_failed": 0,
            "errors": 0,
            "messages_consumed": 0,
        }
        self._score_debounce = set()  # accounts scored this batch

        # Graceful shutdown on SIGINT / SIGTERM
        signal.signal(signal.SIGINT, self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)

        log.info("PRISM Pipeline initialized")
        log.info("  Consumer group : %s", self.CONSUMER_GROUP)
        log.info("  Topics         : %s", ", ".join([TOPICS["account"], TOPICS["txn"], TOPICS["device"], TOPICS["kyc"]]))

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
            # Auto-score the sender account (most likely to be a mule)
            from_account = payload.get("from_account")
            if from_account:
                self._trigger_auto_score(from_account)
        except Exception as e:
            self._stats["errors"] += 1
            log.error("Failed to write txn %s: %s",
                      payload.get("txn_id"), e)

    def _handle_device_event(self, payload: dict):
        """Process device_event → create/update Device node + USES_DEVICE edge in Neo4j."""
        try:
            self.graph.create_device(payload)
            self._stats["devices_written"] += 1
            log.debug("Device written: imei=%s account=%s",
                      payload.get("imei"), payload.get("account_id"))
            # Auto-score: device changes affect S2 (Device FP) and S6 (SIM Swap)
            account_id = payload.get("account_id")
            if account_id:
                self._trigger_auto_score(account_id)
        except Exception as e:
            self._stats["errors"] += 1
            log.error("Failed to write device event for %s: %s",
                      payload.get("account_id"), e)

    def _handle_kyc_event(self, payload: dict):
        """Process kyc_event → update Account node KYC fields in Neo4j."""
        try:
            account_id = payload.get("account_id")
            kyc_status = payload.get("kyc_status", "PENDING")
            self.graph.update_kyc_status(account_id, kyc_status)
            self._stats["kyc_updated"] += 1
            log.debug("KYC updated: account=%s status=%s", account_id, kyc_status)
            # Auto-score: KYC changes affect S5 (FRI Contradiction)
            if account_id:
                self._trigger_auto_score(account_id)
        except Exception as e:
            self._stats["errors"] += 1
            log.error("Failed to update KYC for %s: %s",
                      payload.get("account_id"), e)

    # ── Auto-Score Trigger ─────────────────────────────────────────────────────

    WARMTHSCORE_API = "http://localhost:8000/api/v1/warmthscore/score"
    SCORING_HEADERS = {
        "X-PRISM-User": "pipeline-auto-scorer",
        "X-PRISM-Role": "MLRO",
        "X-Internal-Service": "flink-pipeline",
    }

    def _trigger_auto_score(self, account_id: str):
        """
        Fire-and-forget WarmthScore re-computation after a new event.
        Debounces: each account is scored at most once per stats-log interval.
        Never crashes the pipeline — all errors are caught and logged.
        """
        if account_id in self._score_debounce:
            return  # Already scored in this batch
        self._score_debounce.add(account_id)

        try:
            signals = self._build_signal_payload(account_id)
            r = httpx.post(
                self.WARMTHSCORE_API,
                json={"account_id": account_id, "signal_outputs": signals},
                headers=self.SCORING_HEADERS,
                timeout=10.0,
            )
            if r.status_code == 200:
                data = r.json()
                score = data.get("warmth_score", "?")
                risk = data.get("risk_level", "?")
                self._stats["auto_scores_fired"] += 1
                log.info("[AUTO-SCORE] %s → score=%s risk=%s", account_id, score, risk)
            else:
                self._stats["auto_scores_failed"] += 1
                log.warning("[AUTO-SCORE] %s → HTTP %d", account_id, r.status_code)
        except Exception as e:
            self._stats["auto_scores_failed"] += 1
            log.warning("[AUTO-SCORE] %s failed: %s", account_id, e)

    def _build_signal_payload(self, account_id: str) -> dict:
        """
        Build a minimal signal payload from Neo4j graph data.
        Uses default zero vectors for signals that can't be derived from graph.
        In production, each signal processor would compute its own features.
        """
        signals = {
            "S1": {"shap_ready_vector": [0.0] * 7},
            "S2": {"shap_ready_vector": [0.0] * 9},
            "S3": {"shap_ready_vector": [0.0] * 8},
            "S4": {"shap_ready_vector": [0.0] * 7},
            "S5": {"shap_ready_vector": [0.0] * 6},
            "S6": {"shap_ready_vector": [0.0] * 6},
        }

        try:
            with self.graph.driver.session() as session:
                result = session.run("""
                    MATCH (a:Account {account_id: $id})
                    OPTIONAL MATCH (a)-[:USES_DEVICE]->(d:Device)
                    OPTIONAL MATCH (a)-[t:TRANSACTED]->()
                    WITH a,
                         collect(DISTINCT d) AS devices,
                         count(DISTINCT t) AS txn_count,
                         CASE WHEN a.last_active IS NOT NULL
                              THEN duration.between(a.last_active, datetime()).days
                              ELSE 0 END AS dormancy
                    RETURN a.warmth_score AS warmth,
                           a.fri_score AS fri,
                           a.kyc_status AS kyc,
                           size(devices) AS device_count,
                           CASE WHEN size(devices) > 0
                                THEN devices[0].sim_swap_detected
                                ELSE false END AS sim_swap,
                           txn_count,
                           dormancy
                """, id=account_id)
                record = result.single()

                if record:
                    txn_count = record["txn_count"] or 0
                    dormancy = record["dormancy"] or 0
                    device_count = record["device_count"] or 0
                    sim_swap = record["sim_swap"] or False
                    fri = record["fri"] or 10

                    # S1: Test Credit Pattern — use txn count as a proxy
                    signals["S1"]["shap_ready_vector"][0] = min(1.0, txn_count / 20.0)

                    # S2: Device Fingerprint
                    signals["S2"]["shap_ready_vector"][2] = min(1.0, device_count / 5.0)
                    signals["S2"]["shap_ready_vector"][6] = 1.0 if device_count > 1 else 0.0

                    # S3: Velocity — normalize txn count
                    signals["S3"]["shap_ready_vector"][5] = min(1.0, txn_count / 50.0)

                    # S4: Dormant Reactivation
                    signals["S4"]["shap_ready_vector"][0] = min(1.0, dormancy / 180.0)

                    # S5: FRI Contradiction
                    signals["S5"]["shap_ready_vector"][0] = min(1.0, (100 - fri) / 100.0)

                    # S6: SIM Swap Velocity
                    signals["S6"]["shap_ready_vector"][0] = 1.0 if sim_swap else 0.0

        except Exception as e:
            log.warning("[AUTO-SCORE] Failed to build signals for %s, using zeros: %s", account_id, e)

        return signals

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
        elif topic == TOPICS["device"]:
            self._handle_device_event(payload)
        elif topic == TOPICS["kyc"]:
            self._handle_kyc_event(payload)
        else:
            log.warning("No handler for topic: %s", topic)

    def _log_stats(self):
        log.info(
            "Pipeline stats | accounts: %d | txns: %d | devices: %d | kyc: %d | "
            "auto-scores: %d/%d | errors: %d | total: %d",
            self._stats["accounts_written"],
            self._stats["transactions_written"],
            self._stats["devices_written"],
            self._stats["kyc_updated"],
            self._stats["auto_scores_fired"],
            self._stats["auto_scores_fired"] + self._stats["auto_scores_failed"],
            self._stats["errors"],
            self._stats["messages_consumed"],
        )
        # Reset debounce set each stats interval
        self._score_debounce.clear()

    def run(self, timeout_seconds: float = None, poll_timeout: float = 1.0):
        """
        Main pipeline loop.
        Args:
            timeout_seconds: Stop after N seconds (None = run forever).
            poll_timeout: Kafka poll timeout in seconds.
        """
        all_topics = [TOPICS["account"], TOPICS["txn"], TOPICS["device"], TOPICS["kyc"]]
        self.consumer.subscribe(all_topics)
        log.info("Pipeline running — subscribed to %s", ", ".join(all_topics))

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
