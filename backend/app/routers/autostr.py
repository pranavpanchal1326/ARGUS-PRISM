"""AutoSTR — the screen that killed V2, rebuilt with the most care (PRD §5.8).

Async job assembles/signs/seals three evidence packages. Downloads stream from the DB
(no filesystem, no memory:// 404). Zero key material ever crosses the API boundary:
responses carry only an 8-char document fingerprint; the HMAC seal stays server-side.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import CurrentUser, require
from app.auth.rbac import Permission
from app.core.response import ProblemException, envelope
from app.db.session import get_db
from app.models.audit import Case
from app.models.autostr import Package, StrJob
from app.services import audit
from app.services.autostr_service import run_job_async, run_job_sync

router = APIRouter(prefix="/api/v1/autostr", tags=["AutoSTR"])


def _job_dict(j: StrJob) -> dict:
    return {
        "id": j.id,
        "case_id": j.case_id,
        "status": j.status,
        "created_at": j.created_at.isoformat(),
        "package_ids": j.package_ids or [],
        "error": j.error,
    }


def _pkg_summary(p: Package) -> dict:
    return {
        "id": p.id,
        "type": p.type,
        "filename": p.filename,
        "fingerprint": p.fingerprint[-8:],  # last 8 only — never the full hash or seal
        "generated_at": p.generated_at.isoformat(),
        "status": p.status,
        "approved_by": p.approved_by,
        "approved_at": p.approved_at.isoformat() if p.approved_at else None,
    }


@router.post("/{case_id}/generate", status_code=202)
async def generate(
    case_id: str,
    user: CurrentUser = Depends(require(Permission.VIEW_CASES)),
    db: DbSession = Depends(get_db),
) -> dict:
    if db.get(Case, case_id) is None:
        raise ProblemException(404, "Case not found", code="not_found")
    # Each generate is a fresh job → fresh timestamps → fresh fingerprints.
    job = StrJob(case_id=case_id, status="ASSEMBLING")
    db.add(job)
    audit.record(db, actor=user.email, action="autostr.generate", target=case_id)
    db.commit()
    job_id = job.id

    try:
        asyncio.get_running_loop()
        asyncio.create_task(run_job_async(job_id))
    except RuntimeError:
        # No event loop (e.g. sync context): generate inline.
        job = db.get(StrJob, job_id)
        run_job_sync(db, job)
    return envelope(_job_dict(db.get(StrJob, job_id)))


@router.get("/jobs/{job_id}")
def get_job(
    job_id: str,
    _user: CurrentUser = Depends(require(Permission.VIEW_CASES)),
    db: DbSession = Depends(get_db),
) -> dict:
    job = db.get(StrJob, job_id)
    if job is None:
        raise ProblemException(404, "Job not found", code="not_found")
    return envelope(_job_dict(job))


@router.get("/{case_id}/packages")
def list_packages(
    case_id: str,
    _user: CurrentUser = Depends(require(Permission.VIEW_CASES)),
    db: DbSession = Depends(get_db),
) -> dict:
    rows = db.execute(
        select(Package).where(Package.case_id == case_id).order_by(Package.generated_at.desc())
    ).scalars().all()
    return envelope([_pkg_summary(p) for p in rows])


@router.get("/packages/{package_id}/download")
def download(
    package_id: str,
    user: CurrentUser = Depends(require(Permission.VIEW_CASES)),
    db: DbSession = Depends(get_db),
) -> Response:
    pkg = db.get(Package, package_id)
    if pkg is None:
        raise ProblemException(404, "Package not found", code="not_found")
    audit.record(db, actor=user.email, action="autostr.download", target=pkg.id, detail={"type": pkg.type})
    db.commit()
    # Stream straight from the DB blob — no filesystem lookup, so no memory:// 404.
    return Response(
        content=pkg.content,
        media_type=pkg.mime,
        headers={"Content-Disposition": f'attachment; filename="{pkg.filename}"'},
    )


@router.post("/packages/{package_id}/approve")
def approve(
    package_id: str,
    user: CurrentUser = Depends(require(Permission.APPROVE_STR)),
    db: DbSession = Depends(get_db),
) -> dict:
    pkg = db.get(Package, package_id)
    if pkg is None:
        raise ProblemException(404, "Package not found", code="not_found")
    pkg.status = "SUBMITTED"
    pkg.approved_by = user.email
    pkg.approved_at = datetime.now(UTC)
    audit.record(db, actor=user.email, action="autostr.approve", target=pkg.id)
    db.commit()
    return envelope(_pkg_summary(pkg))
