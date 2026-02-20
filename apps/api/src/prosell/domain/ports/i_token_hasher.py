"""Token hasher interface (port) for secondary actor."""

from typing import Protocol


class ITokenHasher(Protocol):
    """
    Interface for hashing tokens.

    This is a secondary port (interface) that the infrastructure layer
    must implement. The application layer depends on this interface,
    not on the concrete implementation.
    """

    def hash(self, token: str) -> str:
        """
        Hash a token for secure storage.

        Args:
            token: Plain text token

        Returns:
            Hashed token
        """
        ...
