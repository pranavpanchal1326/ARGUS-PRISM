"""
services/api/utils/audit.py

Immutable Audit Log Writer for ARGUS-PRISM.

Every legal action, RBAC-gated decision, and score threshold trigger
is recorded here. The audit_log table is protected by PostgreSQL RULE
at the DB level (see schema.sql) — no UPDATE or DELETE is permitted.

Format per PRISM security spec (Section 6.2, Layer 3):
    timestamp + actor + actor_role + action + target + details

Usage:
    await AuditLogWriter.write(
        actor="mlro_user",
        actor_role="MLRO",
        action="APPROVE_STR",
        target_type="Case",
        target_id=str(case_id),
        details={"str_reference": "FIU-2026-001"},
        db=session,
        request=request,
    )
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.models import AuditLog

logger = logging.getLogger("prism.audit")


class AuditLogWriter:
    """
    Write-only interface to the immutable audit log.

    All methods are static — no state. The PostgreSQL table enforces
    immutability via RULE (see schema.sql). This class never exposes
    UPDATE or DELETE operations.
    """

    @staticmethod
    async def write(
        actor: str,
        actor_role: str,
        action: str,
        db: AsyncSession,
        target_type: Optional[str] = None,
        target_id:   Optional[str] = None,
        details:     Optional[dict[str, Any]] = None,
        request:     Optional[Request] = None,
    ) -> AuditLog:
        """
        Append a single immutable audit log entry.

        Args:
            actor:       Username or system identifier taking the action
            actor_role:  RBAC role of the actor (MLRO, FRAUD_ANALYST, etc.)
            action:      Verb describing the action (APPROVE_STR, CONFIRM_MULE, etc.)
            db:          Async SQLAlchemy session
            target_type: Entity type being acted upon (Account, Case, Alert, etc.)
            target_id:   Identifier of the entity
            details:     Arbitrary JSONB payload for context (never raw PII)
            request:     FastAPI Request object (used to extract IP + session)

        Returns:
            The persisted AuditLog instance.
        """
        ip_address: Optional[str] = None
        session_id: Optional[str] = None

        if request is not None:
            # Extract real IP (respects X-Forwarded-For from Railway proxy)
            forwarded = request.headers.get("X-Forwarded-For")
            ip_address = forwarded.split(",")[0].strip() if forwarded else (
                request.client.host if request.client else None
            )
            session_id = request.headers.get("X-PRISM-Session")

        entry = AuditLog(
            actor=actor,
            actor_role=actor_role,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details or {},
            ip_address=ip_address,
            session_id=session_id,
            timestamp=datetime.now(timezone.utc),
        )

        db.add(entry)
        await db.commit()
        await db.refresh(entry)

        logger.info(
            f"AUDIT | actor={actor!r} role={actor_role} action={action} "
            f"target={target_type}:{target_id} session={session_id}"
        )

        return entry

    @staticmethod
    async def log_legal_trigger(
        account_id:    str,
        warmth_score:  float,
        threshold:     float,
        action_taken:  str,
        legal_basis:   str,
        db:            AsyncSession,
    ) -> AuditLog:
        """
        Convenience method for automated legal trigger events.
        Actor is 'PRISM_SYSTEM' — distinguishes automated actions from human ones.
        """
        return await AuditLogWriter.write(
            actor="PRISM_SYSTEM",
            actor_role="SYSTEM",
            action=action_taken,
            target_type="Account",
            target_id=account_id,
            details={
                "warmth_score":      warmth_score,
                "threshold_crossed": threshold,
                "legal_basis":       legal_basis,
                "automated":         True,
            },
            db=db,
        )

    @staticmethod
    async def log_user_action(
        user_username: str,
        user_role:     str,
        action:        str,
        target_type:   str,
        target_id:     str,
        db:            AsyncSession,
        details:       Optional[dict[str, Any]] = None,
        request:       Optional[Request] = None,
    ) -> AuditLog:
        """Convenience wrapper for user-initiated actions."""
        return await AuditLogWriter.write(
            actor=user_username,
            actor_role=user_role,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
            db=db,
            request=request,
        )
