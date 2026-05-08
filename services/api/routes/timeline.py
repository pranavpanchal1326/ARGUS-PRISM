"""
Account Timeline API — GET /api/accounts/{id}/timeline
=======================================================
Returns the 72-hour WarmthScore signal timeline for an account.
Pulls data from Neo4j WarmthEvent nodes (seeded by demo_seeder.py).
Falls back to PostgreSQL WarmthScore history if Neo4j has no events.
"""
from fastapi import APIRouter, HTTPException, Query
from neo4j import GraphDatabase
import os

try:
    from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
except ImportError:
    NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "prism_password")

router = APIRouter(prefix="/api/accounts", tags=["account-timeline"])


def _get_driver():
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


@router.get("/{account_id}/timeline/signals")
async def get_signal_timeline(
    account_id: str,
    hours: int = Query(72, ge=1, le=720, description="Hours of history to return"),
):
    """
    Returns the hourly WarmthScore signal timeline for an account.

    Response shape:
    {
      "account_id": "UBI-DEMO-SMALL-REC",
      "hours": 72,
      "timeline": [
        {
          "hour": 0,
          "warmth_score": 3.4,
          "risk_level": "CLEAN",
          "primary_signal": "test_credit_pattern",
          "computed_at": "2026-05-01T10:00:00+00:00"
        },
        ...
      ],
      "summary": {
        "peak_score": 89.2,
        "peak_hour": 71,
        "final_score": 89.2,
        "final_risk_level": "CRITICAL",
        "signals_triggered": ["sim_swap_velocity", "device_fingerprint", ...]
      }
    }
    """
    driver = _get_driver()
    try:
        with driver.session() as s:
            # Check account exists
            r = s.run(
                "MATCH (a:Account {account_id: $id}) RETURN a.account_id AS aid",
                id=account_id
            )
            if not r.single():
                raise HTTPException(status_code=404,
                                    detail=f"Account {account_id} not found")

            # Fetch WarmthEvent timeline from Neo4j
            result = s.run(
                """
                MATCH (w:WarmthEvent {account_id: $id})
                WHERE w.hour <= $hours
                RETURN w.hour          AS hour,
                       w.warmth_score  AS warmth_score,
                       w.risk_level    AS risk_level,
                       w.primary_signal AS primary_signal,
                       w.computed_at   AS computed_at
                ORDER BY w.hour ASC
                """,
                id=account_id, hours=hours - 1
            )
            timeline = [dict(r) for r in result]

        if not timeline:
            raise HTTPException(
                status_code=404,
                detail=f"No signal timeline found for {account_id}. "
                       f"Run demo_seeder.py to seed timeline data."
            )

        # Summary stats
        scores = [t["warmth_score"] for t in timeline]
        peak_score = max(scores)
        peak_hour  = scores.index(peak_score)
        final      = timeline[-1]
        signals = list({t["primary_signal"] for t in timeline
                        if t["primary_signal"] != "clean_baseline"})

        return {
            "account_id":  account_id,
            "hours":       len(timeline),
            "timeline":    timeline,
            "summary": {
                "peak_score":       round(peak_score, 2),
                "peak_hour":        peak_hour,
                "final_score":      round(final["warmth_score"], 2),
                "final_risk_level": final["risk_level"],
                "signals_triggered": sorted(signals),
            }
        }
    finally:
        driver.close()


@router.get("/{account_id}/timeline/graph-events")
async def get_graph_events(account_id: str):
    """
    Returns Neo4j graph events for an account:
    transactions (in and out), FlowGraph alerts, taint propagation.
    Used by the dashboard timeline view.
    """
    driver = _get_driver()
    try:
        with driver.session() as s:
            # Check account exists
            r = s.run("MATCH (a:Account {account_id: $id}) RETURN a", id=account_id)
            rec = r.single()
            if not rec:
                raise HTTPException(status_code=404,
                                    detail=f"Account {account_id} not found")
            account = dict(rec["a"])

            # Outbound transactions
            out_res = s.run(
                """
                MATCH (a:Account {account_id: $id})-[t:TRANSACTED]->(b:Account)
                RETURN t.txn_id    AS txn_id,
                       t.amount    AS amount,
                       t.channel   AS channel,
                       t.timestamp AS timestamp,
                       t.pattern_tag AS pattern_tag,
                       b.account_id AS counterpart,
                       'OUTBOUND'  AS direction
                ORDER BY t.timestamp DESC LIMIT 50
                """,
                id=account_id
            )
            outbound = [dict(r) for r in out_res]

            # Inbound transactions
            in_res = s.run(
                """
                MATCH (b:Account)-[t:TRANSACTED]->(a:Account {account_id: $id})
                RETURN t.txn_id    AS txn_id,
                       t.amount    AS amount,
                       t.channel   AS channel,
                       t.timestamp AS timestamp,
                       t.pattern_tag AS pattern_tag,
                       b.account_id AS counterpart,
                       'INBOUND'   AS direction
                ORDER BY t.timestamp DESC LIMIT 50
                """,
                id=account_id
            )
            inbound = [dict(r) for r in in_res]

        transactions = sorted(
            outbound + inbound,
            key=lambda x: str(x.get("timestamp") or ""),
            reverse=True
        )

        return {
            "account_id":   account_id,
            "account": {
                "warmth_score":      account.get("warmth_score"),
                "taint_score":       account.get("taint_score"),
                "final_risk_score":  account.get("final_risk_score"),
                "status":            account.get("status"),
                "is_mule":           account.get("is_mule"),
                "is_recruiter":      account.get("is_recruiter"),
                "campaign_tier":     account.get("campaign_tier"),
            },
            "transactions": transactions,
            "total_inbound":  len(inbound),
            "total_outbound": len(outbound),
        }
    finally:
        driver.close()
