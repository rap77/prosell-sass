"""Repository interfaces (Ports) for ProSell SaaS."""

from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.domain.repositories.session_repository import AbstractSessionRepository
from prosell.domain.repositories.team_repository import (
    AbstractTeamMemberRepository,
    AbstractTeamRepository,
)
from prosell.domain.repositories.user_dealer_repository import AbstractUserDealerRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository
from prosell.domain.repositories.vehicle_repository import AbstractVehicleRepository
from prosell.domain.repositories.wallet_repository import (
    AbstractWalletRepository,
    AbstractWalletTransactionRepository,
)

__all__ = [
    "AbstractCategoryRepository",
    "AbstractOrganizationRepository",
    "AbstractProductRepository",
    "AbstractRoleRepository",
    "AbstractSessionRepository",
    "AbstractTeamMemberRepository",
    "AbstractTeamRepository",
    "AbstractUserDealerRepository",
    "AbstractUserRepository",
    "AbstractVehicleRepository",
    "AbstractWalletRepository",
    "AbstractWalletTransactionRepository",
]
