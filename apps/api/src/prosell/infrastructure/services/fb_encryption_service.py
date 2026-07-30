"""Encryption service for FB account credentials.

Uses Fernet (AES-128-CBC) with per-tenant key derivation.
"""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from prosell.core.config import get_settings


class FBEncryptionService:
    """Encrypt/decrypt FB account passwords."""

    def __init__(self, master_key: str | None = None):
        """Initialize with master key from settings or override."""
        self._master_key = master_key or get_settings().facebook_encryption_key
        if not self._master_key:
            raise ValueError("FB_ENCRYPTION_KEY not configured")

    def _derive_key(self, tenant_id: str) -> bytes:
        """Derive a Fernet key from master key + tenant_id.

        Fernet requires 32 url-safe base64 bytes.
        """
        # HKDF-like derivation: SHA256(master || tenant) → base64
        combined = f"{self._master_key}:{tenant_id}".encode()
        digest = hashlib.sha256(combined).digest()
        return base64.urlsafe_b64encode(digest)

    def encrypt(self, plaintext: str, tenant_id: str) -> bytes:
        """Encrypt password for storage."""
        key = self._derive_key(tenant_id)
        f = Fernet(key)
        return f.encrypt(plaintext.encode())

    def decrypt(self, ciphertext: bytes, tenant_id: str) -> str:
        """Decrypt password for bot usage."""
        key = self._derive_key(tenant_id)
        f = Fernet(key)
        try:
            return f.decrypt(ciphertext).decode()
        except InvalidToken as e:
            raise ValueError("Failed to decrypt: invalid key or corrupted data") from e


# ponytail: singleton, no DI needed for this
_service: FBEncryptionService | None = None


def get_fb_encryption_service() -> FBEncryptionService:
    """Get or create singleton encryption service."""
    global _service
    if _service is None:
        _service = FBEncryptionService()
    return _service
