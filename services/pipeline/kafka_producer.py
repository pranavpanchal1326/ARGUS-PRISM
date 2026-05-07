"""
ARGUS-PRISM Kafka Producer
===========================
Reads synthetic dataset JSON files and publishes events to the 4 Kafka topics.
Simulates Finacle core-banking event stream for pipeline development and testing.

Usage:
    python kafka_producer.py                    # publish all events
    python kafka_producer.py --topic account    # publish only account events
    python kafka_producer.py --delay 0.01       # 10ms inter-event delay
"""

import json
import time
import argparse
import logging
from confluent_kafka import Producer, KafkaException
from config import PRODUCER_CONFIG, TOPICS, ACCOUNTS_FILE, TRANSACTIONS_FILE
from config import DEVICE_EVENTS_FILE, KYC_EVENTS_FILE

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("prism.producer")


# ── Delivery callback ─────────────────────────────────────────────────────────

def _delivery_report(err, msg):
    if err:
        log.error("Delivery failed for %s: %s", msg.key(), err)
    else:
        log.debug("Delivered to %s [partition %d] offset %d",
                  msg.topic(), msg.partition(), msg.offset())


# ── Core producer ─────────────────────────────────────────────────────────────

class FinacleEventProducer:
    """
    Reads synthetic JSON data and publishes to PRISM Kafka topics.
    Key = account_id for partition affinity (all events for same account
    go to same partition — preserves ordering per account).
    """

    def __init__(self):
        self.producer = Producer(PRODUCER_CONFIG)
        log.info("Producer connected to %s", PRODUCER_CONFIG["bootstrap.servers"])

    def _publish(self, topic: str, key: str, payload: dict, delay: float = 0):
        self.producer.produce(
            topic=topic,
            key=key.encode("utf-8"),
            value=json.dumps(payload, default=str).encode("utf-8"),
            callback=_delivery_report,
        )
        # Poll to trigger delivery callbacks — prevents buffer overflow
        self.producer.poll(0)
        if delay:
            time.sleep(delay)

    def publish_accounts(self, delay: float = 0) -> int:
        data = json.loads(ACCOUNTS_FILE.read_text(encoding="utf-8"))
        count = 0
        for account in data:
            # Map to account_events schema
            event = {
                "event_id": account.get("event_id", f"EVT-ACC-{account['account_id']}"),
                "event_type": "ACCOUNT_CREATED",
                "account_id": account["account_id"],
                "name": account["name"],
                "kyc_status": account["kyc_status"],
                "kyc_income": account.get("kyc_income"),
                "kyc_occupation": account.get("kyc_occupation"),
                "account_type": account.get("account_type", "SAVINGS"),
                "branch_code": account.get("branch_code", "UBI-BR-0001"),
                "mobile_number": account.get("mobile_number", ""),
                "warmth_score": account.get("warmth_score", 0.0),
                "taint_score": account.get("taint_score", 0.0),
                "status": account.get("status", "ACTIVE"),
                "fri_score": account.get("fri_score", 10),
                "is_mule": account.get("is_mule", False),
                "campaign_id": account.get("campaign_id"),
                "created_at": account.get("created_at"),
                "last_active": account.get("last_active"),
                "event_timestamp": account.get("event_timestamp"),
                "source_system": "FINACLE",
            }
            self._publish(TOPICS["account"], account["account_id"], event, delay)
            count += 1

        self.producer.flush()
        log.info("Published %d account events to [%s]", count, TOPICS["account"])
        return count

    def publish_transactions(self, delay: float = 0) -> int:
        data = json.loads(TRANSACTIONS_FILE.read_text(encoding="utf-8"))
        count = 0
        for txn in data:
            event = {
                "event_id": txn.get("event_id", f"EVT-TXN-{txn['txn_id']}"),
                "txn_id": txn["txn_id"],
                "txn_type": txn.get("txn_type", "CREDIT"),
                "channel": txn.get("channel", "UPI"),
                "from_account": txn["from_account"],
                "to_account": txn["to_account"],
                "amount": txn["amount"],
                "currency": txn.get("currency", "INR"),
                "description": txn.get("description"),
                "status": txn.get("status", "SUCCESS"),
                "pattern_tag": txn.get("pattern_tag"),
                "is_test_credit": txn.get("is_test_credit", False),
                "timestamp": txn.get("timestamp"),
                "event_timestamp": txn.get("event_timestamp"),
                "source_system": "FINACLE",
            }
            # Key on from_account for producer-side ordering
            key = txn.get("from_account", txn["txn_id"])
            self._publish(TOPICS["txn"], key, event, delay)
            count += 1

        self.producer.flush()
        log.info("Published %d transaction events to [%s]", count, TOPICS["txn"])
        return count

    def publish_device_events(self, delay: float = 0) -> int:
        data = json.loads(DEVICE_EVENTS_FILE.read_text(encoding="utf-8"))
        count = 0
        for evt in data:
            self._publish(TOPICS["device"], evt["account_id"], evt, delay)
            count += 1

        self.producer.flush()
        log.info("Published %d device events to [%s]", count, TOPICS["device"])
        return count

    def publish_kyc_events(self, delay: float = 0) -> int:
        data = json.loads(KYC_EVENTS_FILE.read_text(encoding="utf-8"))
        count = 0
        for evt in data:
            self._publish(TOPICS["kyc"], evt["account_id"], evt, delay)
            count += 1

        self.producer.flush()
        log.info("Published %d KYC events to [%s]", count, TOPICS["kyc"])
        return count

    def publish_all(self, delay: float = 0) -> dict:
        """Publish all 4 event streams. Returns counts per topic."""
        log.info("Starting full synthetic dataset publish...")
        counts = {
            "account_events": self.publish_accounts(delay),
            "txn_events": self.publish_transactions(delay),
            "device_events": self.publish_device_events(delay),
            "kyc_events": self.publish_kyc_events(delay),
        }
        total = sum(counts.values())
        log.info("Done. Total events published: %d", total)
        for topic, count in counts.items():
            log.info("  %s: %d", topic, count)
        return counts


# ── CLI entry point ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="PRISM Finacle Event Producer")
    parser.add_argument(
        "--topic",
        choices=["account", "txn", "device", "kyc", "all"],
        default="all",
        help="Which topic to publish (default: all)"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.0,
        help="Inter-event delay in seconds (default: 0)"
    )
    args = parser.parse_args()

    producer = FinacleEventProducer()

    if args.topic == "all":
        producer.publish_all(args.delay)
    elif args.topic == "account":
        producer.publish_accounts(args.delay)
    elif args.topic == "txn":
        producer.publish_transactions(args.delay)
    elif args.topic == "device":
        producer.publish_device_events(args.delay)
    elif args.topic == "kyc":
        producer.publish_kyc_events(args.delay)


if __name__ == "__main__":
    main()
