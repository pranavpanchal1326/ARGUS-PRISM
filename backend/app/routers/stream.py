"""Live Operations Feed: WebSocket stream + replay buffer + rolling KPIs (PRD §5.2)."""

from __future__ import annotations

import asyncio
import contextlib
import logging

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from app.core.domain import Severity
from app.core.response import list_envelope
from app.db.session import get_db
from app.models.account import Account
from app.models.alert import Alert, Event
from app.services.event_bus import bus
from app.simulator.engine import simulator

log = logging.getLogger("prism.stream")
router = APIRouter(prefix="/api/v1", tags=["Stream"])


def _event_to_dict(e: Event) -> dict:
    return {"id": e.id, "type": e.type, "ts": e.ts.isoformat(), "payload": e.payload}


@router.get("/feed/recent")
def recent_feed(
    limit: int = Query(100, ge=1, le=500),
    after_id: int | None = Query(None),
    db: DbSession = Depends(get_db),
) -> dict:
    stmt = select(Event)
    if after_id is not None:
        stmt = stmt.where(Event.id > after_id).order_by(Event.id.asc()).limit(limit)
        rows = list(db.execute(stmt).scalars().all())
    else:
        stmt = stmt.order_by(Event.id.desc()).limit(limit)
        rows = list(reversed(db.execute(stmt).scalars().all()))
    cursor = str(rows[-1].id) if rows else None
    return list_envelope([_event_to_dict(e) for e in rows], cursor=cursor)


@router.get("/metrics/pulse")
def pulse(db: DbSession = Depends(get_db)) -> dict:
    active_alerts = (
        db.execute(
            select(func.count(Alert.id)).where(
                Alert.status.notin_(["RESOLVED", "FALSE_POSITIVE"])
            )
        ).scalar()
        or 0
    )
    watched = (
        db.execute(
            select(func.count(Account.id)).where(Account.severity != Severity.CLEAN.value)
        ).scalar()
        or 0
    )
    avg_score = (
        db.execute(
            select(func.avg(Account.warmth_score)).where(
                Account.severity != Severity.CLEAN.value
            )
        ).scalar()
        or 0.0
    )
    from datetime import UTC, datetime

    return {
        "data": {
            "tx_per_sec": round(simulator.tx_per_sec, 1),
            "active_alerts": int(active_alerts),
            "accounts_watched": int(watched),
            "avg_score": round(float(avg_score), 1),
            "updated_at": datetime.now(UTC).isoformat(),
        }
    }


@router.websocket("/stream")
async def stream(websocket: WebSocket, after_id: int | None = Query(None)) -> None:
    """Multiplexed event stream. On connect, backfill any events missed since
    ``after_id`` (no gaps), then push live events as they occur (no duplicates)."""
    await websocket.accept()
    queue = bus.subscribe()
    try:
        # Backfill first so the client never has a hole between page-load and connect.
        if after_id is not None:
            from app.db.session import SessionLocal

            with SessionLocal() as db:
                missed = db.execute(
                    select(Event).where(Event.id > after_id).order_by(Event.id.asc()).limit(500)
                ).scalars().all()
                for e in missed:
                    await websocket.send_json(_event_to_dict(e))
                after_id = missed[-1].id if missed else after_id

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15)
                # Skip anything already delivered in the backfill.
                if after_id is not None and event["id"] <= after_id:
                    continue
                await websocket.send_json(event)
            except TimeoutError:
                # Heartbeat keeps proxies from closing an idle socket.
                await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        log.info("WS closed: %s", exc)
    finally:
        bus.unsubscribe(queue)
        with contextlib.suppress(Exception):
            await websocket.close()
