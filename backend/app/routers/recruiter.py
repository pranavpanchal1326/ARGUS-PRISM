"""Recruiter Map (PRD §5.7) — surface coordinators and freeze whole campaigns."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import CurrentUser, require
from app.auth.rbac import Permission
from app.core.response import ProblemException, envelope
from app.db.session import get_db
from app.engines.recruiter.detector import detect_recruiters, recruiter_campaign
from app.services.freeze import freeze_accounts

router = APIRouter(prefix="/api/v1/recruiters", tags=["Recruiter"])


@router.get("")
def list_recruiters(
    user: CurrentUser = Depends(require(Permission.VIEW_GRAPH)),
    db: DbSession = Depends(get_db),
) -> dict:
    return envelope(detect_recruiters(db, can_pii=user.can(Permission.VIEW_PII)))


@router.get("/{recruiter_id}/campaign")
def get_campaign(
    recruiter_id: str,
    user: CurrentUser = Depends(require(Permission.VIEW_GRAPH)),
    db: DbSession = Depends(get_db),
) -> dict:
    campaign = recruiter_campaign(db, recruiter_id, can_pii=user.can(Permission.VIEW_PII))
    if campaign is None:
        raise ProblemException(404, "Recruiter not found", code="not_found")
    return envelope(campaign)


class FreezeCampaignBody(BaseModel):
    reason: str | None = None


@router.post("/{recruiter_id}/freeze-campaign")
def freeze_campaign(
    recruiter_id: str,
    body: FreezeCampaignBody,
    user: CurrentUser = Depends(require(Permission.FREEZE)),
    db: DbSession = Depends(get_db),
) -> dict:
    campaign = recruiter_campaign(db, recruiter_id, can_pii=False)
    if campaign is None:
        raise ProblemException(404, "Recruiter not found", code="not_found")
    ids = [recruiter_id, *campaign["mule_ids"]]
    result = freeze_accounts(db, ids, actor=user.email, reason=body.reason or "campaign freeze")
    return envelope(result)
