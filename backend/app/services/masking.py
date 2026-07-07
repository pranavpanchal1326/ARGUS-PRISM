"""PII masking by role.

FRAUD_ANALYST sees masked holder names and IMEIs; only MLRO (VIEW_PII) sees full
values. This is applied server-side — the API never ships unmasked PII to a role that
may not see it, regardless of what the UI requests.
"""

from __future__ import annotations


def mask_holder(name: str) -> str:
    """"Rohan Sharma" -> "R**** S****" (initials preserved)."""
    parts = [p for p in name.split() if p]
    return " ".join(f"{p[0]}{'*' * max(3, len(p) - 1)}" for p in parts) or "****"


def mask_imei(imei: str) -> str:
    tail = imei[-4:] if len(imei) >= 4 else imei
    return f"**** ****{tail}"
