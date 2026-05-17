import uuid
import math
from datetime import datetime, timezone
from typing import Optional, Literal, List
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field

from ..database.models import get_db, Account, AuditLog, Alert, Case, WarmthScore
from ..cache.redis_client import (
    get_cached_account_summary, cache_account_summary, invalidate_account_cache,
    get_cached_warmth_timeline, cache_warmth_timeline
)
from ..utils.response import success_response, error_response
from ..utils.rbac import require_role, UserRole, RBACUser
from ..utils.encryption import PIIEncryptor

router = APIRouter(prefix="/api/accounts", tags=["Accounts"])
logger = logging.getLogger("prism.api.accounts")

# Request Schemas

class CreateAccountRequest(BaseModel):
    account_id: str = Field(pattern=r"^UBI-\d{4}-\d{6}$")
    account_holder_name: str = Field(min_length=2, max_length=200)
    account_type: Literal["SAVINGS", "CURRENT", "JAN_DHAN"]
    branch_code: str = Field(min_length=6, max_length=6)
    ifsc_code: str = Field(pattern=r"^[A-Z]{4}0[A-Z0-9]{6}$", min_length=11, max_length=11)
    mobile_number: str = Field(pattern=r"^[6-9]\d{9}$")
    account_opened_at: datetime

class UpdateStatusRequest(BaseModel):
    new_status: Literal["ACTIVE", "RESTRICTED", "FROZEN", "CLOSED"]
    reason: str = Field(min_length=10)
    actor: str
    legal_authority: Optional[str] = None

class UpdateKYCRequest(BaseModel):
    new_kyc_status: Literal["COMPLETE", "PENDING", "RE_VERIFICATION", "FAILED"]
    triggered_by: str
    warmth_score_at_trigger: Optional[float] = None
    legal_basis: Optional[str] = None

class FlagMuleRequest(BaseModel):
    confirmed_by: str
    evidence_case_id: uuid.UUID
    confirmation_notes: str = Field(min_length=50)


# Helpers
def to_dict(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

# ROUTES

@router.post("")
async def create_account(
    req: CreateAccountRequest,
    db: AsyncSession = Depends(get_db),
    user: RBACUser = Depends(require_role(UserRole.MLRO, UserRole.ADMIN)),
):
    try:
        stmt = select(Account).where(Account.account_id == req.account_id)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            return error_response(f"Account {req.account_id} already exists.", "409")

        # Encrypt PII before writing to DB — DPDP Act 2023 compliance
        new_account = Account(
            account_id=req.account_id,
            account_holder_name=PIIEncryptor.encrypt(req.account_holder_name),
            account_type=req.account_type,
            branch_code=req.account_code if hasattr(req, 'account_code') else req.branch_code,
            ifsc_code=req.ifsc_code,
            mobile_number=PIIEncryptor.encrypt(req.mobile_number),
            account_opened_at=req.account_opened_at,
            current_warmth_score=0.0,
            warmth_risk_level="CLEAN",
            account_status="ACTIVE",
            kyc_status="COMPLETE",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(new_account)
        
        audit = AuditLog(
            actor="SYSTEM",
            actor_role="SYSTEM",
            action="ACCOUNT_CREATED",
            target_type="ACCOUNT",
            target_id=req.account_id,
            details={"initial_status": "ACTIVE", "initial_score": 0.0}
        )
        db.add(audit)
        
        await db.commit()
        await db.refresh(new_account)
        
        account_dict = to_dict(new_account)
        # Convert datetime to string for cache
        for k, v in account_dict.items():
            if isinstance(v, datetime):
                account_dict[k] = v.isoformat()
                
        await cache_account_summary(req.account_id, account_dict)
        
        # FastAPI handles 201 via response_status, but here we can return JSONResponse or let FastAPI default.
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=201, content=success_response(account_dict, "Account created successfully"))
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating account {req.account_id}: {e}", exc_info=True)
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content=error_response("Database error during account creation", "500"))


@router.get("/{account_id}")
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    user: RBACUser = Depends(require_role(UserRole.MLRO, UserRole.FRAUD_ANALYST, UserRole.AUDIT)),
):
    cached = await get_cached_account_summary(account_id)
    if cached:
        return success_response(cached)
        
    try:
        stmt = select(Account).where(Account.account_id == account_id)
        result = await db.execute(stmt)
        account = result.scalar_one_or_none()
        
        if not account:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=404, content=error_response(f"Account {account_id} not found", "404"))
            
        account_dict = to_dict(account)
        for k, v in account_dict.items():
            if isinstance(v, datetime):
                account_dict[k] = v.isoformat()
            elif isinstance(v, uuid.UUID):
                account_dict[k] = str(v)
                
        await cache_account_summary(account_id, account_dict)
        return success_response(account_dict)
    except Exception as e:
        logger.error(f"Error getting account {account_id}: {e}", exc_info=True)
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content=error_response("Database error", "500"))


@router.get("")
async def list_accounts(
    risk_level: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    is_confirmed_mule: Optional[bool] = Query(None),
    min_score: Optional[float] = Query(None),
    max_score: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: RBACUser = Depends(require_role(UserRole.MLRO, UserRole.FRAUD_ANALYST, UserRole.AUDIT)),
):
    try:
        stmt = select(Account)
        if risk_level:
            stmt = stmt.where(Account.warmth_risk_level == risk_level)
        if status:
            stmt = stmt.where(Account.account_status == status)
        if is_confirmed_mule is not None:
            stmt = stmt.where(Account.is_confirmed_mule == is_confirmed_mule)
        if min_score is not None:
            stmt = stmt.where(Account.current_warmth_score >= min_score)
        if max_score is not None:
            stmt = stmt.where(Account.current_warmth_score <= max_score)
            
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0
        
        stmt = stmt.order_by(Account.current_warmth_score.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(stmt)
        accounts = result.scalars().all()
        
        acc_list = []
        for acc in accounts:
            d = to_dict(acc)
            for k, v in d.items():
                if isinstance(v, datetime):
                    d[k] = v.isoformat()
                elif isinstance(v, uuid.UUID):
                    d[k] = str(v)
            acc_list.append(d)
            
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        
        return success_response({
            "accounts": acc_list,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        })
    except Exception as e:
        logger.error(f"Error listing accounts: {e}", exc_info=True)
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content=error_response("Database error", "500"))


@router.patch("/{account_id}/status")
async def update_account_status(
    account_id: str,
    req: UpdateStatusRequest,
    db: AsyncSession = Depends(get_db),
    user: RBACUser = Depends(require_role(UserRole.MLRO)),
):
    try:
        stmt = select(Account).where(Account.account_id == account_id)
        result = await db.execute(stmt)
        account = result.scalar_one_or_none()
        
        if not account:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=404, content=error_response(f"Account {account_id} not found", "404"))
            
        # Validation rules
        if req.new_status == "ACTIVE" and account.is_confirmed_mule:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=422, content=error_response("Cannot set ACTIVE if is_confirmed_mule=True", "VALIDATION_ERROR"))
            
        if req.new_status == "CLOSED" and len(req.reason) < 20:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=422, content=error_response("CLOSED status requires reason with minimum 20 chars", "VALIDATION_ERROR"))
            
        if req.new_status == "FROZEN" and account.current_warmth_score < 75:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=422, content=error_response("FROZEN status requires warmth_score >= 75", "VALIDATION_ERROR"))
            
        old_status = account.account_status
        account.account_status = req.new_status
        
        audit = AuditLog(
            actor=req.actor,
            actor_role="MLRO",
            action="ACCOUNT_STATUS_UPDATED",
            target_type="ACCOUNT",
            target_id=account_id,
            details={
                "old_status": old_status,
                "new_status": req.new_status,
                "reason": req.reason,
                "legal_authority": req.legal_authority
            }
        )
        db.add(audit)
        
        await db.commit()
        await invalidate_account_cache(account_id)
        
        return success_response({"account_id": account_id, "status": req.new_status})
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating status for {account_id}: {e}", exc_info=True)
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content=error_response("Database error", "500"))


@router.patch("/{account_id}/kyc")
async def update_account_kyc(
    account_id: str,
    req: UpdateKYCRequest,
    db: AsyncSession = Depends(get_db),
    user: RBACUser = Depends(require_role(UserRole.MLRO)),
):
    try:
        stmt = select(Account).where(Account.account_id == account_id)
        result = await db.execute(stmt)
        account = result.scalar_one_or_none()
        
        if not account:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=404, content=error_response(f"Account {account_id} not found", "404"))
            
        old_kyc = account.kyc_status
        account.kyc_status = req.new_kyc_status
        
        if req.new_kyc_status == "RE_VERIFICATION" and (req.warmth_score_at_trigger or account.current_warmth_score) >= 60:
            alert = Alert(
                account_id=account_id,
                alert_type="KYC_REVERIFICATION_TRIGGERED",
                severity="HIGH",
                warmth_score_at_alert=account.current_warmth_score,
                threshold_crossed=60.0,
                alert_message="KYC Re-verification triggered due to hot score.",
            )
            db.add(alert)
            
        audit = AuditLog(
            actor=req.triggered_by,
            actor_role="SYSTEM_OR_MLRO",
            action="KYC_STATUS_UPDATED",
            target_type="ACCOUNT",
            target_id=account_id,
            details={
                "old_kyc": old_kyc,
                "new_kyc": req.new_kyc_status,
                "legal_basis": req.legal_basis
            }
        )
        db.add(audit)
        
        await db.commit()
        await invalidate_account_cache(account_id)
        
        return success_response({"account_id": account_id, "kyc_status": req.new_kyc_status})
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating kyc for {account_id}: {e}", exc_info=True)
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content=error_response("Database error", "500"))


@router.post("/{account_id}/flag-mule")
async def flag_mule(
    account_id: str,
    req: FlagMuleRequest,
    db: AsyncSession = Depends(get_db),
    user: RBACUser = Depends(require_role(UserRole.MLRO)),
):
    try:
        stmt = select(Account).where(Account.account_id == account_id)
        result = await db.execute(stmt)
        account = result.scalar_one_or_none()
        
        if not account:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=404, content=error_response(f"Account {account_id} not found", "404"))
            
        if account.is_confirmed_mule:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=400, content=error_response("Account already confirmed mule", "BAD_REQUEST"))
            
        stmt_case = select(Case).where(Case.case_id == req.evidence_case_id)
        result_case = await db.execute(stmt_case)
        case = result_case.scalar_one_or_none()
        
        if not case:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=404, content=error_response(f"Case {req.evidence_case_id} not found", "404"))
            
        account.is_confirmed_mule = True
        account.account_status = "FROZEN"
        case.case_status = "CLOSED_CONFIRMED_MULE"
        case.closed_at = datetime.now(timezone.utc)
        
        audit = AuditLog(
            actor=req.confirmed_by,
            actor_role="MLRO",
            action="MULE_CONFIRMED",
            target_type="ACCOUNT",
            target_id=account_id,
            details={
                "case_id": str(req.evidence_case_id),
                "notes": req.confirmation_notes
            }
        )
        db.add(audit)
        
        await db.commit()
        await invalidate_account_cache(account_id)
        
        return success_response({"account_id": account_id, "is_confirmed_mule": True, "status": "FROZEN"})
    except Exception as e:
        await db.rollback()
        logger.error(f"Error flagging mule for {account_id}: {e}", exc_info=True)
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content=error_response("Database error", "500"))


@router.get("/{account_id}/timeline")
async def get_account_timeline(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    user: RBACUser = Depends(require_role(UserRole.MLRO, UserRole.FRAUD_ANALYST, UserRole.AUDIT)),
):
    cached = await get_cached_warmth_timeline(account_id)
    if cached:
        return success_response(cached)
        
    try:
        stmt = select(Account).where(Account.account_id == account_id)
        res_acc = await db.execute(stmt)
        if not res_acc.scalar_one_or_none():
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=404, content=error_response(f"Account {account_id} not found", "404"))
            
        stmt_scores = select(WarmthScore).where(WarmthScore.account_id == account_id).order_by(WarmthScore.computed_at.asc()).limit(720)
        res_scores = await db.execute(stmt_scores)
        scores = res_scores.scalars().all()
        
        timeline = []
        for i, s in enumerate(scores):
            timeline.append({
                "hour": i,
                "score": s.warmth_score,
                "risk_level": s.risk_level,
                "primary_signal": s.shap_top1_signal,
                "computed_at": s.computed_at.isoformat() if s.computed_at else None
            })
            
        await cache_warmth_timeline(account_id, timeline)
        return success_response(timeline)
    except Exception as e:
        logger.error(f"Error getting timeline for {account_id}: {e}", exc_info=True)
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content=error_response("Database error", "500"))


@router.get("/{account_id}/alerts")
async def get_account_alerts(
    account_id: str,
    acknowledged: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    user: RBACUser = Depends(require_role(UserRole.MLRO, UserRole.FRAUD_ANALYST, UserRole.AUDIT)),
):
    try:
        stmt = select(Account).where(Account.account_id == account_id)
        res_acc = await db.execute(stmt)
        if not res_acc.scalar_one_or_none():
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=404, content=error_response(f"Account {account_id} not found", "404"))
            
        stmt_alerts = select(Alert).where(Alert.account_id == account_id)
        if acknowledged is not None:
            stmt_alerts = stmt_alerts.where(Alert.is_acknowledged == acknowledged)
        if severity:
            stmt_alerts = stmt_alerts.where(Alert.severity == severity)
            
        stmt_alerts = stmt_alerts.order_by(Alert.created_at.desc()).limit(limit)
        res_alerts = await db.execute(stmt_alerts)
        alerts = res_alerts.scalars().all()
        
        alerts_list = []
        for a in alerts:
            d = to_dict(a)
            for k, v in d.items():
                if isinstance(v, datetime):
                    d[k] = v.isoformat()
                elif isinstance(v, uuid.UUID):
                    d[k] = str(v)
            alerts_list.append(d)
            
        return success_response(alerts_list)
    except Exception as e:
        logger.error(f"Error getting alerts for {account_id}: {e}", exc_info=True)
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content=error_response("Database error", "500"))
