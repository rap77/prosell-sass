"""Encryption service interface (Port).

Provides encryption/decryption for sensitive data like access tokens.
"""

from abc import ABC, abstractmethod


class IEncryptionService(ABC):
    """Encryption service interface.

    Used to encrypt sensitive data at rest, such as:
    - Facebook access tokens
    - Page access tokens
    - API keys

    Implementation uses cryptography.Fernet for AES-256 encryption.
    """

    @abstractmethod
    def encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext data.

        Args:
            plaintext: Plain text data to encrypt

        Returns:
            Encrypted data (base64 encoded)

        Raises:
            ValueError: If encryption fails

        Example:
            encrypted = encryption_service.encrypt("my_secret_token")
            # Returns: "gAAAAABh..."
        """
        pass

    @abstractmethod
    def decrypt(self, encrypted: str) -> str:
        """Decrypt encrypted data.

        Args:
            encrypted: Encrypted data (base64 encoded)

        Returns:
            Decrypted plain text

        Raises:
            ValueError: If decryption fails (wrong key, corrupted data)

        Example:
            decrypted = encryption_service.decrypt("gAAAAABh...")
            # Returns: "my_secret_token"
        """
        pass
