"""Freeze a set of accounts and propagate taint from each confirmed mule.

Shared by the account freeze action, graph freeze-cluster, and recruiter
freeze-campaign so the taint cascade is identical everywhere.
"""

from __future__ import annotations

from sqlalchemy.orm import Session as DbSession

from app.core.domain import AccountStatus
from app.engines.taint.propagation import propagate_taint
from app.models.account import Account
from app.services import audit
from app.services.event_bus import emit
from app.services.pipeline import mask_ref


def freeze_accounts(
    db: DbSession, account_ids: list[str], *, actor: str, reason: str | None
) -> dict:
    frozen_refs: list[str] = []
    tainted_total = 0
    for account_id in account_ids:
        account = db.get(Account, account_id)
        if account is None:
            continue
        account.status = AccountStatus.FROZEN.value
        account.status_reason = reason or f"frozen by {actor}"
        frozen_refs.append(mask_ref(account.id))
        emit(db, "account.action", {"account_ref": mask_ref(account.id), "action": "freeze", "by": actor})
        audit.record(
            db, actor=actor, action="account.freeze", target=account.id, detail={"reason": reason}
        )
        # A confirmed (frozen) mule seeds taint into its network.
        tainted_total += propagate_taint(db, account_id)
    db.commit()
    return {"frozen": len(frozen_refs), "tainted": tainted_total, "account_refs": frozen_refs}
