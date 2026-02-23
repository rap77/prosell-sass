"""Repository interfaces (Ports) for ProSell SaaS."""

from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.domain.repositories.session_repository import AbstractSessionRepository
from prosell.domain.repositories.team_repository import (
    AbstractTeamMemberRepository,
    AbstractTeamRepository,
)
from prosell.domain.repositories.user_repository import AbstractUserRepository
from prosell.domain.repositories.wallet_repository import (
    AbstractWalletRepository,
    AbstractWalletTransactionRepository,
)

__all__ = [
    "AbstractOrganizationRepository",
    "AbstractRoleRepository",
    "AbstractSessionRepository",
    "AbstractTeamMemberRepository",
    "AbstractTeamRepository",
    "AbstractUserRepository",
    "AbstractWalletRepository",
    "AbstractWalletTransactionRepository",
]
