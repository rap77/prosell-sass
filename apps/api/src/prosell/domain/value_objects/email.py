"""Email value object."""

from typing import ClassVar

from pydantic import EmailStr, field_validator

from prosell.domain.base import ValueObject


class Email(ValueObject):
    """
    Email value object.

    Encapsulates email validation logic using Pydantic EmailStr validation.
    Immutable by inheritance from ValueObject (frozen=True).
    """

    address: EmailStr  # Pydantic validates email format automatically

    # Disposable email domains (blocking list)
    DISPOSABLE_DOMAINS: ClassVar[set[str]] = {
        "tempmail.com",
        "guerrillamail.com",
        "mailinator.com",
        "10minutemail.com",
        "yopmail.com",
        "trashmail.com",
    }

    @field_validator("address")
    @classmethod
    def reject_disposable(cls, v: str) -> str:
        """Reject disposable email domains."""
        domain = v.split("@")[-1].lower()
        if domain in Email.DISPOSABLE_DOMAINS:
            raise ValueError(f"Disposable email domains are not allowed: {v}")
        return v

    @property
    def domain(self) -> str:
        """Get email domain."""
        return self.address.split("@")[-1]

    @property
    def local_part(self) -> str:
        """Get email local part (before @)."""
        return self.address.split("@")[0]

    def __str__(self) -> str:
        return self.address
