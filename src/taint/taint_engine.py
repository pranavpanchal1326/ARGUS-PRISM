"""
ARGUS-PRISM Taint Propagation Engine — Phase 5
================================================
On FlowGraph mule confirmation, back-traces 4 hops upstream in the
transaction graph and assigns decaying taint scores to all upstream accounts.

Taint Decay (WORKFLOW_ADITYA.md Day 5):
  Hop 1 = 80  — direct funder of mule (very high risk)
  Hop 2 = 55  — two hops removed
  Hop 3 = 30  — three hops removed
  Hop 4 = 15  — four hops removed (background noise threshold)

Compound scoring (PRISM.md):
  final_risk_score = min(100, taint_score * 0.6 + warmth_score * 0.4)

Usage:
    python taint_engine.py --mule UBI-2026-000042       # propagate from one mule
    python taint_engine.py --mule UBI-2026-000042 --json
    python taint_engine.py --score UBI-2026-000001       # compute final risk score
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
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "prism_password")

from neo4j import GraphDatabase

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("prism.taint.engine")

# ── Taint decay constants (from WORKFLOW_ADITYA.md) ───────────────────────────
TAINT_DECAY: dict[int, int] = {1: 80, 2: 55, 3: 30, 4: 15}
MAX_HOPS = 4


class TaintEngine:
    """
    Taint Propagation Engine.

    Confirms a mule account, then walks upstream through TRANSACTED
    edges up to 4 hops, writing decaying taint_score values to each
    upstream Account node.
    """

    def __init__(self):
        self.driver = GraphDatabase.driver(
            NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)
        )

    def close(self):
        self.driver.close()

    # ── Core: 4-hop back-trace ─────────────────────────────────────────────────

    def propagate_taint(self, mule_account_id: str) -> list[dict]:
        """
        Step 1: Mark the mule account as confirmed.
        Step 2: Back-trace up to 4 hops upstream.
        Step 3: Write decaying taint_score to each upstream node.

        Returns list of affected accounts with their taint scores.
        Exact Cypher from WORKFLOW_ADITYA.md:

            MATCH path = (mule:Account {account_id: $mule_id})
                         <-[:TRANSACTED*1..4]-(upstream)
            WITH upstream, length(path) AS hop_distance
            SET upstream.taint_score = CASE hop_distance
                WHEN 1 THEN 80 WHEN 2 THEN 55 WHEN 3 THEN 30 WHEN 4 THEN 15
            END
            RETURN upstream.account_id, hop_distance, upstream.taint_score
        """
        affected = []

        with self.driver.session() as session:
            # Mark the mule as confirmed
            session.run(
                """
                MATCH (m:Account {account_id: $id})
                SET m.is_mule = true,
                    m.status  = 'FROZEN',
                    m.taint_score = 100,
                    m.mule_confirmed_at = datetime()
                """,
                id=mule_account_id,
            )
            log.info("Mule confirmed: %s (taint=100)", mule_account_id)

            # Back-trace 4 hops and assign decaying taint scores
            # Using Python-side write per record (workflow spec pattern) to handle
            # the "SET inside CASE" Neo4j limitation cleanly
            result = session.run(
                """
                MATCH path = (mule:Account {account_id: $mule_id})
                             <-[:TRANSACTED*1..4]-(upstream)
                WHERE upstream.account_id <> $mule_id
                WITH upstream, min(length(path)) AS hop_distance
                RETURN upstream.account_id AS uid, hop_distance
                ORDER BY hop_distance ASC
                """,
                mule_id=mule_account_id,
            )
            upstream_accounts = [(r["uid"], r["hop_distance"]) for r in result]

        # Write taint scores — one transaction per account for idempotency
        for uid, hops in upstream_accounts:
            score = TAINT_DECAY.get(hops, 0)
            if score == 0:
                continue
            with self.driver.session() as session:
                session.run(
                    """
                    MATCH (a:Account {account_id: $uid})
                    SET a.taint_score    = $score,
                        a.taint_hop      = $hops,
                        a.taint_source   = $source,
                        a.taint_updated_at = datetime()
                    """,
                    uid=uid, score=score, hops=hops, source=mule_account_id,
                )
            affected.append({
                "account_id": uid,
                "hop_distance": hops,
                "taint_score": score,
            })
            log.info("  Hop %d: %s → taint=%d", hops, uid, score)

        log.info(
            "Taint propagation complete: %d upstream accounts affected from %s",
            len(affected), mule_account_id
        )
        return affected

    def get_taint_score(self, account_id: str) -> float:
        """Read taint_score from Neo4j. Returns 0.0 if not set."""
        with self.driver.session() as session:
            result = session.run(
                "MATCH (a:Account {account_id: $id}) RETURN a.taint_score AS ts",
                id=account_id
            )
            record = result.single()
            if record and record["ts"] is not None:
                return float(record["ts"])
        return 0.0

    def get_warmth_score(self, account_id: str) -> float:
        """Read warmth_score from Neo4j. Returns 0.0 if not set."""
        with self.driver.session() as session:
            result = session.run(
                "MATCH (a:Account {account_id: $id}) RETURN a.warmth_score AS ws",
                id=account_id
            )
            record = result.single()
            if record and record["ws"] is not None:
                return float(record["ws"])
        return 0.0

    # ── Compound scoring ───────────────────────────────────────────────────────

    def compute_final_score(self, account_id: str) -> dict:
        """
        Compound scoring formula (WORKFLOW_ADITYA.md Day 5):
            final_risk_score = min(100, taint_score * 0.6 + warmth_score * 0.4)

        Returns dict with component scores and final risk.
        """
        taint  = self.get_taint_score(account_id)
        warmth = self.get_warmth_score(account_id)
        final  = min(100.0, taint * 0.6 + warmth * 0.4)

        result = {
            "account_id": account_id,
            "taint_score": taint,
            "warmth_score": warmth,
            "final_risk_score": round(final, 2),
            "risk_level": self._risk_level(final),
        }

        # Write final_risk_score back to Neo4j
        with self.driver.session() as session:
            session.run(
                """
                MATCH (a:Account {account_id: $id})
                SET a.final_risk_score = $score,
                    a.risk_level       = $level,
                    a.score_updated_at = datetime()
                """,
                id=account_id,
                score=round(final, 2),
                level=result["risk_level"],
            )

        log.info(
            "Final score for %s: taint=%.1f warmth=%.1f → risk=%.2f [%s]",
            account_id, taint, warmth, final, result["risk_level"]
        )
        return result

    def compute_all_final_scores(self, account_ids: list[str]) -> list[dict]:
        """Compute compound scores for a list of accounts."""
        return [self.compute_final_score(aid) for aid in account_ids]

    @staticmethod
    def _risk_level(score: float) -> str:
        """Map final_risk_score to human-readable risk level."""
        if score >= 80:
            return "CRITICAL"
        elif score >= 60:
            return "HIGH"
        elif score >= 40:
            return "MEDIUM"
        elif score >= 20:
            return "LOW"
        return "MINIMAL"

    # ── Taint report ──────────────────────────────────────────────────────────

    def get_taint_report(self, mule_account_id: str) -> dict:
        """Return a full taint propagation report for a mule account."""
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (mule:Account {account_id: $id})
                OPTIONAL MATCH path = (mule)<-[:TRANSACTED*1..4]-(upstream)
                WHERE upstream.taint_source = $id
                RETURN
                    mule.account_id    AS mule_id,
                    mule.taint_score   AS mule_taint,
                    mule.status        AS mule_status,
                    upstream.account_id  AS upstream_id,
                    upstream.taint_score AS upstream_taint,
                    upstream.taint_hop   AS hop
                ORDER BY hop
                """,
                id=mule_account_id,
            )
            rows = [dict(r) for r in result]

        report = {
            "mule_id": mule_account_id,
            "mule_taint": rows[0]["mule_taint"] if rows else 100,
            "mule_status": rows[0]["mule_status"] if rows else "FROZEN",
            "upstream_count": sum(1 for r in rows if r.get("upstream_id")),
            "upstream_by_hop": {},
        }
        for row in rows:
            if not row.get("upstream_id"):
                continue
            hop = str(row["hop"])
            report["upstream_by_hop"].setdefault(hop, []).append({
                "account_id": row["upstream_id"],
                "taint_score": row["upstream_taint"],
            })
        return report


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="PRISM Taint Propagation Engine"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--mule", type=str, help="Confirm mule and propagate taint")
    group.add_argument("--score", type=str, help="Compute final risk score for account")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    engine = TaintEngine()
    try:
        if args.mule:
            affected = engine.propagate_taint(args.mule)
            result = {
                "mule_id": args.mule,
                "affected_count": len(affected),
                "affected": affected,
            }
            if args.json:
                print(json.dumps(result, indent=2, default=str))
            else:
                print(f"\nTaint propagated from {args.mule}:")
                for a in affected:
                    print(f"  Hop {a['hop_distance']}: {a['account_id']} → taint={a['taint_score']}")

        elif args.score:
            result = engine.compute_final_score(args.score)
            if args.json:
                print(json.dumps(result, indent=2, default=str))
            else:
                print(
                    f"\n{args.score}: taint={result['taint_score']} "
                    f"warmth={result['warmth_score']} "
                    f"→ final={result['final_risk_score']} [{result['risk_level']}]"
                )
    finally:
        engine.close()


if __name__ == "__main__":
    main()
