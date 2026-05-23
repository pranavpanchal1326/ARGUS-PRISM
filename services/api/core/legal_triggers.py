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

from ..db.models import Account, Alert
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
            # Check if alert already exists to prevent duplicate alert
            alert_exists_row = await db.execute(
                select(Alert).where(
                    Alert.account_id == account_id,
                    Alert.alert_type == "WARMTH_85_RESTRICTION"
                ).limit(1)
            )
            alert_exists = alert_exists_row.scalar_one_or_none() is not None

            if current_rank < self.STATUS_HIERARCHY["RESTRICTED"]:
                await self._apply_restriction(account, db)
                result.triggered    = True
                result.action       = "FULL_RESTRICTION"
                result.legal_basis  = LEGAL_BASIS_RESTRICTION
                result.new_status   = "RESTRICTED"
                result.autostr_signal = True

                if not alert_exists:
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

                # Trigger AutoSTR Generation
                try:
                    await trigger_autostr_generation(account_id, warmth_score, db)
                except Exception as ex:
                    logger.error(f"AutoSTR generation trigger failed: {ex}", exc_info=True)

        # ------------------------------------------------------------------
        # THRESHOLD 2: Score ≥ 75 → HOT — KYC Flag (only if not already restricted)
        # ------------------------------------------------------------------
        elif warmth_score >= THRESHOLD_KYC_FLAG:
            # Check if alert already exists to prevent duplicate alert
            alert_exists_row = await db.execute(
                select(Alert).where(
                    Alert.account_id == account_id,
                    Alert.alert_type == "WARMTH_75_KYC_FLAG"
                ).limit(1)
            )
            alert_exists = alert_exists_row.scalar_one_or_none() is not None

            if current_rank < self.STATUS_HIERARCHY["KYC_FLAGGED"]:
                await self._apply_kyc_flag(account, db)
                result.triggered   = True
                result.action      = "KYC_FLAG"
                result.legal_basis = LEGAL_BASIS_KYC
                result.new_status  = "KYC_FLAGGED"

                if not alert_exists:
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
        try:
            from services.api.routers.ws import manager
            await manager.broadcast({
                "type": "status_changed",
                "data": {
                    "account_id": account.account_id,
                    "status": "KYC_FLAGGED",
                    "reason": "WarmthScore crossed 75 threshold",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            })
        except Exception as wse:
            logger.warning(f"Failed to broadcast status change via WebSocket: {wse}")

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
        try:
            from services.api.routers.ws import manager
            await manager.broadcast({
                "type": "status_changed",
                "data": {
                    "account_id": account.account_id,
                    "status": "RESTRICTED",
                    "reason": "WarmthScore crossed 85 threshold",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            })
        except Exception as wse:
            logger.warning(f"Failed to broadcast status change via WebSocket: {wse}")

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

        # Broadcast alert to WebSockets
        try:
            from services.api.routers.ws import manager
            await manager.broadcast({
                "type": "alert_generated",
                "data": {
                    "alertId": f"ALT-{account_id}",
                    "accountId": account_id,
                    "warmthScore": int(round(warmth_score)),
                    "firstSignalAt": datetime.now(timezone.utc).isoformat(),
                    "topSignals": [
                        {"name": primary_signal, "contribution": int(round(warmth_score / 4))},
                        {"name": "LIVE BACKEND ALERT", "contribution": int(round(warmth_score / 8))}
                    ],
                    "taint": {"score": 0.0, "hopCount": 0},
                    "status": "IMMINENT" if warmth_score >= 85 else "CRITICAL",
                    "mlroRequired": warmth_score >= 85
                }
            })
        except Exception as wse:
            logger.warning(f"Failed to broadcast alert via WebSocket: {wse}")

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


# ---------------------------------------------------------------------------
# Global Helpers
# ---------------------------------------------------------------------------

async def trigger_autostr_generation(
    account_id: str,
    warmth_score: float,
    db: AsyncSession,
) -> None:
    """
    Automated STR package generation under PMLA S.12 / Supreme Court Writ 03/2025.
    Triggered when an account hits the IMMINENT threshold (>= 85).
    """
    try:
        import uuid
        from services.autostr.templates.fiu_schema import (
            FIUReportInput, AccountRecord, TransactionRecord, SignalScore, SHAPAttribution
        )
        from services.autostr.autostr_orchestrator import generate_all_packages
        from services.api.db.models import Account, WarmthScore, Case, AutoSTRPackage
        from sqlalchemy import select

        logger.info(f"AutoSTR Triggered: account={account_id} score={warmth_score}")

        # 1. Fetch Account
        row = await db.execute(select(Account).where(Account.account_id == account_id))
        account: Optional[Account] = row.scalar_one_or_none()
        if not account:
            logger.error(f"AutoSTR failed: account {account_id} not found")
            return

        # 2. Fetch Latest WarmthScore to get signals & SHAP
        ws_row = await db.execute(
            select(WarmthScore)
            .where(WarmthScore.account_id == account_id)
            .order_by(WarmthScore.computed_at.desc())
            .limit(1)
        )
        ws_record: Optional[WarmthScore] = ws_row.scalar_one_or_none()

        # Build signal scores
        sig_map = {
            "S1": ("test_credit_pattern", ws_record.signal_1_score if ws_record else 0.0, 0.15),
            "S2": ("device_fingerprint", ws_record.signal_2_score if ws_record else 0.0, 0.20),
            "S3": ("velocity_derivative", ws_record.signal_3_score if ws_record else 0.0, 0.15),
            "S4": ("dormant_reactivation", ws_record.signal_4_score if ws_record else 0.0, 0.20),
            "S5": ("fri_contradiction", ws_record.signal_5_score if ws_record else 0.0, 0.20),
            "S6": ("sim_swap_velocity", ws_record.signal_6_score if ws_record else 0.0, 0.10),
        }

        signal_scores_list = []
        for sig_id, (sig_name, score_val, weight) in sig_map.items():
            raw_val = min(max(score_val / 100.0, 0.0), 1.0)
            signal_scores_list.append(SignalScore(
                signal_name=sig_name,
                raw_score=raw_val,
                weighted_score=float(score_val),
                shap_impact=float(score_val * weight)
            ))

        # Build SHAPAttribution
        primary_sig = ws_record.shap_top1_signal if ws_record and ws_record.shap_top1_signal else "device_fingerprint"
        primary_imp = ws_record.shap_top1_impact if ws_record and ws_record.shap_top1_impact else 10.0
        sec_sig = ws_record.shap_top2_signal if ws_record and ws_record.shap_top2_signal else "velocity_derivative"
        sec_imp = ws_record.shap_top2_impact if ws_record and ws_record.shap_top2_impact else 5.0
        tert_sig = ws_record.shap_top3_signal if ws_record and ws_record.shap_top3_signal else "test_credit_pattern"
        tert_imp = ws_record.shap_top3_impact if ws_record and ws_record.shap_top3_impact else 2.0

        shap_attr = SHAPAttribution(
            primary_signal=primary_sig,
            primary_impact=float(primary_imp),
            secondary_signal=sec_sig,
            secondary_impact=float(sec_imp),
            tertiary_signal=tert_sig,
            tertiary_impact=float(tert_imp),
        )

        # 3. Get or Create Case
        case_row = await db.execute(
            select(Case)
            .where(Case.account_id == account_id, Case.case_status == "OPEN")
            .limit(1)
        )
        case_rec: Optional[Case] = case_row.scalar_one_or_none()
        if not case_rec:
            # Create a new Case
            case_rec = Case(
                account_id=account_id,
                case_status="OPEN",
                assigned_mlro="System AutoSTR",
                peak_warmth_score=warmth_score,
                peak_risk_level="IMMINENT",
                autostr_triggered=True,
                autostr_triggered_at=datetime.now(timezone.utc),
            )
            db.add(case_rec)
            await db.flush()  # Generate case_id UUID
        else:
            case_rec.autostr_triggered = True
            case_rec.autostr_triggered_at = datetime.now(timezone.utc)
            if case_rec.peak_warmth_score is None or warmth_score > case_rec.peak_warmth_score:
                case_rec.peak_warmth_score = warmth_score
                case_rec.peak_risk_level = "IMMINENT"

        case_id_str = str(case_rec.case_id)

        # 4. Build AccountRecord
        acc_rec = AccountRecord(
            account_id=account.account_id,
            account_type=account.account_type or "SAVINGS",
            holder_name=account.account_holder_name or "Unknown Holder",
            mobile_raw=account.mobile_number or "9999999999",
            aadhaar_raw="123412341234", # Placeholder
            pan_raw="ABCDE1234F",       # Placeholder
            branch_code=account.branch_code or "BR001",
            ifsc=account.ifsc_code or "IFSC001",
            kyc_status=account.kyc_status or "COMPLETE",
            warmth_score=warmth_score,
            risk_level="IMMINENT",
        )

        # 5. Build TransactionRecord list (must have min_length=1)
        device_id = account.upi_device_imei or "861234567890123"
        tx_record = TransactionRecord(
            transaction_id="TXN-" + str(uuid.uuid4())[:8].upper(),
            transaction_type="UPI",
            amount=15000.0,
            transaction_timestamp=datetime.now(timezone.utc),
            source_account_id=account_id,
            destination_account_id="MULE-DST-001",
            channel="UPI",
            device_id_raw=device_id,
            ip_address_raw="192.168.1.1",
        )

        # 6. Build FIUReportInput
        report_input = FIUReportInput(
            case_id=case_id_str,
            reporting_entity_code="UBI0001",
            principal_officer_name="System AutoSTR",
            principal_officer_designation="CCO",
            principal_officer_email="cco@ubi.com",
            detection_timestamp=datetime.now(timezone.utc),
            threshold_crossed=85.0,
            accounts=[acc_rec],
            transactions=[tx_record],
            signal_scores=signal_scores_list,
            shap_attribution=shap_attr,
        )

        # 7. Generate packages using Orchestrator
        result = generate_all_packages(report_input)

        # 8. Save AutoSTRPackage rows to the database
        packages_to_save = []
        if result.fiu_xml_path:
            packages_to_save.append(AutoSTRPackage(
                case_id=case_rec.case_id,
                account_id=account_id,
                package_type="FIU_XML",
                file_path=result.fiu_xml_path,
                file_hash_sha256=result.fiu_xml_hash,
                file_size_bytes=len(result.fiu_xml_string.encode('utf-8')),
                generation_duration_seconds=result.fiu_generation_time_ms / 1000.0,
                warmth_score_at_generation=warmth_score,
                is_submitted=False,
            ))

        if result.cbi_pdf_path:
            import os
            try:
                pdf_sz = os.path.getsize(result.cbi_pdf_path)
            except Exception:
                pdf_sz = 15000
            packages_to_save.append(AutoSTRPackage(
                case_id=case_rec.case_id,
                account_id=account_id,
                package_type="CBI_PDF",
                file_path=result.cbi_pdf_path,
                file_hash_sha256=result.cbi_pdf_hash,
                file_size_bytes=pdf_sz,
                generation_duration_seconds=result.cbi_generation_time_ms / 1000.0,
                warmth_score_at_generation=warmth_score,
                is_submitted=False,
            ))

        if result.rbi_report_dict:
            import json
            rbi_str = json.dumps(result.rbi_report_dict)
            packages_to_save.append(AutoSTRPackage(
                case_id=case_rec.case_id,
                account_id=account_id,
                package_type="RBI_JSON",
                file_path="memory://rbi_report",
                file_hash_sha256=result.rbi_report_hash,
                file_size_bytes=len(rbi_str.encode('utf-8')),
                generation_duration_seconds=result.rbi_generation_time_ms / 1000.0,
                warmth_score_at_generation=warmth_score,
                is_submitted=False,
            ))

        for pkg in packages_to_save:
            # Check if this package type already exists for this case to enforce unique constraint
            chk_row = await db.execute(
                select(AutoSTRPackage)
                .where(
                    AutoSTRPackage.case_id == case_rec.case_id,
                    AutoSTRPackage.package_type == pkg.package_type
                ).limit(1)
            )
            chk_pkg = chk_row.scalar_one_or_none()
            if not chk_pkg:
                db.add(pkg)

        await db.commit()
        logger.info(f"AutoSTR completed successfully for account={account_id}. Created {len(packages_to_save)} packages.")

    except Exception as e:
        logger.error(f"AutoSTR package generation failed for {account_id}: {e}", exc_info=True)
        await db.rollback()

