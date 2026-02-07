"""Repository interfaces (Ports) for ProSell SaaS."""

from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.domain.repositories.session_repository import AbstractSessionRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository

__all__ = [
    "AbstractRoleRepository",
    "AbstractSessionRepository",
    "AbstractUserRepository",
]
