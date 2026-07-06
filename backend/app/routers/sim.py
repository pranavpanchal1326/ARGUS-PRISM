"""Simulator controls — SYS_ADMIN only (PRD §5.2, §5.10).

During a demo, judges watch an operator *drive* the ops console (load a scenario,
start, pause) — which reads as an operations floor, not a canned demo.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.deps import require
from app.auth.rbac import Permission
from app.core.response import ProblemException, envelope
from app.simulator.engine import simulator

router = APIRouter(prefix="/api/v1/sim", tags=["Simulator"])


class ScenarioControl(BaseModel):
    command: str  # load | start | pause | reset
    scenario: str | None = None
    seed: int | None = None


@router.post("/scenario")
async def control(
    body: ScenarioControl,
    _user=Depends(require(Permission.CONTROL_SIMULATOR)),
) -> dict:
    cmd = body.command.lower()
    try:
        if cmd == "load":
            if not body.scenario:
                raise ProblemException(422, "scenario is required to load", code="bad_request")
            simulator.load(body.scenario, body.seed)
        elif cmd == "start":
            simulator.start()
        elif cmd == "pause":
            simulator.pause()
        elif cmd == "reset":
            simulator.reset()
        else:
            raise ProblemException(422, "unknown command", code="bad_request")
    except KeyError as exc:
        raise ProblemException(
            404, "Unknown scenario", detail=str(exc), code="not_found"
        ) from exc
    except RuntimeError as exc:
        raise ProblemException(409, "Invalid transition", detail=str(exc), code="conflict") from exc
    return envelope(simulator.status())


@router.get("/status")
def status() -> dict:
    return envelope(simulator.status())
