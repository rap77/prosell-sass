"""Value objects for ProSell SaaS domain."""

from prosell.domain.entities.user import UserStatus
from prosell.domain.value_objects.email import Email

__all__ = [
    "Email",
    "UserStatus",
]
