"""Compliance — audit ledger + verify + fairness (PRD §5.9).

Read-only for COMPLIANCE_AUDITOR and MLRO (VIEW_AUDIT/VIEW_REPORTS). The ledger view
exposes only a short fingerprint per entry (last 8 of the chain hash) — never the HMAC
key or the full hash chain material (Law 3).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import CurrentUser, require
from app.auth.rbac import Permission
from app.core.response import envelope, list_envelope
from app.db.session import get_db
from app.models.account import Account
from app.models.alert import Alert
from app.models.audit import AuditEntry
from app.services import audit

router = APIRouter(prefix="/api/v1", tags=["Compliance"])


@router.get("/audit")
def get_audit(
    actor: str | None = Query(None),
    action: str | None = Query(None),
    cursor: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    _user: CurrentUser = Depends(require(Permission.VIEW_AUDIT)),
    db: DbSession = Depends(get_db),
) -> dict:
    stmt = select(AuditEntry).order_by(AuditEntry.seq.desc())
    if actor:
        stmt = stmt.where(AuditEntry.actor == actor)
    if action:
        stmt = stmt.where(AuditEntry.action == action)
    offset = int(cursor) if cursor and cursor.isdigit() else 0
    rows = list(db.execute(stmt.offset(offset).limit(limit + 1)).scalars().all())
    has_more = len(rows) > limit
    rows = rows[:limit]
    out = [
        {
            "seq": e.seq,
            "at": e.at.isoformat(),
            "actor": e.actor,
            "action": e.action,
            "target": e.target,
            "detail": e.detail or {},
            "fingerprint": e.entry_hash[-8:],  # chain marker only — not key material
        }
        for e in rows
    ]
    next_cursor = str(offset + limit) if has_more else None
    return list_envelope(out, cursor=next_cursor)


@router.get("/audit/verify")
def verify_audit(
    _user: CurrentUser = Depends(require(Permission.VIEW_AUDIT)),
    db: DbSession = Depends(get_db),
) -> dict:
    return envelope(audit.verify_chain(db))


@router.get("/compliance/reports")
def compliance_reports(
    _user: CurrentUser = Depends(require(Permission.VIEW_REPORTS)),
    db: DbSession = Depends(get_db),
) -> dict:
    # Registered scheduled reports (real config). last_generated is null until a run.
    registry = [
        {"id": "fiu-str-monthly", "name": "FIU-IND STR filing", "cadence": "on-demand", "last_generated": None},
        {"id": "rbi-quarterly", "name": "RBI supervisory return", "cadence": "quarterly", "last_generated": None},
        {"id": "dpdp-fairness", "name": "DPDP fairness audit", "cadence": "monthly", "last_generated": None},
    ]
    return envelope(registry)


@router.get("/compliance/fairness")
def fairness(
    _user: CurrentUser = Depends(require(Permission.VIEW_REPORTS)),
    db: DbSession = Depends(get_db),
) -> dict:
    """Computed false-positive metrics by customer segment (the DPDP story)."""
    segments = db.execute(select(Account.segment).distinct()).scalars().all()
    fp_alerts = {
        aid
        for (aid,) in db.execute(
            select(Alert.account_id).where(Alert.status == "FALSE_POSITIVE")
        ).all()
    }
    seg_rows = []
    total_flagged = 0
    total_fp = 0
    for seg in segments:
        accounts = db.execute(select(Account).where(Account.segment == seg)).scalars().all()
        flagged = [a for a in accounts if a.severity != "CLEAN"]
        fp = [a for a in flagged if a.id in fp_alerts]
        total_flagged += len(flagged)
        total_fp += len(fp)
        seg_rows.append(
            {
                "segment": seg,
                "accounts": len(accounts),
                "flagged": len(flagged),
                "false_positive_rate": round(len(fp) / len(flagged), 3) if flagged else 0.0,
            }
        )
    overall = round(total_fp / total_flagged, 3) if total_flagged else 0.0
    return envelope({"overall_fp_rate": overall, "segments": seg_rows})
