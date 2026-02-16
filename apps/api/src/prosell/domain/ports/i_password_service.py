"""Password service interface (port) for secondary actor."""

from typing import Protocol


class IPasswordService(Protocol):
    """
    Interface for password hashing and verification.

    This is a secondary port (interface) that the infrastructure layer
    must implement. The application layer depends on this interface,
    not on the concrete implementation.
    """

    def hash_password(self, password: str) -> str:
        """
        Hash password.

        Args:
            password: Plain text password

        Returns:
            Hashed password
        """
        ...

    def verify_password(self, password: str, hashed: str) -> bool:
        """
        Verify password against hash.

        Args:
            password: Plain text password
            hashed: Hashed password

        Returns:
            True if password matches hash
        """
        ...

    def validate_password_strength(self, password: str) -> list[str]:
        """
        Validate password strength requirements.

        Args:
            password: Plain text password

        Returns:
            List of validation errors (empty if valid)
        """
        ...
