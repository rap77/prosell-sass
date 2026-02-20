"""Token hasher implementation."""

import hashlib


class TokenHasher:
    """
    Implementation of ITokenHasher interface.

    This service provides secure token hashing using SHA-256.
    """

    def hash(self, token: str) -> str:
        """
        Hash a token for secure storage.

        Args:
            token: Plain text token

        Returns:
            Hashed token as hexadecimal string
        """
        return hashlib.sha256(token.encode()).hexdigest()
