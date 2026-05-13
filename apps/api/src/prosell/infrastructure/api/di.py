"""
Dependency Injection for Branch, User-Branch, and Webhook Use Cases.

Provides factory functions for use cases with proper DI.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.use_cases.branch.create_branch import CreateBranchUseCase
from prosell.application.use_cases.branch.get_branch import GetBranchUseCase
from prosell.application.use_cases.branch.list_branches import ListBranchesUseCase
from prosell.application.use_cases.facebook_webhook_use_case import ProcessFacebookWebhookUseCase
from prosell.application.use_cases.lead.create_lead import CreateLeadUseCase
from prosell.application.use_cases.user_branch.assign_user_branch import AssignUserBranchUseCase
from prosell.application.use_cases.user_branch.bulk_assign import BulkAssignUseCase
from prosell.application.use_cases.user_branch.remove_user_branch import RemoveUserBranchUseCase
from prosell.domain.repositories.branch_repository import AbstractBranchRepository
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.domain.repositories.user_branch_repository import AbstractUserBranchRepository
from prosell.infrastructure.api.dependencies import get_async_session
from prosell.infrastructure.repositories.branch_repository_impl import SqlAlchemyBranchRepository
from prosell.infrastructure.repositories.lead_repository_impl import SqlAlchemyLeadRepository
from prosell.infrastructure.repositories.publication_repository_impl import (
    SqlAlchemyPublicationRepository,
)
from prosell.infrastructure.repositories.user_branch_repository_impl import (
    SqlAlchemyUserBranchRepository,
)
from prosell.infrastructure.services.facebook_graph_api_client import (
    FacebookGraphApiClient,
)
from prosell.domain.repositories.facebook_page_repository import IFacebookPageRepository
from prosell.infrastructure.repositories.facebook_page_repository_impl import SqlAlchemyFacebookPageRepository
from prosell.infrastructure.services.token_encryption_service import TokenEncryptionService


async def get_branch_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractBranchRepository:
    """Provide Branch repository instance."""
    return SqlAlchemyBranchRepository(session)


async def get_user_branch_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractUserBranchRepository:
    """Provide UserBranch repository instance."""
    return SqlAlchemyUserBranchRepository(session)


async def get_create_branch_use_case(
    branch_repository: AbstractBranchRepository = Depends(get_branch_repository),
) -> CreateBranchUseCase:
    """Provide CreateBranchUseCase instance."""
    return CreateBranchUseCase(branch_repository)


async def get_get_branch_use_case(
    branch_repository: AbstractBranchRepository = Depends(get_branch_repository),
) -> GetBranchUseCase:
    """Provide GetBranchUseCase instance."""
    return GetBranchUseCase(branch_repository)


async def get_list_branches_use_case(
    branch_repository: AbstractBranchRepository = Depends(get_branch_repository),
) -> ListBranchesUseCase:
    """Provide ListBranchesUseCase instance."""
    return ListBranchesUseCase(branch_repository)


async def get_assign_user_branch_use_case(
    user_branch_repo: AbstractUserBranchRepository = Depends(get_user_branch_repository),
    branch_repo: AbstractBranchRepository = Depends(get_branch_repository),
) -> AssignUserBranchUseCase:
    """Provide AssignUserBranchUseCase instance."""
    return AssignUserBranchUseCase(user_branch_repo, branch_repo)


async def get_bulk_assign_use_case(
    user_branch_repo: AbstractUserBranchRepository = Depends(get_user_branch_repository),
) -> BulkAssignUseCase:
    """Provide BulkAssignUseCase instance."""
    return BulkAssignUseCase(user_branch_repo)


async def get_remove_user_branch_use_case(
    user_branch_repo: AbstractUserBranchRepository = Depends(get_user_branch_repository),
) -> RemoveUserBranchUseCase:
    """Provide RemoveUserBranchUseCase instance."""
    return RemoveUserBranchUseCase(user_branch_repo)


# =============================================================================
# WEBHOOK DEPENDENCIES
# =============================================================================


async def get_lead_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractLeadRepository:
    """Provide Lead repository instance."""
    return SqlAlchemyLeadRepository(session)


async def get_publication_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> IPublicationRepository:
    """Provide Publication repository instance."""
    return SqlAlchemyPublicationRepository(session)


async def get_facebook_graph_api_client() -> FacebookGraphApiClient:
    """Provide FacebookGraphApiClient instance."""
    # TODO: Add proper configuration for Graph API client
    return FacebookGraphApiClient()




async def get_create_lead_use_case(
    lead_repository: AbstractLeadRepository = Depends(get_lead_repository),
) -> CreateLeadUseCase:
    """Provide CreateLeadUseCase instance."""
    return CreateLeadUseCase(lead_repository)


async def get_facebook_page_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> IFacebookPageRepository:
    """Provide FacebookPage repository instance."""
    return SqlAlchemyFacebookPageRepository(session)


def get_encryption_service() -> TokenEncryptionService:
    """Provide TokenEncryptionService instance."""
    from prosell.core.config import settings
    
    # Convert base64 string to bytes
    import base64
    key_bytes = base64.urlsafe_b64decode(settings.facebook_encryption_key + "==" * (4 - len(settings.facebook_encryption_key) % 4))
    return TokenEncryptionService(encryption_key=key_bytes)

async def get_process_facebook_webhook_use_case(
    lead_repository: AbstractLeadRepository = Depends(get_lead_repository),
    publication_repository: IPublicationRepository = Depends(get_publication_repository),
    facebook_page_repository: IFacebookPageRepository = Depends(get_facebook_page_repository),
    create_lead_use_case: CreateLeadUseCase = Depends(get_create_lead_use_case),
    encryption_service: TokenEncryptionService = Depends(get_encryption_service),
) -> ProcessFacebookWebhookUseCase:
    """Provide ProcessFacebookWebhookUseCase instance."""
    return ProcessFacebookWebhookUseCase(
        lead_repository=lead_repository,
        publication_repository=publication_repository,
        facebook_page_repository=facebook_page_repository,
        facebook_client=FacebookGraphApiClient(),
        create_lead_use_case=create_lead_use_case,
        encryption_service=encryption_service,
    )
