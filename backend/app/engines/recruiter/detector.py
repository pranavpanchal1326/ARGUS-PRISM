"""Recruiter Mapper (proven V2 IP).

Detects the *coordinator* account fanning out small test payments to many mules — the
boss, not the employees. Computed from real transaction edges: an account is a
recruiter if it sends small transfers to many distinct downstream accounts.

Scale classes (old PRD §9.1):
  FACILITATOR 5–9 · COORDINATOR 10–19 · INDUSTRIAL_ORCHESTRATOR 20–49 · NATIONAL_SYNDICATE 50+
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.services.masking import mask_holder
from app.services.pipeline import mask_ref

_FANOUT_MIN = 5
_TEST_PAYMENT_MAX = 10_000.0  # small "test" transfers characteristic of recruiting


def _scale_class(downstream: int) -> str:
    if downstream >= 50:
        return "NATIONAL_SYNDICATE"
    if downstream >= 20:
        return "INDUSTRIAL_ORCHESTRATOR"
    if downstream >= 10:
        return "COORDINATOR"
    return "FACILITATOR"


def _fanout_map(db: DbSession) -> dict[str, dict]:
    """account_id -> {downstream: set, small_total: float, count: int}."""
    from app.models.account import Transaction

    txns = db.execute(
        select(Transaction).where(Transaction.amount <= _TEST_PAYMENT_MAX)
    ).scalars().all()
    stats: dict[str, dict] = {}
    for t in txns:
        if not t.src_account or not t.dst_account:
            continue
        s = stats.setdefault(t.src_account, {"downstream": set(), "total": 0.0, "count": 0})
        s["downstream"].add(t.dst_account)
        s["total"] += t.amount
        s["count"] += 1
    return stats


def detect_recruiters(db: DbSession, *, can_pii: bool = False) -> list[dict]:
    from app.models.account import Account

    stats = _fanout_map(db)
    out: list[dict] = []
    for acct_id, s in stats.items():
        n = len(s["downstream"])
        if n < _FANOUT_MIN:
            continue
        account = db.get(Account, acct_id)
        if account is None:
            continue
        out.append(
            {
                "id": acct_id,
                "account_ref": mask_ref(acct_id),
                "holder": account.holder_name if can_pii else mask_holder(account.holder_name),
                "branch": account.branch,
                "warmth_score": account.warmth_score,
                "downstream_count": n,
                "total_distributed": round(s["total"], 2),
                "scale_class": _scale_class(n),
                "campaign": account.campaign,
            }
        )
    out.sort(key=lambda r: r["downstream_count"], reverse=True)
    return out


def recruiter_campaign(db: DbSession, recruiter_id: str, *, can_pii: bool = False) -> dict | None:
    """The full fan-out subgraph for one recruiter."""
    from app.engines.graph.neighborhood import neighborhood
    from app.models.account import Account, Transaction

    recruiter = db.get(Account, recruiter_id)
    if recruiter is None:
        return None

    downstream_ids = [
        dst
        for (dst,) in db.execute(
            select(Transaction.dst_account).where(
                Transaction.src_account == recruiter_id,
                Transaction.amount <= _TEST_PAYMENT_MAX,
                Transaction.dst_account.isnot(None),
            )
        ).all()
    ]
    unique = sorted(set(downstream_ids))
    sub = neighborhood(db, recruiter_id, hops=1, can_pii=can_pii)
    return {
        "recruiter": {
            "id": recruiter_id,
            "account_ref": mask_ref(recruiter_id),
            "scale_class": _scale_class(len(unique)),
            "downstream_count": len(unique),
        },
        "mule_ids": unique,
        "nodes": sub["nodes"],
        "edges": sub["edges"],
    }
