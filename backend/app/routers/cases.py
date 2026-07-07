"""Cases — full investigation lifecycle (PRD §5.4).

OPEN → UNDER_REVIEW → PENDING_MLRO → CLOSED_CONFIRMED_MULE | CLOSED_FALSE_POSITIVE.
Every state transition writes both a CaseActivity row and an audit-ledger entry.
Closing a case is an MLRO action (CLOSE_CASE).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import CurrentUser, require
from app.auth.rbac import Permission
from app.core.response import ProblemException, envelope, list_envelope
from app.db.session import get_db
from app.models.alert import Alert
from app.models.audit import Case, CaseActivity, CaseNote
from app.services import audit

router = APIRouter(prefix="/api/v1/cases", tags=["Cases"])

_CLOSED = {"CLOSED_CONFIRMED_MULE", "CLOSED_FALSE_POSITIVE"}
_VALID_STATUS = {
    "OPEN",
    "UNDER_REVIEW",
    "PENDING_MLRO",
    "CLOSED_CONFIRMED_MULE",
    "CLOSED_FALSE_POSITIVE",
}


def _note(n: CaseNote) -> dict:
    return {"id": n.id, "author": n.author, "body": n.body, "created_at": n.created_at.isoformat()}


def _case(c: Case) -> dict:
    return {
        "id": c.id,
        "title": c.title,
        "status": c.status,
        "account_ids": c.account_ids or [],
        "alert_ids": c.alert_ids or [],
        "evidence": c.evidence or [],
        "created_by": c.created_by,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
        "notes": [_note(n) for n in sorted(c.notes, key=lambda x: x.created_at)],
    }


def _get_or_404(db: DbSession, case_id: str) -> Case:
    case = db.get(Case, case_id)
    if case is None:
        raise ProblemException(404, "Case not found", code="not_found")
    return case


class CaseCreate(BaseModel):
    title: str
    account_ids: list[str] = []
    alert_id: str | None = None


@router.get("")
def list_cases(
    status: str | None = Query(None),
    cursor: str | None = Query(None),
    limit: int = Query(25, ge=1, le=100),
    _user: CurrentUser = Depends(require(Permission.VIEW_CASES)),
    db: DbSession = Depends(get_db),
) -> dict:
    stmt = select(Case).order_by(Case.created_at.desc())
    if status:
        stmt = stmt.where(Case.status == status)
    offset = int(cursor) if cursor and cursor.isdigit() else 0
    rows = list(db.execute(stmt.offset(offset).limit(limit + 1)).scalars().all())
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = str(offset + limit) if has_more else None
    return list_envelope([_case(c) for c in rows], cursor=next_cursor)


@router.post("", status_code=201)
def create_case(
    body: CaseCreate,
    user: CurrentUser = Depends(require(Permission.ANNOTATE_CASE)),
    db: DbSession = Depends(get_db),
) -> dict:
    account_ids = list(body.account_ids)
    alert_ids: list[str] = []
    if body.alert_id:
        alert = db.get(Alert, body.alert_id)
        if alert is not None:
            alert_ids.append(alert.id)
            if alert.account_id not in account_ids:
                account_ids.append(alert.account_id)

    case = Case(title=body.title, account_ids=account_ids, alert_ids=alert_ids, created_by=user.email)
    db.add(case)
    db.flush()
    db.add(CaseActivity(case_id=case.id, actor=user.email, action="opened", to_status="OPEN"))
    if body.alert_id and (alert := db.get(Alert, body.alert_id)) is not None:
        alert.case_id = case.id
    audit.record(db, actor=user.email, action="case.open", target=case.id, detail={"title": case.title})
    db.commit()
    return envelope(_case(case))


@router.get("/{case_id}")
def get_case(
    case_id: str,
    _user: CurrentUser = Depends(require(Permission.VIEW_CASES)),
    db: DbSession = Depends(get_db),
) -> dict:
    return envelope(_case(_get_or_404(db, case_id)))


class CaseUpdate(BaseModel):
    status: str | None = None
    title: str | None = None


@router.patch("/{case_id}")
def update_case(
    case_id: str,
    body: CaseUpdate,
    user: CurrentUser = Depends(require(Permission.VIEW_CASES)),
    db: DbSession = Depends(get_db),
) -> dict:
    case = _get_or_404(db, case_id)

    if body.title is not None:
        case.title = body.title

    if body.status is not None and body.status != case.status:
        if body.status not in _VALID_STATUS:
            raise ProblemException(422, "Invalid status", code="bad_request")
        # Closing a case is an MLRO-only action.
        if body.status in _CLOSED and not user.can(Permission.CLOSE_CASE):
            raise ProblemException(
                403, "Closing a case requires MLRO", code="forbidden"
            )
        prev = case.status
        case.status = body.status
        db.add(
            CaseActivity(
                case_id=case.id,
                actor=user.email,
                action="transition",
                from_status=prev,
                to_status=body.status,
            )
        )
        audit.record(
            db,
            actor=user.email,
            action="case.transition",
            target=case.id,
            detail={"from": prev, "to": body.status},
        )

    db.commit()
    return envelope(_case(case))


class NoteBody(BaseModel):
    body: str


@router.post("/{case_id}/notes", status_code=201)
def add_note(
    case_id: str,
    body: NoteBody,
    user: CurrentUser = Depends(require(Permission.ANNOTATE_CASE)),
    db: DbSession = Depends(get_db),
) -> dict:
    _get_or_404(db, case_id)
    note = CaseNote(case_id=case_id, author=user.email, body=body.body)
    db.add(note)
    db.commit()
    return envelope(_note(note))


class EvidenceBody(BaseModel):
    kind: str
    ref: str
    label: str | None = None


@router.post("/{case_id}/evidence")
def attach_evidence(
    case_id: str,
    body: EvidenceBody,
    user: CurrentUser = Depends(require(Permission.ANNOTATE_CASE)),
    db: DbSession = Depends(get_db),
) -> dict:
    case = _get_or_404(db, case_id)
    evidence = list(case.evidence or [])
    evidence.append({"kind": body.kind, "ref": body.ref, "label": body.label, "by": user.email})
    case.evidence = evidence
    audit.record(db, actor=user.email, action="case.evidence", target=case.id, detail={"kind": body.kind})
    db.commit()
    return envelope(_case(case))


@router.get("/{case_id}/activity")
def case_activity(
    case_id: str,
    _user: CurrentUser = Depends(require(Permission.VIEW_CASES)),
    db: DbSession = Depends(get_db),
) -> dict:
    _get_or_404(db, case_id)
    rows = db.execute(
        select(CaseActivity).where(CaseActivity.case_id == case_id).order_by(CaseActivity.at.asc())
    ).scalars().all()
    return envelope(
        [
            {
                "actor": r.actor,
                "action": r.action,
                "from_status": r.from_status,
                "to_status": r.to_status,
                "at": r.at.isoformat(),
            }
            for r in rows
        ]
    )
