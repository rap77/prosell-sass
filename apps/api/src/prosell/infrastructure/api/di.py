"""
Dependency Injection for Dealer, User-Dealer, and Webhook Use Cases.

Provides factory functions for use cases with proper DI.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.use_cases.dealer.create_dealer import CreateDealerUseCase
from prosell.application.use_cases.dealer.get_dealer import GetDealerUseCase
from prosell.application.use_cases.dealer.list_dealers import ListDealersUseCase
from prosell.application.use_cases.facebook_webhook_use_case import ProcessFacebookWebhookUseCase
from prosell.application.use_cases.lead.create_lead import CreateLeadUseCase
from prosell.application.use_cases.user_dealer.assign_user_dealer import AssignUserDealerUseCase
from prosell.application.use_cases.user_dealer.bulk_assign import BulkAssignUseCase
from prosell.application.use_cases.user_dealer.remove_user_dealer import RemoveUserDealerUseCase
from prosell.domain.repositories.dealer_repository import AbstractDealerRepository
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.domain.repositories.user_dealer_repository import AbstractUserDealerRepository
from prosell.infrastructure.api.dependencies import get_async_session
from prosell.infrastructure.repositories.dealer_repository_impl import SqlAlchemyDealerRepository
from prosell.infrastructure.repositories.lead_repository_impl import SqlAlchemyLeadRepository
from prosell.infrastructure.repositories.publication_repository_impl import (
    SqlAlchemyPublicationRepository,
)
from prosell.infrastructure.repositories.user_dealer_repository_impl import (
    SqlAlchemyUserDealerRepository,
)
from prosell.infrastructure.services.facebook_graph_api_client import (
    FacebookGraphApiClient,
)


async def get_dealer_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractDealerRepository:
    """Provide Dealer repository instance."""
    return SqlAlchemyDealerRepository(session)


async def get_user_dealer_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractUserDealerRepository:
    """Provide UserDealer repository instance."""
    return SqlAlchemyUserDealerRepository(session)


async def get_create_dealer_use_case(
    dealer_repository: AbstractDealerRepository = Depends(get_dealer_repository),
) -> CreateDealerUseCase:
    """Provide CreateDealerUseCase instance."""
    return CreateDealerUseCase(dealer_repository)


async def get_get_dealer_use_case(
    dealer_repository: AbstractDealerRepository = Depends(get_dealer_repository),
) -> GetDealerUseCase:
    """Provide GetDealerUseCase instance."""
    return GetDealerUseCase(dealer_repository)


async def get_list_dealers_use_case(
    dealer_repository: AbstractDealerRepository = Depends(get_dealer_repository),
) -> ListDealersUseCase:
    """Provide ListDealersUseCase instance."""
    return ListDealersUseCase(dealer_repository)


async def get_assign_user_dealer_use_case(
    user_dealer_repo: AbstractUserDealerRepository = Depends(get_user_dealer_repository),
    dealer_repo: AbstractDealerRepository = Depends(get_dealer_repository),
) -> AssignUserDealerUseCase:
    """Provide AssignUserDealerUseCase instance."""
    return AssignUserDealerUseCase(user_dealer_repo, dealer_repo)


async def get_bulk_assign_use_case(
    user_dealer_repo: AbstractUserDealerRepository = Depends(get_user_dealer_repository),
) -> BulkAssignUseCase:
    """Provide BulkAssignUseCase instance."""
    return BulkAssignUseCase(user_dealer_repo)


async def get_remove_user_dealer_use_case(
    user_dealer_repo: AbstractUserDealerRepository = Depends(get_user_dealer_repository),
) -> RemoveUserDealerUseCase:
    """Provide RemoveUserDealerUseCase instance."""
    return RemoveUserDealerUseCase(user_dealer_repo)


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


async def get_process_facebook_webhook_use_case(
    lead_repository: AbstractLeadRepository = Depends(get_lead_repository),
    publication_repository: IPublicationRepository = Depends(get_publication_repository),
    facebook_client: Annotated[FacebookGraphApiClient, Depends(get_facebook_graph_api_client)] = None,  # type: ignore[assignment]
    create_lead_use_case: CreateLeadUseCase = Depends(get_create_lead_use_case),
) -> ProcessFacebookWebhookUseCase:
    """Provide ProcessFacebookWebhookUseCase instance."""
    # facebook_client is optional (will be None if not provided)
    # This is OK for now since we're not fetching buyer profiles until Phase 3
    return ProcessFacebookWebhookUseCase(
        lead_repository=lead_repository,
        publication_repository=publication_repository,
        facebook_client=facebook_client or FacebookGraphApiClient(),
        create_lead_use_case=create_lead_use_case,
    )
