"""In-process event bus for the Live Feed.

Two responsibilities:
  1. Persist every event to the ``events`` table (monotonic id) so a reconnecting
     client can backfill via /feed/recent?after_id= — no gaps, no duplicates.
  2. Fan out to live WebSocket subscribers with low latency.

The simulator and the API run in the same process/event-loop, so subscribers are
plain asyncio queues — no external broker needed (the PRD's lighter alternative to
V2's Kafka rig).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from sqlalchemy.orm import Session as DbSession

from app.models.alert import Event

log = logging.getLogger("prism.eventbus")


class EventBus:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=1000)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers.discard(q)

    def publish(self, event: dict[str, Any]) -> None:
        for q in list(self._subscribers):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                # Slow consumer: drop it rather than blocking the producer. The
                # client will backfill from /feed/recent on its next poll.
                log.warning("Dropping slow WS subscriber (queue full)")
                self.unsubscribe(q)

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)


bus = EventBus()


def emit(db: DbSession, event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Persist an event and fan it out. Returns the serialized event."""
    row = Event(type=event_type, payload=payload)
    db.add(row)
    db.flush()  # assign the monotonic id
    event = {
        "id": row.id,
        "type": row.type,
        "ts": row.ts.isoformat(),
        "payload": row.payload,
    }
    bus.publish(event)
    return event
