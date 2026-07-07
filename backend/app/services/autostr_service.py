"""AutoSTR job runner — assemble, sign, seal the three evidence packages.

An async job progresses ASSEMBLING → SIGNING → SEALED, generating the FIU-IND XML,
CBI PDF, and RBI JSON from real case data. Each run is a fresh job with fresh
timestamps and fresh fingerprints (regeneration is verifiably different every time).
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.db.session import SessionLocal
from app.engines.autostr.generators import PACKAGE_SPECS, seal
from app.models.account import Account
from app.models.audit import Case
from app.models.autostr import Package, StrJob
from app.services.event_bus import emit

log = logging.getLogger("prism.autostr")


def _case_accounts(db: DbSession, case: Case) -> list[Account]:
    ids = case.account_ids or []
    if not ids:
        return []
    return list(db.execute(select(Account).where(Account.id.in_(ids))).scalars().all())


def _generate_packages(db: DbSession, job: StrJob) -> None:
    case = db.get(Case, job.case_id)
    if case is None:
        job.status = "FAILED"
        job.error = "case not found"
        return
    accounts = _case_accounts(db, case)
    package_ids: list[str] = []
    for ptype, (builder, filename, mime) in PACKAGE_SPECS.items():
        content = builder(case, accounts)
        fingerprint, signature = seal(content)
        pkg = Package(
            case_id=case.id,
            job_id=job.id,
            type=ptype,
            filename=filename,
            mime=mime,
            content=content,
            fingerprint=fingerprint,
            signature=signature,
        )
        db.add(pkg)
        db.flush()
        package_ids.append(pkg.id)
    job.package_ids = package_ids
    job.status = "SEALED"


def run_job_sync(db: DbSession, job: StrJob) -> None:
    """Deterministic generation (tests / fallback) using an existing session."""
    job.status = "SIGNING"
    db.flush()
    _generate_packages(db, job)
    emit(db, "autostr.sealed", {"case_id": job.case_id, "job_id": job.id, "status": job.status})
    db.commit()


async def run_job_async(job_id: str) -> None:
    """Background runner with visible stage transitions for the live UI."""
    try:
        with SessionLocal() as db:
            job = db.get(StrJob, job_id)
            if job is None:
                return
            await asyncio.sleep(0.3)
            job.status = "SIGNING"
            db.commit()
        await asyncio.sleep(0.3)
        with SessionLocal() as db:
            job = db.get(StrJob, job_id)
            _generate_packages(db, job)
            emit(db, "autostr.sealed", {"case_id": job.case_id, "job_id": job.id, "status": job.status})
            db.commit()
    except Exception as exc:  # noqa: BLE001
        log.exception("AutoSTR job failed")
        with SessionLocal() as db:
            job = db.get(StrJob, job_id)
            if job is not None:
                job.status = "FAILED"
                job.error = str(exc)[:255]
                db.commit()
