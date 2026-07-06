"""Structured logging setup.

Security note (Law 3): loggers here must never receive secret material. The MFA
secret, JWTs, and signing keys are excluded at their call sites.
"""

from __future__ import annotations

import contextlib
import logging
import sys


def configure_logging(debug: bool = True) -> None:
    level = logging.DEBUG if debug else logging.INFO
    root = logging.getLogger()
    if root.handlers:
        return
    # Force UTF-8 so non-ASCII (₹, →, seals) never crash the Windows cp1252 console.
    with contextlib.suppress(AttributeError, ValueError):
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    )
    root.addHandler(handler)
    root.setLevel(level)
    # Quiet noisy libraries.
    for noisy in ("neo4j", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
