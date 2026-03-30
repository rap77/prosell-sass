"""
Dependency Injection for Dealer and User-Dealer Use Cases.

Provides factory functions for dealer-related use cases with proper DI.
"""

from fastapi import Depends

from prosell.application.use_cases.dealer.create_dealer import CreateDealerUseCase
from prosell.application.use_cases.dealer.get_dealer import GetDealerUseCase
from prosell.application.use_cases.dealer.list_dealers import ListDealersUseCase
from prosell.application.use_cases.user_dealer.assign_user_dealer import AssignUserDealerUseCase
from prosell.application.use_cases.user_dealer.bulk_assign import BulkAssignUseCase
from prosell.application.use_cases.user_dealer.remove_user_dealer import RemoveUserDealerUseCase
from prosell.domain.repositories.dealer_repository import AbstractDealerRepository
from prosell.domain.repositories.user_dealer_repository import AbstractUserDealerRepository
from prosell.infrastructure.api.dependencies import get_async_session
from prosell.infrastructure.repositories.dealer_repository_impl import SqlAlchemyDealerRepository
from prosell.infrastructure.repositories.user_dealer_repository_impl import (
    SqlAlchemyUserDealerRepository,
)


async def get_dealer_repository(
    session=Depends(get_async_session),
) -> AbstractDealerRepository:
    """Provide Dealer repository instance."""
    return SqlAlchemyDealerRepository(session)


async def get_user_dealer_repository(
    session=Depends(get_async_session),
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
