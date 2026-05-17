"""
ARGUS-PRISM Recruiter Mapper — Phase 6
========================================
Detects and classifies recruiter accounts in the mule network.

A "recruiter" is a source account that sends small amounts to 5+ target
accounts within 48 hours — the classic mule warming pattern.

Classification tiers (WORKFLOW_ADITYA.md Day 6):
  Campaign Coordinator:     5–10  downstream accounts
  Industrial Orchestrator: 11–25  downstream accounts
  Platform-scale:          25+    downstream accounts

One-click campaign freeze:
  Sets status=FROZEN + frozen_reason on recruiter + ALL connected accounts.
  Writes audit entry to Neo4j for every freeze action.

Cypher used (from workflow spec):
  MATCH (recruiter:Account)-[t:TRANSACTED]->(target:Account)
  WHERE t.timestamp > datetime() - duration('PT48H') AND t.amount < 5000
  WITH recruiter, collect(DISTINCT target) AS targets, count(DISTINCT target) AS cnt
  WHERE cnt >= 5
  RETURN recruiter.account_id, cnt, ...classification...

Usage:
    python recruiter_detector.py --detect              # scan all recruiters
    python recruiter_detector.py --freeze REC-001      # freeze a campaign
    python recruiter_detector.py --report REC-001      # show campaign graph
"""

import os
import sys
import json
import logging
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'services', 'pipeline'))

try:
    from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
except ImportError:
    NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

from neo4j import GraphDatabase

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("prism.recruiter.detector")

# ── Classification thresholds (WORKFLOW_ADITYA.md Day 6) ─────────────────────
COORDINATOR_MIN   = 5
ORCHESTRATOR_MIN  = 11
PLATFORM_MIN      = 26

# Amount threshold for "warming" transactions (sub-5000 = small seeding)
WARMING_AMOUNT_MAX = 5_000

# Detection window
DETECTION_WINDOW_HOURS = 48


def classify_recruiter(downstream_count: int) -> str:
    """
    Classify recruiter tier based on downstream account count.
    Tiers from WORKFLOW_ADITYA.md:
      5–10  → CAMPAIGN_COORDINATOR
      11–25 → INDUSTRIAL_ORCHESTRATOR
      25+   → PLATFORM_SCALE
    """
    if downstream_count >= PLATFORM_MIN:
        return "PLATFORM_SCALE"
    elif downstream_count >= ORCHESTRATOR_MIN:
        return "INDUSTRIAL_ORCHESTRATOR"
    elif downstream_count >= COORDINATOR_MIN:
        return "CAMPAIGN_COORDINATOR"
    return "NOT_A_RECRUITER"


class RecruiterDetector:
    """
    Detects and classifies recruiter accounts in the Neo4j transaction graph.
    """

    def __init__(self):
        self.driver = GraphDatabase.driver(
            NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)
        )

    def close(self):
        self.driver.close()

    # ── Detection ─────────────────────────────────────────────────────────────

    def detect_recruiters(self,
                          window_hours: int = DETECTION_WINDOW_HOURS,
                          amount_max: int = WARMING_AMOUNT_MAX,
                          min_downstream: int = COORDINATOR_MIN) -> list[dict]:
        """
        Detect all recruiter accounts using the Cypher from WORKFLOW_ADITYA.md.

        Returns list of dicts with:
          account_id, downstream_count, classification, downstream_accounts
        """
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (recruiter:Account)-[t:TRANSACTED]->(target:Account)
                WHERE t.timestamp > datetime() - duration($window)
                  AND t.amount < $amount_max
                  AND recruiter.account_id <> target.account_id
                WITH recruiter,
                     collect(DISTINCT target.account_id) AS downstream_ids,
                     count(DISTINCT target)              AS cnt
                WHERE cnt >= $min_count
                RETURN recruiter.account_id   AS recruiter_id,
                       recruiter.status        AS recruiter_status,
                       recruiter.warmth_score  AS warmth_score,
                       cnt                     AS downstream_count,
                       downstream_ids
                ORDER BY cnt DESC
                """,
                window=f"PT{window_hours}H",
                amount_max=amount_max,
                min_count=min_downstream,
            )
            rows = [dict(r) for r in result]

        recruiters = []
        for row in rows:
            classification = classify_recruiter(row["downstream_count"])
            entry = {
                "recruiter_id":       row["recruiter_id"],
                "recruiter_status":   row["recruiter_status"],
                "warmth_score":       float(row["warmth_score"] or 0),
                "downstream_count":   row["downstream_count"],
                "classification":     classification,
                "downstream_accounts": list(row["downstream_ids"]),
            }
            recruiters.append(entry)
            log.info(
                "Recruiter detected: %s → %d accounts [%s]",
                row["recruiter_id"], row["downstream_count"], classification
            )

        log.info("Total recruiters found: %d", len(recruiters))
        return recruiters

    def get_campaign_graph(self, recruiter_id: str) -> dict:
        """
        Return full campaign subgraph for a single recruiter:
          - Recruiter node details
          - All downstream account nodes + edge amounts
        """
        with self.driver.session() as session:
            # Recruiter details
            rec_result = session.run(
                "MATCH (r:Account {account_id: $id}) RETURN r",
                id=recruiter_id
            )
            rec_record = rec_result.single()
            if not rec_record:
                return {"error": f"Recruiter {recruiter_id} not found"}
            recruiter_node = dict(rec_record["r"])

            # Downstream accounts + transaction amounts
            edge_result = session.run(
                """
                MATCH (r:Account {account_id: $id})-[t:TRANSACTED]->(target:Account)
                WHERE t.amount < $amount_max
                RETURN target.account_id      AS target_id,
                       target.status          AS target_status,
                       target.warmth_score    AS target_warmth,
                       target.is_mule         AS is_mule,
                       t.amount               AS amount,
                       t.txn_id               AS txn_id,
                       t.channel              AS channel,
                       t.timestamp            AS timestamp
                ORDER BY t.timestamp DESC
                """,
                id=recruiter_id,
                amount_max=WARMING_AMOUNT_MAX,
            )
            edges = []
            downstream_ids = set()
            for row in edge_result:
                downstream_ids.add(row["target_id"])
                edges.append({
                    "target_id":     row["target_id"],
                    "target_status": row["target_status"],
                    "target_warmth": float(row["target_warmth"] or 0),
                    "is_mule":       row["is_mule"],
                    "amount":        row["amount"],
                    "txn_id":        row["txn_id"],
                    "channel":       row["channel"],
                    "timestamp":     str(row["timestamp"]) if row["timestamp"] else None,
                })

        downstream_count = len(downstream_ids)
        return {
            "recruiter": {
                "account_id":      recruiter_node.get("account_id"),
                "status":          recruiter_node.get("status"),
                "warmth_score":    float(recruiter_node.get("warmth_score") or 0),
                "is_mule":         recruiter_node.get("is_mule", False),
            },
            "classification":      classify_recruiter(downstream_count),
            "downstream_count":    downstream_count,
            "downstream_accounts": edges,
        }

    # ── Campaign Freeze ───────────────────────────────────────────────────────

    def freeze_campaign(self, recruiter_id: str,
                        freeze_reason: str = "RECRUITER_CAMPAIGN") -> dict:
        """
        One-click campaign freeze (WORKFLOW_ADITYA.md Day 6).

        Sets FROZEN + frozen_reason on:
          1. The recruiter account itself
          2. ALL connected downstream accounts

        Returns dict with recruiter + list of frozen downstream account IDs.
        """
        with self.driver.session() as session:
            # Freeze recruiter
            session.run(
                """
                MATCH (r:Account {account_id: $id})
                SET r.status        = 'FROZEN',
                    r.frozen_reason = 'RECRUITER',
                    r.is_recruiter  = true,
                    r.frozen_at     = datetime()
                """,
                id=recruiter_id,
            )

            # Freeze all downstream connected accounts
            result = session.run(
                """
                MATCH (r:Account {account_id: $rid})-[t:TRANSACTED]->(target:Account)
                WHERE t.amount < $amount_max
                SET target.status        = 'FROZEN',
                    target.frozen_reason = 'CAMPAIGN_CONNECTED',
                    target.frozen_at     = datetime(),
                    target.recruiter_id  = $rid
                RETURN collect(DISTINCT target.account_id) AS frozen_targets
                """,
                rid=recruiter_id,
                amount_max=WARMING_AMOUNT_MAX,
            )
            record = result.single()
            frozen_targets = list(record["frozen_targets"]) if record else []

            # Write audit node for the freeze action
            session.run(
                """
                CREATE (audit:AuditEvent {
                    event_id:    randomUUID(),
                    actor:       'PRISM_RECRUITER_ENGINE',
                    action:      'CAMPAIGN_FREEZE',
                    target:      $rid,
                    affected:    $frozen,
                    reason:      $reason,
                    timestamp:   datetime()
                })
                """,
                rid=recruiter_id,
                frozen=frozen_targets,
                reason=freeze_reason,
            )

        total_frozen = len(frozen_targets) + 1  # +1 for recruiter itself
        log.warning(
            "[FREEZE] Campaign frozen: recruiter=%s, downstream=%d, total=%d",
            recruiter_id, len(frozen_targets), total_frozen
        )

        return {
            "recruiter_id":     recruiter_id,
            "recruiter_frozen": True,
            "frozen_reason":    "RECRUITER",
            "downstream_frozen": frozen_targets,
            "downstream_count": len(frozen_targets),
            "total_frozen":     total_frozen,
        }


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="PRISM Recruiter Mapper"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--detect",  action="store_true",
                       help="Scan graph for recruiter accounts")
    group.add_argument("--freeze",  type=str, metavar="RECRUITER_ID",
                       help="Freeze a campaign by recruiter account_id")
    group.add_argument("--report",  type=str, metavar="RECRUITER_ID",
                       help="Show full campaign graph for a recruiter")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    detector = RecruiterDetector()
    try:
        if args.detect:
            recruiters = detector.detect_recruiters()
            if args.json:
                print(json.dumps(recruiters, indent=2, default=str))
            else:
                for r in recruiters:
                    print(
                        f"  [{r['classification']}] {r['recruiter_id']} "
                        f"→ {r['downstream_count']} accounts"
                    )

        elif args.freeze:
            result = detector.freeze_campaign(args.freeze)
            if args.json:
                print(json.dumps(result, indent=2, default=str))
            else:
                print(
                    f"\nFrozen: {result['recruiter_id']} "
                    f"+ {result['downstream_count']} downstream accounts "
                    f"(total={result['total_frozen']})"
                )

        elif args.report:
            report = detector.get_campaign_graph(args.report)
            if args.json:
                print(json.dumps(report, indent=2, default=str))
            else:
                print(f"\n{report['recruiter']['account_id']} "
                      f"[{report['classification']}] "
                      f"→ {report['downstream_count']} downstream")

    finally:
        detector.close()


if __name__ == "__main__":
    main()
