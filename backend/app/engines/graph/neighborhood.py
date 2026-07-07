"""FlowGraph neighborhood + pattern detection over the real transaction graph.

Built directly from the relational transaction edges (accounts = nodes, transactions
= weighted directed edges), so it works with or without Neo4j and every node/edge is
backed by real rows. Node heat = WarmthScore; amber ring = tainted; edge weight = value.
"""

from __future__ import annotations

from collections import defaultdict, deque

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.services.masking import mask_holder
from app.services.pipeline import mask_ref

# lazy import inside functions to avoid model import cycles at module load


def _node(account, *, can_pii: bool) -> dict:
    return {
        "id": account.id,
        "account_ref": mask_ref(account.id),
        "holder": account.holder_name if can_pii else mask_holder(account.holder_name),
        "warmth_score": account.warmth_score,
        "severity": account.severity,
        "status": account.status,
        "tainted": account.tainted,
        "is_recruiter": account.campaign is not None and account.is_ground_truth_mule,
    }


def neighborhood(db: DbSession, account_id: str, *, hops: int = 3, can_pii: bool = False) -> dict:
    """Return the node/edge subgraph within ``hops`` of an account."""
    from app.models.account import Account, Transaction

    if db.get(Account, account_id) is None:
        return {"nodes": [], "edges": [], "root": account_id}

    # BFS to collect account ids within N hops.
    visited: set[str] = {account_id}
    frontier: deque[tuple[str, int]] = deque([(account_id, 0)])
    while frontier:
        node_id, depth = frontier.popleft()
        if depth >= hops:
            continue
        rows = db.execute(
            select(Transaction.src_account, Transaction.dst_account).where(
                (Transaction.src_account == node_id) | (Transaction.dst_account == node_id)
            )
        ).all()
        for src, dst in rows:
            for nb in (src, dst):
                if nb and nb not in visited:
                    visited.add(nb)
                    frontier.append((nb, depth + 1))

    accounts = db.execute(select(Account).where(Account.id.in_(visited))).scalars().all()
    nodes = [_node(a, can_pii=can_pii) for a in accounts]

    # Aggregate edges (sum value + count) between visited nodes.
    agg: dict[tuple[str, str], dict] = defaultdict(lambda: {"value": 0.0, "count": 0})
    txns = db.execute(
        select(Transaction).where(
            Transaction.src_account.in_(visited), Transaction.dst_account.in_(visited)
        )
    ).scalars().all()
    for t in txns:
        if not t.src_account or not t.dst_account:
            continue
        key = (t.src_account, t.dst_account)
        agg[key]["value"] += t.amount
        agg[key]["count"] += 1
    edges = [
        {"source": s, "target": d, "value": round(v["value"], 2), "count": v["count"]}
        for (s, d), v in agg.items()
    ]
    return {"root": account_id, "nodes": nodes, "edges": edges}


def detect_patterns(db: DbSession, pattern_type: str, *, can_pii: bool = False) -> list[dict]:
    """Detect layering / round-trip / structuring subgraphs among watched accounts."""
    from app.models.account import Account

    pattern_type = pattern_type.lower()
    watched = db.execute(
        select(Account).where(Account.severity != "CLEAN").order_by(Account.warmth_score.desc())
    ).scalars().all()

    results: list[dict] = []
    for a in watched[:25]:
        signals = a.signals or {}
        hit = (
            (pattern_type in {"round_trip", "round-trip", "layering"} and signals.get("S2", 0) > 0.4)
            or (pattern_type == "structuring" and signals.get("S3", 0) > 0.3)
            or (pattern_type in {"velocity", "any"} and a.warmth_score >= 55)
        )
        if hit:
            sub = neighborhood(db, a.id, hops=1, can_pii=can_pii)
            results.append(
                {
                    "anchor": mask_ref(a.id),
                    "anchor_id": a.id,
                    "severity": a.severity,
                    "warmth_score": a.warmth_score,
                    "nodes": sub["nodes"],
                    "edges": sub["edges"],
                }
            )
    return results
