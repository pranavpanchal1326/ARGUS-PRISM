import uuid
import math
from datetime import datetime, timezone
from typing import Optional, List
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field

from ..db.models import get_db, Alert, Account, AuditLog
from ..core.response import success_response, error_response
from ..core.rbac import require_role, UserRole, RBACUser

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])
logger = logging.getLogger("prism.api.alerts")

class ResolveAlertRequest(BaseModel):
    acknowledged_by: str = Field(min_length=2, max_length=100)
    is_false_positive: Optional[bool] = False
    false_positive_reason: Optional[str] = None

class EscalateAlertRequest(BaseModel):
    escalated_by: str = Field(min_length=2, max_length=100)
    notes: Optional[str] = None

def to_dict(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

@router.get("")
async def list_alerts(
    severity: Optional[str] = Query(None),
    is_acknowledged: Optional[bool] = Query(False),  # Default to unacknowledged
    min_score: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: RBACUser = Depends(require_role(UserRole.MLRO, UserRole.FRAUD_ANALYST, UserRole.AUDIT)),
):
    """
    Returns the prioritized global alert queue across all accounts.
    Ordered by warmth_score_at_alert DESC.
    """
    try:
        stmt = select(Alert)
        if severity:
            stmt = stmt.where(Alert.severity == severity)
        if is_acknowledged is not None:
            stmt = stmt.where(Alert.is_acknowledged == is_acknowledged)
        if min_score is not None:
            stmt = stmt.where(Alert.warmth_score_at_alert >= min_score)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Prioritized by score descending (highest risk first)
        stmt = stmt.order_by(Alert.warmth_score_at_alert.desc(), Alert.created_at.desc())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(stmt)
        alerts = result.scalars().all()

        alert_list = []
        for alert in alerts:
            d = to_dict(alert)
            for k, v in d.items():
                if isinstance(v, datetime):
                    d[k] = v.isoformat()
                elif isinstance(v, uuid.UUID):
                    d[k] = str(v)
            alert_list.append(d)

        total_pages = math.ceil(total / page_size) if total > 0 else 1

        return success_response({
            "alerts": alert_list,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        })
    except Exception as e:
        logger.error(f"Error listing global alerts: {e}", exc_info=True)
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content=error_response("Database error", "500"))

@router.patch("/{alert_id}")
async def resolve_alert(
    alert_id: uuid.UUID = Path(...),
    req: ResolveAlertRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    user: RBACUser = Depends(require_role(UserRole.MLRO)),
):
    """
    Resolves/acknowledges a specific alert.
    """
    try:
        stmt = select(Alert).where(Alert.alert_id == alert_id)
        result = await db.execute(stmt)
        alert = result.scalar_one_or_none()

        if not alert:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=404, content=error_response(f"Alert {alert_id} not found", "404"))

        if alert.is_acknowledged:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=400, content=error_response("Alert already resolved", "BAD_REQUEST"))

        alert.is_acknowledged = True
        alert.acknowledged_by = req.acknowledged_by
        alert.acknowledged_at = datetime.now(timezone.utc)
        if req.is_false_positive is not None:
            alert.is_false_positive = req.is_false_positive
            alert.false_positive_reason = req.false_positive_reason

        audit = AuditLog(
            actor=req.acknowledged_by,
            actor_role="MLRO",
            action="ALERT_RESOLVED",
            target_type="ALERT",
            target_id=str(alert_id),
            details={
                "is_false_positive": req.is_false_positive,
                "reason": req.false_positive_reason
            }
        )
        db.add(audit)

        await db.commit()
        return success_response({"alert_id": str(alert_id), "status": "RESOLVED"})

    except Exception as e:
        await db.rollback()
        logger.error(f"Error resolving alert {alert_id}: {e}", exc_info=True)
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content=error_response("Database error", "500"))

@router.patch("/{alert_id}/escalate")
async def escalate_alert(
    alert_id: uuid.UUID = Path(...),
    req: EscalateAlertRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    user: RBACUser = Depends(require_role(UserRole.MLRO)),
):
    """
    Escalates a specific alert to CRITICAL severity for senior review.
    """
    try:
        stmt = select(Alert).where(Alert.alert_id == alert_id)
        result = await db.execute(stmt)
        alert = result.scalar_one_or_none()

        if not alert:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=404, content=error_response(f"Alert {alert_id} not found", "404"))

        alert.severity = "CRITICAL"
        alert.alert_message = f"[ESCALATED] {alert.alert_message}. Notes: {req.notes or 'No notes provided'}"

        audit = AuditLog(
            actor=req.escalated_by,
            actor_role="MLRO",
            action="ALERT_ESCALATED",
            target_type="ALERT",
            target_id=str(alert_id),
            details={
                "notes": req.notes
            }
        )
        db.add(audit)

        await db.commit()
        return success_response({"alert_id": str(alert_id), "status": "ESCALATED", "severity": "CRITICAL"})

    except Exception as e:
        await db.rollback()
        logger.error(f"Error escalating alert {alert_id}: {e}", exc_info=True)
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content=error_response("Database error", "500"))
