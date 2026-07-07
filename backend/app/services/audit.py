"""Append-only audit ledger with an HMAC hash-chain.

``record()`` appends an entry whose hash chains to the previous entry's hash.
``verify_chain()`` recomputes the whole chain and reports whether it is intact — the
"Verify ledger" wax-seal action runs this for real. The HMAC key never leaves the
backend; callers only see booleans and counts.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.models.audit import AuditEntry


def _norm_iso(dt: datetime) -> str:
    """Canonical UTC-aware ISO string so the hash is stable across SQLite's tz-drop."""
    return (dt if dt.tzinfo else dt.replace(tzinfo=UTC)).astimezone(UTC).isoformat()


def _digest(seq: int, at_iso: str, actor: str, action: str, target: str, detail: dict, prev: str) -> str:
    settings = get_settings()
    payload = json.dumps(
        {
            "seq": seq,
            "at": at_iso,
            "actor": actor,
            "action": action,
            "target": target,
            "detail": detail,
            "prev": prev,
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return hmac.new(
        settings.audit_hmac_key.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()


def record(
    db: DbSession, *, actor: str, action: str, target: str = "", detail: dict | None = None
) -> AuditEntry:
    """Append an entry to the ledger, chaining it to the previous one."""
    last = db.execute(select(AuditEntry).order_by(AuditEntry.seq.desc()).limit(1)).scalar_one_or_none()
    prev_hash = last.entry_hash if last else ""

    entry = AuditEntry(
        actor=actor, action=action, target=target, detail=detail or {}, prev_hash=prev_hash
    )
    db.add(entry)
    db.flush()  # assign seq
    entry.entry_hash = _digest(
        entry.seq, _norm_iso(entry.at), actor, action, target, entry.detail, prev_hash
    )
    return entry


def verify_chain(db: DbSession) -> dict:
    """Recompute the chain end-to-end. Returns intact flag + entry count."""
    entries = db.execute(select(AuditEntry).order_by(AuditEntry.seq.asc())).scalars().all()
    prev = ""
    for e in entries:
        expected = _digest(e.seq, _norm_iso(e.at), e.actor, e.action, e.target, e.detail, prev)
        if e.prev_hash != prev or e.entry_hash != expected:
            return {"intact": False, "entries": len(entries), "broken_at": e.seq}
        prev = e.entry_hash
    total = db.execute(select(func.count(AuditEntry.seq))).scalar() or 0
    return {"intact": True, "entries": int(total)}
