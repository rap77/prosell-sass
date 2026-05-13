import pytest_asyncio
from collections.abc import AsyncGenerator
from httpx import AsyncClient
from prosell.domain.entities.user import User
from prosell.infrastructure.models.user_model import UserModel as UserModel
from sqlalchemy.ext.asyncio import AsyncSession as AsyncSession

@pytest_asyncio.fixture
async def admin_user(test_user: UserModel) -> User: ...
@pytest_asyncio.fixture
async def seller_user(test_seller_user: UserModel) -> User: ...
@pytest_asyncio.fixture
async def async_client_as_admin(admin_user: User, db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]: ...
@pytest_asyncio.fixture
async def async_client_as_seller(seller_user: User, db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]: ...
