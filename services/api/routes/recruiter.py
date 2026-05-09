"""
ARGUS-PRISM Recruiter API Route — Phase 6
==========================================
FastAPI router exposing recruiter endpoints.
Plugs into Pranav's existing services/api/main.py.

Endpoints:
  GET  /api/recruiter/map              — list all detected recruiters
  GET  /api/recruiter/{id}/campaign    — full campaign subgraph
  POST /api/recruiter/{id}/freeze      — one-click campaign freeze

Mount in main.py:
    from .routes import recruiter
    app.include_router(recruiter.router, prefix="/api/recruiter", tags=["Recruiter"])
"""

import logging
from typing import Optional
from fastapi import APIRouter, Query, Path, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import sys, os

# Allow import of recruiter_detector from src/recruiter
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'src', 'recruiter'))
from recruiter_detector import RecruiterDetector, classify_recruiter
from ..utils.rbac import require_role, UserRole, RBACUser

router = APIRouter()
log = logging.getLogger("prism.api.recruiter")


def _detector() -> RecruiterDetector:
    """Create and return a RecruiterDetector instance."""
    return RecruiterDetector()


# ── GET /api/recruiter/map ────────────────────────────────────────────────────

@router.get("/map", summary="List all recruiter accounts and campaign graphs")
async def get_recruiter_map(
    classification: Optional[str] = Query(
        None,
        description="Filter by tier: CAMPAIGN_COORDINATOR | INDUSTRIAL_ORCHESTRATOR | PLATFORM_SCALE"
    ),
    window_hours: int = Query(48, ge=1, le=168,
                              description="Detection window in hours"),
    min_downstream: int = Query(5, ge=1,
                                description="Minimum downstream accounts to qualify"),
    include_frozen: bool = Query(True, description="Include already-frozen recruiters"),
    user: RBACUser = Depends(require_role(UserRole.MLRO, UserRole.FRAUD_ANALYST)),
):
    """
    Scan the Neo4j graph and return all detected recruiter accounts.

    Each recruiter entry includes:
    - Classification tier (Coordinator / Orchestrator / Platform-scale)
    - Downstream account list with coordinator_flags
    - Total frozen accounts
    - Risk tier label for dashboard
    - Campaign name if this is a named demo campaign
    """
    detector = _detector()
    try:
        recruiters = detector.detect_recruiters(
            window_hours=window_hours,
            min_downstream=min_downstream,
        )
        if classification:
            recruiters = [r for r in recruiters
                          if r["classification"] == classification.upper()]
        if not include_frozen:
            recruiters = [r for r in recruiters
                          if r.get("recruiter_status") != "FROZEN"]

        # Enhance each recruiter entry with coordinator_flags and risk_tier
        enhanced = []
        for r in recruiters:
            count = r.get("downstream_count", 0)

            # Risk tier label for dashboard colour coding
            if r["classification"] == "PLATFORM_SCALE":
                risk_tier = "CRITICAL"
            elif r["classification"] == "INDUSTRIAL_ORCHESTRATOR":
                risk_tier = "HIGH"
            else:
                risk_tier = "MEDIUM"

            # Coordinator flags — which downstream accounts are themselves coordinators
            coordinator_flags = []
            try:
                graph = detector.get_campaign_graph(r["recruiter_id"])
                frozen_count = sum(
                    1 for acc in graph.get("downstream_accounts", [])
                    if acc.get("status") == "FROZEN"
                )
                coordinator_flags = [
                    acc["account_id"]
                    for acc in graph.get("downstream_accounts", [])
                    if acc.get("is_recruiter") or acc.get("warmth_score", 0) > 70
                ]
            except Exception:
                frozen_count = 0

            enhanced.append({
                **r,
                "risk_tier":          risk_tier,
                "coordinator_flags":  coordinator_flags,
                "total_frozen":       frozen_count,
                "campaign_name":      r.get("campaign_name", "UNKNOWN"),
            })

        # Summary by tier for dashboard overview panel
        tiers = {}
        for r in enhanced:
            t = r["classification"]
            tiers[t] = tiers.get(t, 0) + 1

        return {
            "success":      True,
            "total":        len(enhanced),
            "window_hours": window_hours,
            "tier_summary": tiers,
            "recruiters":   enhanced,
        }
    except Exception as e:
        log.error("Error detecting recruiters: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Recruiter detection failed")
    finally:
        detector.close()



# ── GET /api/recruiter/{recruiter_id}/campaign ────────────────────────────────

@router.get("/{recruiter_id}/campaign",
            summary="Get full campaign graph for a recruiter")
async def get_campaign_graph(
    recruiter_id: str = Path(description="Recruiter account_id"),
    user: RBACUser = Depends(require_role(UserRole.MLRO, UserRole.FRAUD_ANALYST)),
):
    """
    Returns the full campaign subgraph:
    - Recruiter node details + classification
    - All downstream accounts with transaction edges
    """
    detector = _detector()
    try:
        report = detector.get_campaign_graph(recruiter_id)
        if "error" in report:
            raise HTTPException(status_code=404, detail=report["error"])
        return {"success": True, "data": report}
    except HTTPException:
        raise
    except Exception as e:
        log.error("Error fetching campaign graph for %s: %s", recruiter_id, e,
                  exc_info=True)
        raise HTTPException(status_code=500, detail="Campaign graph fetch failed")
    finally:
        detector.close()


# ── POST /api/recruiter/{recruiter_id}/freeze ─────────────────────────────────

class FreezeRequest(BaseModel):
    freeze_reason: str = Field(
        default="RECRUITER_CAMPAIGN",
        min_length=5,
        description="Reason for freeze (stored in audit log)"
    )
    authorized_by: str = Field(
        default="MLRO",
        description="Actor authorizing the freeze"
    )


@router.post("/{recruiter_id}/freeze",
             summary="One-click freeze: recruiter + all connected accounts")
async def freeze_campaign(
    recruiter_id: str = Path(description="Recruiter account_id to freeze"),
    req: FreezeRequest = FreezeRequest(),
    user: RBACUser = Depends(require_role(UserRole.MLRO)),
):
    """
    One-click campaign freeze.

    Freezes the recruiter account AND all downstream connected accounts.
    Writes an AuditEvent node to Neo4j.

    Returns count of all accounts frozen.
    """
    detector = _detector()
    try:
        result = detector.freeze_campaign(
            recruiter_id=recruiter_id,
            freeze_reason=req.freeze_reason,
        )
        log.warning(
            "Campaign frozen by %s: recruiter=%s, total_frozen=%d",
            req.authorized_by, recruiter_id, result["total_frozen"]
        )
        return {
            "success": True,
            "message": f"Campaign frozen. {result['total_frozen']} accounts FROZEN.",
            "data": result,
        }
    except Exception as e:
        log.error("Error freezing campaign %s: %s", recruiter_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Campaign freeze failed")
    finally:
        detector.close()
