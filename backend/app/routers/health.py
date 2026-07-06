"""Liveness + dependency health. Public (no auth)."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.health import gather_health

router = APIRouter(tags=["Health"])


@router.get("/health")
def health() -> dict:
    return {"data": gather_health()}
