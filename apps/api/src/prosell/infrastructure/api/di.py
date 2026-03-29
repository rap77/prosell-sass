"""
Dependency Injection for Dealer Use Cases.

Provides factory functions for dealer-related use cases with proper DI.
"""

from fastapi import Depends

from prosell.application.use_cases.dealer.create_dealer import CreateDealerUseCase
from prosell.application.use_cases.dealer.get_dealer import GetDealerUseCase
from prosell.application.use_cases.dealer.list_dealers import ListDealersUseCase
from prosell.domain.repositories.dealer_repository import AbstractDealerRepository
from prosell.infrastructure.api.dependencies.database import get_db_session
from prosell.infrastructure.repositories.dealer_repository_impl import SqlAlchemyDealerRepository


async def get_dealer_repository(
    session=Depends(get_db_session),
) -> AbstractDealerRepository:
    """Provide Dealer repository instance."""
    return SqlAlchemyDealerRepository(session)


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
