"""Email value object."""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Email:
    """
    Email value object.

    Encapsulates email validation logic.
    """

    value: str

    # Disposable email domains (blocking list)
    DISPOSABLE_DOMAINS = {
        "tempmail.com",
        "guerrillamail.com",
        "mailinator.com",
        "10minutemail.com",
        "yopmail.com",
        "trashmail.com",
    }

    def __post_init__(self):
        """Validate email on initialization."""
        if not self._is_valid_format():
            raise ValueError(f"Invalid email format: {self.value}")

        if self._is_disposable_domain():
            raise ValueError(f"Disposable email domains are not allowed: {self.value}")

    def _is_valid_format(self) -> bool:
        """Validate email format using regex."""
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return re.match(pattern, self.value) is not None

    def _is_disposable_domain(self) -> bool:
        """Check if email domain is in disposable list."""
        domain = self.value.split("@")[-1].lower()
        return domain in self.DISPOSABLE_DOMAINS

    @property
    def domain(self) -> str:
        """Get email domain."""
        return self.value.split("@")[-1]

    @property
    def local_part(self) -> str:
        """Get email local part (before @)."""
        return self.value.split("@")[0]

    def __str__(self) -> str:
        return self.value
