"""The real pipeline: transaction -> score -> alert cascade.

Every simulated transaction flows through here exactly as a real one would:
persisted, the affected accounts rescored by the WarmthScore engine, alerts raised
when a score crosses WARMING, and events emitted to the Live Feed. Nothing here is
faked — this is the machinery that makes Law 2 true.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.domain import (
    AlertStatus,
    band_for,
    recommended_status,
    response_tier,
)
from app.core.domain import Severity as Sev
from app.engines.warmthscore.engine import ScoreInput, TxnFeature, score
from app.models.account import Account, Device, ScoreHistory, Transaction
from app.models.alert import Alert
from app.services.event_bus import emit

# SLA windows by band (minutes) — PMLA §12 filing pressure, tightening with severity.
_SLA_MINUTES = {Sev.WARMING: 48 * 60, Sev.HOT: 24 * 60, Sev.CRITICAL: 120, Sev.IMMINENT: 30}


def _aware(dt: datetime | None) -> datetime | None:
    """SQLite drops tzinfo; normalise any datetime back to UTC-aware for comparison."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def mask_ref(account_id: str) -> str:
    """PII-safe masked account reference, keeping the bank prefix + last 4 chars."""
    parts = account_id.split("-")
    tail = account_id[-4:]
    prefix = parts[0] if parts else "ACCT"
    return f"{prefix}-****-{tail}"


def _build_input(db: DbSession, account: Account) -> ScoreInput:
    txns = db.execute(
        select(Transaction).where(
            (Transaction.src_account == account.id) | (Transaction.dst_account == account.id)
        )
    ).scalars().all()
    features = [
        TxnFeature(
            ts=t.ts if t.ts.tzinfo else t.ts.replace(tzinfo=UTC),
            amount=t.amount,
            direction="OUT" if t.src_account == account.id else "IN",
            channel=t.channel,
        )
        for t in txns
    ]
    devices = db.execute(
        select(Device).where(Device.account_id == account.id)
    ).scalars().all()
    imeis = list({d.imei for d in devices})
    swaps_72h = sum(
        1
        for d in devices
        if d.event_type == "SIM_SWAP"
        and datetime.now(UTC) - (d.registered_at if d.registered_at.tzinfo else d.registered_at.replace(tzinfo=UTC))
        < timedelta(hours=72)
    )
    reactivated_new_device = any(d.event_type == "UPI_DEVICE_CHANGED" for d in devices) or len(imeis) > 1
    last_active = account.last_active if account.last_active.tzinfo else account.last_active.replace(tzinfo=UTC)
    opened = account.opened_at if account.opened_at.tzinfo else account.opened_at.replace(tzinfo=UTC)
    return ScoreInput(
        segment=account.segment,
        last_active=last_active,
        opened_at=opened,
        transactions=features,
        device_imeis=imeis,
        sim_swaps_72h=swaps_72h,
        dormant_reactivated_new_device=reactivated_new_device,
    )


def rescore_account(db: DbSession, account: Account) -> None:
    """Recompute an account's WarmthScore, persist state, and cascade to an alert.

    The final score is the 6-signal base plus a network contribution from taint
    (proximity to a confirmed mule) — this is the ensemble agreement that lifts a
    tainted network into CRITICAL/IMMINENT, exactly as the old PRD's fusion rule
    intends (warmth alone tops out at HOT).
    """
    result = score(_build_input(db, account))
    prev_score = account.warmth_score

    shap = list(result.shap)
    final_score = result.score
    if account.taint_score > 0:
        final_score = min(100.0, result.score + account.taint_score)
        shap.insert(
            0,
            {
                "code": "NET",
                "label": "tainted network (near confirmed mule)",
                "contribution": round(account.taint_score, 2),
            },
        )
        shap.sort(key=lambda s: s["contribution"], reverse=True)

    band = band_for(final_score)
    account.warmth_score = round(final_score, 2)
    account.severity = band.value
    account.response_tier = response_tier(final_score)
    account.signals = result.signals
    account.shap = shap

    # Recommend a status, but never *downgrade* a human/authority freeze automatically.
    if account.status not in {"FROZEN", "RESTRICTED", "KYC_HOLD"}:
        account.status = recommended_status(final_score).value

    db.add(
        ScoreHistory(
            account_id=account.id,
            score=final_score,
            severity=band.value,
            signals=result.signals,
            shap=shap,
        )
    )

    emit(
        db,
        "score.updated",
        {"account_ref": mask_ref(account.id), "score": final_score, "severity": band.value},
    )

    if band != Sev.CLEAN:
        _raise_or_update_alert(db, account, band, shap)
    # Meaningful jump worth surfacing even below alert threshold is left to the UI feed.
    _ = prev_score


def _raise_or_update_alert(db: DbSession, account: Account, band: Sev, shap: list[dict]) -> None:
    alert = db.execute(
        select(Alert).where(
            Alert.account_id == account.id,
            Alert.status.notin_([AlertStatus.RESOLVED.value, AlertStatus.FALSE_POSITIVE.value]),
        )
    ).scalar_one_or_none()

    now = datetime.now(UTC)
    sla = now + timedelta(minutes=_SLA_MINUTES.get(band, 48 * 60))
    top2 = shap[:2]

    if alert is None:
        alert = Alert(
            account_id=account.id,
            account_ref=mask_ref(account.id),
            warmth_score=account.warmth_score,
            severity=band.value,
            status=AlertStatus.NEW.value,
            top_signals=top2,
            first_signal_at=now,
            sla_deadline=sla,
            taint_linked=account.tainted,
        )
        db.add(alert)
        db.flush()
        emit(
            db,
            "alert.raised",
            {
                "alert_id": alert.id,
                "account_ref": alert.account_ref,
                "severity": band.value,
                "score": account.warmth_score,
            },
        )
    else:
        # Update the live alert in place; escalation keeps the tighter SLA.
        alert.warmth_score = account.warmth_score
        alert.severity = band.value
        alert.top_signals = top2
        alert.taint_linked = account.tainted or alert.taint_linked
        existing_sla = _aware(alert.sla_deadline)
        if existing_sla is None or sla < existing_sla:
            alert.sla_deadline = sla


def ingest_transaction(
    db: DbSession,
    *,
    src: str | None,
    dst: str | None,
    amount: float,
    channel: str = "UPI",
    description: str | None = None,
) -> Transaction:
    """Persist a transaction, emit it, and rescore both counterparties."""
    txn = Transaction(
        src_account=src, dst_account=dst, amount=amount, channel=channel, description=description
    )
    db.add(txn)

    now = datetime.now(UTC)
    for acct_id in {src, dst}:
        if not acct_id:
            continue
        account = db.get(Account, acct_id)
        if account is not None:
            account.last_active = now

    emit(
        db,
        "transaction.posted",
        {
            "src": mask_ref(src) if src else None,
            "dst": mask_ref(dst) if dst else None,
            "amount": amount,
            "channel": channel,
        },
    )

    for acct_id in {src, dst}:
        if not acct_id:
            continue
        account = db.get(Account, acct_id)
        if account is not None:
            rescore_account(db, account)
    return txn
