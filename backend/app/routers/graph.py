"""Network Graph — the headline screen (PRD §5.6)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import CurrentUser, require
from app.auth.rbac import Permission
from app.core.response import ProblemException, envelope
from app.db.session import get_db
from app.engines.graph.neighborhood import detect_patterns, neighborhood
from app.models.account import Account
from app.services.freeze import freeze_accounts

router = APIRouter(prefix="/api/v1/graph", tags=["Graph"])


@router.get("/neighborhood/{account_id}")
def get_neighborhood(
    account_id: str,
    hops: int = Query(3, ge=1, le=4),
    user: CurrentUser = Depends(require(Permission.VIEW_GRAPH)),
    db: DbSession = Depends(get_db),
) -> dict:
    if db.get(Account, account_id) is None:
        raise ProblemException(404, "Account not found", code="not_found")
    graph = neighborhood(db, account_id, hops=hops, can_pii=user.can(Permission.VIEW_PII))
    return envelope(graph)


@router.get("/patterns/{pattern_type}")
def get_patterns(
    pattern_type: str,
    user: CurrentUser = Depends(require(Permission.VIEW_GRAPH)),
    db: DbSession = Depends(get_db),
) -> dict:
    return envelope(detect_patterns(db, pattern_type, can_pii=user.can(Permission.VIEW_PII)))


class FreezeClusterBody(BaseModel):
    account_ids: list[str]
    reason: str | None = None


@router.post("/freeze-cluster")
def freeze_cluster(
    body: FreezeClusterBody,
    user: CurrentUser = Depends(require(Permission.FREEZE)),
    db: DbSession = Depends(get_db),
) -> dict:
    if not body.account_ids:
        raise ProblemException(422, "no accounts specified", code="bad_request")
    result = freeze_accounts(db, body.account_ids, actor=user.email, reason=body.reason)
    return envelope(result)
