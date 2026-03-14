"""Token encryption service implementation.

Implements AES-256 encryption for access tokens at rest.
Uses cryptography.Fernet for secure encryption.
"""

import logging
from base64 import b64encode

from cryptography.fernet import Fernet, InvalidToken

from prosell.domain.exceptions.facebook_exceptions import FacebookDomainException
from prosell.domain.ports.i_encryption_service import IEncryptionService

logger = logging.getLogger(__name__)


class EncryptionException(FacebookDomainException):
    """Raised when encryption/decryption fails."""

    def __init__(self, reason: str = "encryption_failed") -> None:
        super().__init__(
            message=f"Encryption operation failed: {reason}",
            details={"reason": reason},
        )


class TokenEncryptionService(IEncryptionService):
    """Service for encrypting access tokens at rest.

    Uses cryptography.Fernet for AES-256 encryption.

    Security:
    - 32-byte encryption key required (Fernet requirement)
    - Tokens encrypted before storage in database
    - Tokens decrypted only when needed for API calls

    Key Generation:
        import os
        key = os.urandom(32)  # Or Fernet.generate_key()
    """

    def __init__(self, encryption_key: bytes) -> None:
        """Initialize encryption service.

        Args:
            encryption_key: 32-byte encryption key (from settings)

        Raises:
            ValueError: If key is not 32 bytes
        """
        if len(encryption_key) != 32:
            raise ValueError(f"Encryption key must be exactly 32 bytes, got {len(encryption_key)}")

        # Fernet requires a URL-safe base64-encoded key
        # The factory always provides raw 32 bytes, so encode as base64
        key_b64 = b64encode(encryption_key)
        self.cipher = Fernet(key_b64)

        logger.info("TokenEncryptionService initialized")

    def encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext token.

        Args:
            plaintext: Plain text access token

        Returns:
            Encrypted token (base64 encoded)

        Raises:
            EncryptionException: If encryption fails

        Example:
            encrypted = service.encrypt("EAABwz...")
            # Returns: "gAAAAABh..."
        """
        if not plaintext:
            raise EncryptionException("cannot encrypt empty string")

        try:
            # Convert to bytes if needed
            plaintext_bytes = plaintext.encode() if isinstance(plaintext, str) else plaintext

            # Encrypt
            encrypted_bytes = self.cipher.encrypt(plaintext_bytes)

            # Return as base64 string
            return encrypted_bytes.decode()

        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise EncryptionException("encryption_failed") from e

    def decrypt(self, encrypted: str) -> str:
        """Decrypt encrypted token.

        Args:
            encrypted: Encrypted token (base64 encoded)

        Returns:
            Decrypted plain text

        Raises:
            EncryptionException: If decryption fails

        Example:
            decrypted = service.decrypt("gAAAAABh...")
            # Returns: "EAABwz..."
        """
        if not encrypted:
            raise EncryptionException("cannot decrypt empty string")

        try:
            # Convert to bytes if needed
            encrypted_bytes = encrypted.encode() if isinstance(encrypted, str) else encrypted

            # Decrypt
            decrypted_bytes = self.cipher.decrypt(encrypted_bytes)

            # Return as string
            return decrypted_bytes.decode()

        except InvalidToken as e:
            logger.error(f"Decryption failed (invalid token/key): {e}")
            raise EncryptionException("decryption_failed_invalid_token") from e
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise EncryptionException("decryption_failed") from e


def create_encryption_service(encryption_key: bytes | str) -> TokenEncryptionService:
    """Factory function to create encryption service.

    Args:
        encryption_key: 32-byte encryption key (bytes or base64 string)

    Returns:
        TokenEncryptionService instance

    Example:
        # From environment variable
        key = os.getenv("ENCRYPTION_KEY")
        service = create_encryption_service(key)
    """
    if isinstance(encryption_key, str):
        encryption_key = encryption_key.encode()

    return TokenEncryptionService(encryption_key)
