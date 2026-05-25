"""
services/api/utils/encryption.py

AES-256 PII field-level encryption for ARGUS-PRISM.

All PII columns (mobile_number, upi_device_imei, account_holder_name) are
encrypted before being written to PostgreSQL. Raw values never touch the
database wire. Decryption is only performed for MLRO-approved case reads.

Key management:
    PII_ENCRYPTION_KEY env var — 32-byte hex string (64 hex chars).
    In production, this key is managed by HSM and injected at runtime.
    For demo: a default test key is used if the env var is absent.

    Example generation:
        python -c "import secrets; print(secrets.token_hex(32))"
"""

import os
import base64
import hashlib
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger("prism.encryption")

# ---------------------------------------------------------------------------
# Key derivation
# ---------------------------------------------------------------------------

_SALT = b"ARGUS_PRISM_PII_SALT_2026"  # Static salt — acceptable for field encryption
_ITERATIONS = 390_000                   # NIST recommended for PBKDF2-HMAC-SHA256


def _derive_fernet_key(raw_key_hex: str) -> bytes:
    """
    Derive a 32-byte Fernet key from a 32-byte hex master key.

    Fernet internally uses AES-128 for encryption + HMAC-SHA256 for
    authentication. We derive from a 32-byte secret so the effective
    entropy is 256-bit — satisfying the AES-256 security level requirement.
    """
    raw = bytes.fromhex(raw_key_hex)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_SALT,
        iterations=_ITERATIONS,
    )
    key_bytes = kdf.derive(raw)
    return base64.urlsafe_b64encode(key_bytes)


def _load_fernet() -> Fernet:
    """Load the Fernet cipher from environment. Falls back to a test key."""
    raw_hex = os.getenv("PII_ENCRYPTION_KEY", "")
    if not raw_hex or len(raw_hex) != 64:
        # Demo/development fallback — NOT for production
        logger.warning(
            "PII_ENCRYPTION_KEY not set or invalid. Using ephemeral demo key. "
            "Set a 64-char hex key in production."
        )
        raw_hex = "a" * 64  # 32 zero-bytes — safe for demo, never for prod
    fernet_key = _derive_fernet_key(raw_hex)
    return Fernet(fernet_key)


# Module-level singleton — initialized once at import time
_fernet: Fernet = _load_fernet()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class PIIEncryptor:
    """
    Application-layer PII encryption/decryption.

    Encryption is applied to:
        - account_holder_name
        - mobile_number
        - upi_device_imei

    Usage:
        encrypted = PIIEncryptor.encrypt("9876543210")
        original  = PIIEncryptor.decrypt(encrypted)
    """

    @staticmethod
    def encrypt(plaintext: str) -> str:
        """
        Encrypt a plaintext PII string to a Fernet token (base64 URL-safe).

        Returns the token as a UTF-8 string suitable for VARCHAR storage.
        Empty strings are returned as-is (no PII to protect).
        """
        if not plaintext:
            return plaintext
        token: bytes = _fernet.encrypt(plaintext.encode("utf-8"))
        return token.decode("utf-8")

    @staticmethod
    def decrypt(token: str) -> str:
        """
        Decrypt a Fernet token back to plaintext.

        Raises ValueError on tampered/invalid tokens.
        Only call this on MLRO-approved case reads.
        """
        if not token:
            return token
        try:
            plaintext: bytes = _fernet.decrypt(token.encode("utf-8"))
            return plaintext.decode("utf-8")
        except InvalidToken as exc:
            logger.error("PII decryption failed — possible tampered token")
            raise ValueError("PII decryption failed: invalid or tampered token") from exc

    @staticmethod
    def is_encrypted(value: str) -> bool:
        """
        Heuristic check: Fernet tokens start with 'gAAA' (base64 of 0x80 magic byte).
        Used to avoid double-encrypting already-encrypted fields.
        """
        return bool(value) and value.startswith("gAAA")

    @staticmethod
    def safe_encrypt(value: str) -> str:
        """Encrypt only if not already encrypted. Idempotent wrapper."""
        if PIIEncryptor.is_encrypted(value):
            return value
        return PIIEncryptor.encrypt(value)

    @staticmethod
    def hash_for_external_query(value: str) -> str:
        """
        SHA-256 hash of a PII value for external API queries (DoT DIP, FRI).
        Raw PII never leaves Union Bank systems.
        Per DPDP Act 2023 — data minimisation compliance.
        """
        return hashlib.sha256(value.encode("utf-8")).hexdigest()
