"""Alert Queue — the default landing view (PRD §5.3).

Cursor-paginated, server-sorted. Gated on VIEW_ALERTS so SYS_ADMIN and auditors
never see customer alerts. Escalation requires the ESCALATE permission.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import CurrentUser, require
from app.auth.rbac import Permission
from app.core.domain import AlertStatus
from app.core.response import ProblemException, envelope, list_envelope
from app.db.session import get_db
from app.models.alert import Alert
from app.services.event_bus import emit

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts"])

_SORTS = {
    "score_desc": (Alert.warmth_score.desc(), Alert.id.asc()),
    "score_asc": (Alert.warmth_score.asc(), Alert.id.asc()),
    "newest": (Alert.created_at.desc(), Alert.id.asc()),
    "sla_soonest": (Alert.sla_deadline.asc(), Alert.id.asc()),
}


def _to_dict(a: Alert) -> dict:
    return {
        "id": a.id,
        "account_ref": a.account_ref,
        "warmth_score": a.warmth_score,
        "severity": a.severity,
        "status": a.status,
        "top_signals": a.top_signals or [],
        "first_signal_at": a.first_signal_at.isoformat(),
        "sla_deadline": a.sla_deadline.isoformat() if a.sla_deadline else None,
        "taint_linked": a.taint_linked,
        "assignee": a.assignee,
        "case_id": a.case_id,
    }


class AlertUpdate(BaseModel):
    action: str | None = None  # acknowledge | assign | resolve | mark_false_positive
    assignee: str | None = None
    note: str | None = None


class EscalateBody(BaseModel):
    note: str | None = None


@router.get("")
def list_alerts(
    status: str | None = Query(None),
    severity: str | None = Query(None),
    sort: str = Query("sla_soonest"),
    cursor: str | None = Query(None),
    limit: int = Query(25, ge=1, le=100),
    _user: CurrentUser = Depends(require(Permission.VIEW_ALERTS)),
    db: DbSession = Depends(get_db),
) -> dict:
    stmt = select(Alert)
    if status:
        stmt = stmt.where(Alert.status == status)
    if severity:
        stmt = stmt.where(Alert.severity == severity)

    primary, secondary = _SORTS.get(sort, _SORTS["sla_soonest"])
    stmt = stmt.order_by(primary, secondary)

    offset = 0
    if cursor:
        try:
            offset = max(0, int(cursor))
        except ValueError:
            offset = 0
    rows = list(db.execute(stmt.offset(offset).limit(limit + 1)).scalars().all())
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = str(offset + limit) if has_more else None
    return list_envelope([_to_dict(a) for a in rows], cursor=next_cursor)


@router.get("/{alert_id}")
def get_alert(
    alert_id: str,
    _user: CurrentUser = Depends(require(Permission.VIEW_ALERTS)),
    db: DbSession = Depends(get_db),
) -> dict:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise ProblemException(404, "Alert not found", code="not_found")
    return envelope(_to_dict(alert))


@router.patch("/{alert_id}")
def update_alert(
    alert_id: str,
    body: AlertUpdate,
    user: CurrentUser = Depends(require(Permission.VIEW_ALERTS)),
    db: DbSession = Depends(get_db),
) -> dict:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise ProblemException(404, "Alert not found", code="not_found")

    action = (body.action or "").lower()
    if action == "acknowledge":
        alert.status = AlertStatus.ACKNOWLEDGED.value
    elif action == "assign":
        alert.assignee = body.assignee or user.email
        alert.status = AlertStatus.ASSIGNED.value
    elif action == "resolve":
        alert.status = AlertStatus.RESOLVED.value
    elif action == "mark_false_positive":
        alert.status = AlertStatus.FALSE_POSITIVE.value
    elif action:
        raise ProblemException(422, "Unknown action", code="bad_request")

    emit(db, "alert.updated", {"alert_id": alert.id, "status": alert.status})
    db.commit()
    return envelope(_to_dict(alert))


@router.post("/{alert_id}/escalate")
def escalate_alert(
    alert_id: str,
    body: EscalateBody,
    user: CurrentUser = Depends(require(Permission.ESCALATE)),
    db: DbSession = Depends(get_db),
) -> dict:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise ProblemException(404, "Alert not found", code="not_found")
    alert.status = AlertStatus.ESCALATED.value
    emit(
        db,
        "alert.escalated",
        {"alert_id": alert.id, "by": user.email, "at": datetime.now(UTC).isoformat()},
    )
    db.commit()
    return envelope(_to_dict(alert))
