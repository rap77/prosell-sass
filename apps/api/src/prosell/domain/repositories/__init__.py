"""Repository interfaces (Ports) for ProSell SaaS."""

from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.repositories.notification_repository import AbstractNotificationRepository
from prosell.domain.repositories.oauth_repository import AbstractOAuthRepository
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.domain.repositories.session_repository import AbstractSessionRepository
from prosell.domain.repositories.team_invitation_repository import (
    AbstractTeamInvitationRepository,
)
from prosell.domain.repositories.team_repository import (
    AbstractTeamMemberRepository,
    AbstractTeamRepository,
)
from prosell.domain.repositories.user_branch_repository import AbstractUserBranchRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository
from prosell.domain.repositories.wallet_repository import (
    AbstractWalletRepository,
    AbstractWalletTransactionRepository,
)

__all__ = [
    "AbstractCategoryRepository",
    "AbstractLeadRepository",
    "AbstractNotificationRepository",
    "AbstractOAuthRepository",
    "AbstractOrganizationRepository",
    "AbstractProductRepository",
    "AbstractRoleRepository",
    "AbstractSessionRepository",
    "AbstractTeamInvitationRepository",
    "AbstractTeamMemberRepository",
    "AbstractTeamRepository",
    "AbstractUserBranchRepository",
    "AbstractUserRepository",
    "AbstractWalletRepository",
    "AbstractWalletTransactionRepository",
]
