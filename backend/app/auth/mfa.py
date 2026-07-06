"""TOTP two-factor: enrolment + verification with rate limiting.

Acceptance (PRD §5.1):
  - Codes verified with ±1 window drift.
  - Rate-limited to 5 attempts / 5 min per user.
  - Regenerating enrolment produces a **different** secret every time (V2 sin inverted).
  - The secret appears in exactly one response (the otpauth URI) and is never logged
    or re-displayed.
"""

from __future__ import annotations

import time
from collections import defaultdict

import pyotp

from app.core.config import get_settings


def generate_secret() -> str:
    """A fresh base32 secret. Called on every enrolment → different each time."""
    return pyotp.random_base32()


def provisioning_uri(secret: str, account_email: str) -> str:
    settings = get_settings()
    return pyotp.TOTP(secret).provisioning_uri(name=account_email, issuer_name=settings.mfa_issuer)


def verify_code(secret: str, code: str) -> bool:
    """Verify a 6-digit code with ±1 step drift."""
    if not secret or not code:
        return False
    return pyotp.TOTP(secret).verify(code, valid_window=1)


# ── In-memory sliding-window rate limiter (per user) ──────────────
# Sufficient for a single API process; swap for Redis when horizontally scaled.
_attempts: dict[str, list[float]] = defaultdict(list)


def rate_limited(user_id: str) -> bool:
    """Return True if the user has exhausted their MFA attempts in the window."""
    settings = get_settings()
    now = time.monotonic()
    window = settings.mfa_rate_limit_window_seconds
    recent = [t for t in _attempts[user_id] if now - t < window]
    _attempts[user_id] = recent
    return len(recent) >= settings.mfa_rate_limit_attempts


def record_attempt(user_id: str) -> None:
    _attempts[user_id].append(time.monotonic())


def reset_attempts(user_id: str) -> None:
    _attempts.pop(user_id, None)
