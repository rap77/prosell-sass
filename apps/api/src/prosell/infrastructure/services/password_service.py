"""Password hashing and verification service using bcrypt."""

import bcrypt

from prosell.core.config import settings
from prosell.domain.ports import IPasswordService


class PasswordService(IPasswordService):
    """
    Password hashing and verification using bcrypt.

    Note: bcrypt can only handle passwords up to 72 characters.
    """

    def __init__(self, rounds: int | None = None) -> None:
        """
        Initialize password service.

        Args:
            rounds: bcrypt cost factor (4-31, higher = slower but more secure)
        """
        self.rounds = rounds or settings.bcrypt_rounds

    def hash_password(self, password: str) -> str:
        """
        Hash password using bcrypt.

        Args:
            password: Plain text password

        Returns:
            Hashed password
        """
        salt = bcrypt.gensalt(rounds=self.rounds)
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def verify_password(self, password: str, hashed: str) -> bool:
        """
        Verify password against hash.

        Args:
            password: Plain text password
            hashed: Hashed password

        Returns:
            True if password matches hash
        """
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

    def validate_password_strength(self, password: str) -> list[str]:
        """
        Validate password strength requirements.

        Args:
            password: Plain text password

        Returns:
            List of validation errors (empty if valid)
        """
        errors = []

        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")

        if not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")

        if not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")

        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")

        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain at least one special character")

        return errors
