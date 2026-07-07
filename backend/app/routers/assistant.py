"""PRISM Assistant endpoints (PRD §5.11) — SSE chat + per-screen suggestions.

The reply degrades gracefully: when Ollama is offline the stream carries an
``available: false`` status then a live-grounded fallback answer (real figures, never
invented). Off-topic questions are refused in character.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from app.auth.deps import CurrentUser, require
from app.auth.rbac import Permission
from app.core.config import get_settings
from app.core.response import envelope
from app.db.session import get_db
from app.services import assistant

router = APIRouter(prefix="/api/v1/assistant", tags=["Assistant"])

_REFUSAL = "I can only assist with matters of this institution."


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@router.get("/suggestions")
def get_suggestions(
    screen: str | None = Query(None),
    _user: CurrentUser = Depends(require(Permission.RUN_ASSISTANT)),
) -> dict:
    return envelope(assistant.suggestions(screen))


class ChatBody(BaseModel):
    message: str
    screen_context: dict | None = None


async def _stream_ollama(system: str, message: str) -> AsyncIterator[str]:
    import httpx

    settings = get_settings()
    payload = {
        "model": settings.ollama_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": message},
        ],
        "stream": True,
    }
    async with httpx.AsyncClient(timeout=60) as http, http.stream(
        "POST",
        f"{settings.ollama_url}/api/chat",
        json=payload,
        headers=settings.ollama_headers,
    ) as resp:
        resp.raise_for_status()
        async for line in resp.aiter_lines():
            if not line.strip():
                continue
            chunk = json.loads(line)
            token = (chunk.get("message") or {}).get("content")
            if token:
                yield token


def _system_prompt(facts: dict) -> str:
    return (
        "You are the PRISM Assistant for Union Bank of India's Financial Intelligence "
        "Unit. Answer ONLY about PRISM data (alerts, accounts, mule risk, cases, "
        "networks, compliance). Refuse anything else in character. Use only these live "
        f"figures, never invent numbers: {json.dumps(facts)}."
    )


@router.post("/chat")
async def chat(
    body: ChatBody,
    request: Request,
    user: CurrentUser = Depends(require(Permission.RUN_ASSISTANT)),
    db: DbSession = Depends(get_db),
) -> StreamingResponse:
    message = body.message.strip()
    facts = assistant.live_facts(db, user, body.screen_context)
    on_topic = assistant.is_on_topic(message)
    available = assistant.ollama_available()

    async def gen() -> AsyncIterator[str]:
        yield _sse({"type": "status", "available": available})
        if not on_topic:
            yield _sse({"type": "token", "text": _REFUSAL})
            yield _sse({"type": "done"})
            return
        if available:
            emitted = False
            try:
                async for token in _stream_ollama(_system_prompt(facts), message):
                    if await request.is_disconnected():
                        break
                    emitted = True
                    yield _sse({"type": "token", "text": token})
            except Exception:  # noqa: BLE001 - fall back to grounded reply
                emitted = False
            if not emitted:
                yield _sse({"type": "token", "text": assistant._grounded_reply(message, facts)})
        else:
            # Ollama offline: honest degrade, but still answer with live figures.
            yield _sse({"type": "token", "text": assistant._grounded_reply(message, facts)})
        yield _sse({"type": "done", "facts": facts})

    return StreamingResponse(gen(), media_type="text/event-stream")
