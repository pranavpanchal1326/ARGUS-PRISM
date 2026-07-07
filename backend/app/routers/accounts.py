"""Accounts — lookup + forensic detail (PRD §5.5).

Gated on VIEW_ACCOUNTS (MLRO + FRAUD_ANALYST). PII is masked unless the role holds
VIEW_PII (MLRO). Freeze/restrict actions require FREEZE (MLRO); the server re-checks
the role regardless of what the UI allows.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import CurrentUser, require
from app.auth.rbac import Permission
from app.core.domain import AccountStatus, recommended_status
from app.core.response import ProblemException, envelope, list_envelope
from app.db.session import get_db
from app.models.account import Account, Device, ScoreHistory, Transaction
from app.services.event_bus import emit
from app.services.masking import mask_holder, mask_imei
from app.services.pipeline import mask_ref

router = APIRouter(prefix="/api/v1/accounts", tags=["Accounts"])


def _summary(a: Account, *, can_pii: bool) -> dict:
    return {
        "id": a.id,
        "account_ref": mask_ref(a.id),
        "holder": a.holder_name if can_pii else mask_holder(a.holder_name),
        "branch": a.branch,
        "segment": a.segment,
        "warmth_score": a.warmth_score,
        "severity": a.severity,
        "status": a.status,
        "tainted": a.tainted,
    }


def _detail(a: Account, *, can_pii: bool) -> dict:
    return {
        **_summary(a, can_pii=can_pii),
        "ifsc": a.ifsc,
        "kyc_status": a.kyc_status,
        "status_reason": a.status_reason,
        "response_tier": a.response_tier,
        "taint_score": a.taint_score,
        "opened_at": a.opened_at.isoformat(),
        "last_active": a.last_active.isoformat(),
        "pii_masked": not can_pii,
        "top_signals": (a.shap or [])[:3],
    }


@router.get("")
def list_accounts(
    query: str | None = Query(None),
    risk_tier: str | None = Query(None),
    cursor: str | None = Query(None),
    limit: int = Query(25, ge=1, le=100),
    user: CurrentUser = Depends(require(Permission.VIEW_ACCOUNTS)),
    db: DbSession = Depends(get_db),
) -> dict:
    stmt = select(Account)
    if query:
        like = f"%{query}%"
        stmt = stmt.where((Account.id.ilike(like)) | (Account.holder_name.ilike(like)))
    if risk_tier:
        stmt = stmt.where(Account.severity == risk_tier)
    stmt = stmt.order_by(Account.warmth_score.desc(), Account.id.asc())

    offset = int(cursor) if cursor and cursor.isdigit() else 0
    rows = list(db.execute(stmt.offset(offset).limit(limit + 1)).scalars().all())
    has_more = len(rows) > limit
    rows = rows[:limit]
    can_pii = user.can(Permission.VIEW_PII)
    next_cursor = str(offset + limit) if has_more else None
    return list_envelope([_summary(a, can_pii=can_pii) for a in rows], cursor=next_cursor)


def _get_or_404(db: DbSession, account_id: str) -> Account:
    account = db.get(Account, account_id)
    if account is None:
        raise ProblemException(404, "Account not found", code="not_found")
    return account


@router.get("/{account_id}")
def get_account(
    account_id: str,
    user: CurrentUser = Depends(require(Permission.VIEW_ACCOUNTS)),
    db: DbSession = Depends(get_db),
) -> dict:
    account = _get_or_404(db, account_id)
    return envelope(_detail(account, can_pii=user.can(Permission.VIEW_PII)))


@router.get("/{account_id}/score-history")
def score_history(
    account_id: str,
    _user: CurrentUser = Depends(require(Permission.VIEW_ACCOUNTS)),
    db: DbSession = Depends(get_db),
) -> dict:
    _get_or_404(db, account_id)
    rows = db.execute(
        select(ScoreHistory)
        .where(ScoreHistory.account_id == account_id)
        .order_by(ScoreHistory.ts.asc())
    ).scalars().all()
    return envelope(
        [
            {"ts": r.ts.isoformat(), "score": r.score, "severity": r.severity, "shap": r.shap or []}
            for r in rows
        ]
    )


@router.get("/{account_id}/transactions")
def transactions(
    account_id: str,
    cursor: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    _user: CurrentUser = Depends(require(Permission.VIEW_ACCOUNTS)),
    db: DbSession = Depends(get_db),
) -> dict:
    _get_or_404(db, account_id)
    stmt = (
        select(Transaction)
        .where((Transaction.src_account == account_id) | (Transaction.dst_account == account_id))
        .order_by(Transaction.ts.desc())
    )
    offset = int(cursor) if cursor and cursor.isdigit() else 0
    rows = list(db.execute(stmt.offset(offset).limit(limit + 1)).scalars().all())
    has_more = len(rows) > limit
    rows = rows[:limit]
    out = []
    for t in rows:
        outgoing = t.src_account == account_id
        counterparty = t.dst_account if outgoing else t.src_account
        out.append(
            {
                "id": t.id,
                "ts": t.ts.isoformat(),
                "counterparty_ref": mask_ref(counterparty) if counterparty else None,
                "amount": t.amount,
                "direction": "OUT" if outgoing else "IN",
                "channel": t.channel,
                "description": t.description,
            }
        )
    next_cursor = str(offset + limit) if has_more else None
    return list_envelope(out, cursor=next_cursor)


@router.get("/{account_id}/devices")
def devices(
    account_id: str,
    _user: CurrentUser = Depends(require(Permission.VIEW_ACCOUNTS)),
    db: DbSession = Depends(get_db),
) -> dict:
    _get_or_404(db, account_id)
    rows = db.execute(
        select(Device).where(Device.account_id == account_id).order_by(Device.registered_at.desc())
    ).scalars().all()
    return envelope(
        [
            {
                "imei": mask_imei(d.imei),
                "event_type": d.event_type,
                "registered_at": d.registered_at.isoformat(),
            }
            for d in rows
        ]
    )


@router.get("/{account_id}/signals")
def signals(
    account_id: str,
    _user: CurrentUser = Depends(require(Permission.VIEW_ACCOUNTS)),
    db: DbSession = Depends(get_db),
) -> dict:
    account = _get_or_404(db, account_id)
    return envelope(
        {"score": account.warmth_score, "signals": account.signals or {}, "shap": account.shap or []}
    )


class AccountActionBody(BaseModel):
    action: str  # freeze | restrict | kyc_review | unfreeze
    reason: str | None = None


@router.post("/{account_id}/actions")
def account_action(
    account_id: str,
    body: AccountActionBody,
    user: CurrentUser = Depends(require(Permission.FREEZE)),
    db: DbSession = Depends(get_db),
) -> dict:
    account = _get_or_404(db, account_id)
    action = body.action.lower()

    if action == "freeze":
        # Freezing a confirmed mule seeds taint into its network (shared helper).
        from app.services.freeze import freeze_accounts

        freeze_accounts(db, [account.id], actor=user.email, reason=body.reason)
        db.refresh(account)
        return envelope(_detail(account, can_pii=user.can(Permission.VIEW_PII)))

    mapping = {
        "restrict": AccountStatus.RESTRICTED,
        "kyc_review": AccountStatus.KYC_HOLD,
    }
    if action in mapping:
        account.status = mapping[action].value
        account.status_reason = body.reason or f"{action} by {user.email}"
    elif action == "unfreeze":
        account.status = recommended_status(account.warmth_score).value
        account.status_reason = f"unfrozen by {user.email}"
    else:
        raise ProblemException(422, "Unknown action", code="bad_request")

    emit(
        db,
        "account.action",
        {"account_ref": mask_ref(account.id), "action": action, "by": user.email},
    )
    db.commit()
    return envelope(_detail(account, can_pii=user.can(Permission.VIEW_PII)))
