"""
services/api/utils/legal_triggers.py

Legal Trigger Engine for ARGUS-PRISM.

Maps WarmthScore thresholds to specific legal actions with documented
authority per the PRISM legal architecture (Section 5 of PRIMS.md):

    Score 60-74:  WARMING     — Internal monitoring. No customer-visible action.
    Score 75-84:  HOT/CRITICAL — KYC re-verification (RBI KYC MD 2016 §38).
                                No court order required. Outbound UPI restricted.
    Score 85-100: IMMINENT    — Full restriction. AutoSTR initiated.
                                CBI Package generation triggered.
                                Supreme Court Writ 03/2025 mandate fulfilled.

The PMLA cage is bypassed below score 85 — operations occur under the
separate KYC Master Direction jurisdiction.

Usage:
    engine = LegalTriggerEngine()
    result = await engine.evaluate(account_id="UBI-001", warmth_score=76.5, db=session)
    # result.triggered == True, result.action == "KYC_FLAG"
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.models import Account, Alert
from .audit import AuditLogWriter

logger = logging.getLogger("prism.legal_triggers")


# ---------------------------------------------------------------------------
# Thresholds (mirror settings.py values for the engine's own logic)
# ---------------------------------------------------------------------------

THRESHOLD_KYC_FLAG   = 75.0   # RBI KYC Master Direction 2016 §38
THRESHOLD_RESTRICTION = 85.0  # PMLA §12 + Supreme Court Writ 03/2025

LEGAL_BASIS_KYC = (
    "RBI KYC Master Direction 2016 Section 38 — "
    "Banks may restrict account operations pending KYC re-verification without court order."
)
LEGAL_BASIS_RESTRICTION = (
    "RBI KYC MD 2016 §38 + PMLA Section 12 + Supreme Court Suo Moto Writ 03/2025. "
    "Full account restriction. AutoSTR initiated. CBI Evidence Package generation triggered."
)


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class TriggerResult:
    account_id:    str
    warmth_score:  float
    triggered:     bool
    action:        Optional[str]         = None
    legal_basis:   Optional[str]         = None
    new_status:    Optional[str]         = None
    alerts_fired:  list[str]             = field(default_factory=list)
    autostr_signal: bool                 = False
    evaluated_at:  datetime              = field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class LegalTriggerEngine:
    """
    Evaluate WarmthScore thresholds and fire appropriate legal actions.

    Each evaluation is idempotent with respect to the DB — the status column
    is only updated when the account is not already at or above the target status.
    """

    STATUS_HIERARCHY = {
        "ACTIVE":      0,
        "MONITORING":  1,
        "KYC_FLAGGED": 2,
        "RESTRICTED":  3,
        "FROZEN":      4,
    }

    async def evaluate(
        self,
        account_id:   str,
        warmth_score: float,
        db:           AsyncSession,
    ) -> TriggerResult:
        """
        Main evaluation entry-point. Call this after every WarmthScore update.

        Returns a TriggerResult describing what (if anything) was triggered.
        Writes to audit log for every triggered action.
        """
        result = TriggerResult(account_id=account_id, warmth_score=warmth_score, triggered=False)

        # Fetch current account status
        row = await db.execute(select(Account).where(Account.account_id == account_id))
        account: Optional[Account] = row.scalar_one_or_none()

        if account is None:
            logger.warning(f"LegalTrigger: account {account_id!r} not found — skipping")
            return result

        current_status = account.account_status or "ACTIVE"
        current_rank   = self.STATUS_HIERARCHY.get(current_status, 0)

        # ------------------------------------------------------------------
        # THRESHOLD 1: Score ≥ 85 → IMMINENT — Full Restriction + AutoSTR
        # ------------------------------------------------------------------
        if warmth_score >= THRESHOLD_RESTRICTION:
            if current_rank < self.STATUS_HIERARCHY["RESTRICTED"]:
                await self._apply_restriction(account, db)
                result.triggered    = True
                result.action       = "FULL_RESTRICTION"
                result.legal_basis  = LEGAL_BASIS_RESTRICTION
                result.new_status   = "RESTRICTED"
                result.autostr_signal = True

                alert_id = await self._fire_alert(
                    account_id=account_id,
                    alert_type="WARMTH_85_RESTRICTION",
                    severity="IMMINENT",
                    warmth_score=warmth_score,
                    threshold=THRESHOLD_RESTRICTION,
                    primary_signal="WARMTH_THRESHOLD_85",
                    message=(
                        f"Account {account_id} crossed IMMINENT threshold ({warmth_score:.1f}/85). "
                        "Full outbound restriction applied. AutoSTR initiated. "
                        "CBI Evidence Package generation triggered. "
                        "Legal basis: PMLA §12 + SC Writ 03/2025."
                    ),
                    db=db,
                )
                result.alerts_fired.append(alert_id)

                await AuditLogWriter.log_legal_trigger(
                    account_id=account_id,
                    warmth_score=warmth_score,
                    threshold=THRESHOLD_RESTRICTION,
                    action_taken="FULL_RESTRICTION_APPLIED",
                    legal_basis=LEGAL_BASIS_RESTRICTION,
                    db=db,
                )
                logger.info(
                    f"LEGAL TRIGGER [85] — account={account_id} score={warmth_score:.1f} "
                    "→ RESTRICTED + AutoSTR signal"
                )

        # ------------------------------------------------------------------
        # THRESHOLD 2: Score ≥ 75 → HOT — KYC Flag (only if not already restricted)
        # ------------------------------------------------------------------
        elif warmth_score >= THRESHOLD_KYC_FLAG:
            if current_rank < self.STATUS_HIERARCHY["KYC_FLAGGED"]:
                await self._apply_kyc_flag(account, db)
                result.triggered   = True
                result.action      = "KYC_FLAG"
                result.legal_basis = LEGAL_BASIS_KYC
                result.new_status  = "KYC_FLAGGED"

                alert_id = await self._fire_alert(
                    account_id=account_id,
                    alert_type="WARMTH_75_KYC_FLAG",
                    severity="CRITICAL",
                    warmth_score=warmth_score,
                    threshold=THRESHOLD_KYC_FLAG,
                    primary_signal="WARMTH_THRESHOLD_75",
                    message=(
                        f"Account {account_id} crossed KYC threshold ({warmth_score:.1f}/75). "
                        "Outbound UPI restricted pending KYC re-verification. "
                        "Video KYC notification sent to customer. "
                        "Legal basis: RBI KYC Master Direction 2016 §38."
                    ),
                    db=db,
                )
                result.alerts_fired.append(alert_id)

                await AuditLogWriter.log_legal_trigger(
                    account_id=account_id,
                    warmth_score=warmth_score,
                    threshold=THRESHOLD_KYC_FLAG,
                    action_taken="KYC_FLAG_APPLIED",
                    legal_basis=LEGAL_BASIS_KYC,
                    db=db,
                )
                logger.info(
                    f"LEGAL TRIGGER [75] — account={account_id} score={warmth_score:.1f} "
                    "→ KYC_FLAGGED"
                )

        # Update the account's warmth score in both cases
        await db.execute(
            update(Account)
            .where(Account.account_id == account_id)
            .values(
                current_warmth_score=warmth_score,
                warmth_risk_level=self._score_to_risk_level(warmth_score),
                updated_at=datetime.now(timezone.utc),
            )
        )
        await db.commit()

        return result

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _apply_kyc_flag(self, account: Account, db: AsyncSession) -> None:
        await db.execute(
            update(Account)
            .where(Account.account_id == account.account_id)
            .values(
                account_status="KYC_FLAGGED",
                kyc_status="RE_VERIFICATION_PENDING",
                updated_at=datetime.now(timezone.utc),
            )
        )

    async def _apply_restriction(self, account: Account, db: AsyncSession) -> None:
        await db.execute(
            update(Account)
            .where(Account.account_id == account.account_id)
            .values(
                account_status="RESTRICTED",
                kyc_status="RE_VERIFICATION_PENDING",
                updated_at=datetime.now(timezone.utc),
            )
        )

    async def _fire_alert(
        self,
        account_id:    str,
        alert_type:    str,
        severity:      str,
        warmth_score:  float,
        threshold:     float,
        primary_signal: str,
        message:       str,
        db:            AsyncSession,
    ) -> str:
        """Insert an Alert row. Returns the alert_id string."""
        import uuid as _uuid
        alert = Alert(
            account_id=account_id,
            alert_type=alert_type,
            severity=severity,
            warmth_score_at_alert=warmth_score,
            threshold_crossed=threshold,
            primary_signal=primary_signal,
            alert_message=message,
            is_acknowledged=False,
            created_at=datetime.now(timezone.utc),
        )
        db.add(alert)
        await db.flush()  # Get alert_id before commit
        return str(alert.alert_id)

    @staticmethod
    def _score_to_risk_level(score: float) -> str:
        if score >= 85:
            return "IMMINENT"
        if score >= 75:
            return "CRITICAL"
        if score >= 60:
            return "HOT"
        if score >= 40:
            return "WARMING"
        return "CLEAN"
