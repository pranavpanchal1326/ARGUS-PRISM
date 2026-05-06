# ═══════════════════════════════════════
# ARGUS-PRISM | logging.py
# Engine: PRISM Core
# Branch: pranav/api
# ═══════════════════════════════════════
import json
import logging
from datetime import datetime, timezone
from typing import Any

from .config import settings


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "engine": getattr(record, "engine", "PRISM"),
            "request_id": getattr(record, "request_id", None),
        }
        return json.dumps(payload, separators=(",", ":"), ensure_ascii=True)


def get_logger(name: str) -> logging.Logger:
    """Return a structured JSON logger for PRISM Core.

    Returns:
        Configured logger instance.
    Connects to:
        PRISM Core engine.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
        handler.setFormatter(JsonLogFormatter())
        logger.addHandler(handler)
    logger.propagate = False
    return logger
