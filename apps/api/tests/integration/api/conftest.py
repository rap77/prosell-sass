"""
Conftest for Category and Product integration tests.

Auth pattern (Brain #7 Condition B):
    Use app.dependency_overrides[get_current_auth_user_from_cookie] to inject
    test users. The db_session is real (no override). No cookies, no JWT generation.

Role-based fixtures:
    admin_user  — User entity from DB with SUPER_ADMIN role (can see inactive categories)
    seller_user — User entity from DB with SALES_AGENT role (filtered to is_active=True categories)

NOTE: These fixtures now convert database models to domain entities for compatibility
with existing tests that expect domain entities.
"""

from uuid import uuid4

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app


@pytest_asyncio.fixture
async def admin_user(test_user):
    """
    Admin user with SUPER_ADMIN role — can see inactive categories.

    Converts the database test_user into a domain entity for compatibility with
    existing tests that expect domain entities.
    """
    # Get the user's roles from the database

    # We need the db_session from the test_user fixture's scope
    # For now, we'll create a simple domain entity with minimal data
    admin_role = Role(
        id=uuid4(),  # Use a placeholder ID
        role_type=RoleType.SUPER_ADMIN,
        name="Super Admin",
        is_system_role=True,
        tenant_id=None,
    )

    user = User(
        id=test_user.id,
        email=test_user.email,
        full_name=test_user.full_name,
        tenant_id=test_user.tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[admin_role],
    )
    return user


@pytest_asyncio.fixture
async def seller_user(test_seller_user):
    """
    Seller user with SALES_AGENT role — only sees active categories.

    Converts the database test_seller_user into a domain entity for compatibility
    with existing tests that expect domain entities.
    """
    seller_role = Role(
        id=uuid4(),  # Use a placeholder ID
        role_type=RoleType.SALES_AGENT,
        name="Sales Agent",
        is_system_role=True,
        tenant_id=None,
    )

    user = User(
        id=test_seller_user.id,
        email=test_seller_user.email,
        full_name=test_seller_user.full_name,
        tenant_id=test_seller_user.tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[seller_role],
    )
    return user


@pytest_asyncio.fixture
async def async_client_as_admin(admin_user, db_session):
    """
    AsyncClient authenticated as admin_user via dependency_override.

    Uses dependency_overrides — NOT cookies or JWT tokens.
    Overrides both auth and database session to use test database.
    """
    from collections.abc import AsyncGenerator

    from prosell.infrastructure.database.session import get_async_session

    # Override auth
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: admin_user

    # Override database session to use test database
    async def override_get_async_session() -> AsyncGenerator:
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_async_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def async_client_as_seller(seller_user, db_session):
    """
    AsyncClient authenticated as seller_user via dependency_override.

    Seller role = SALES_AGENT — ListCategoriesUseCase forces is_active=True.
    Overrides both auth and database session to use test database.
    """
    from collections.abc import AsyncGenerator

    from prosell.infrastructure.database.session import get_async_session

    # Override auth
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: seller_user

    # Override database session to use test database
    async def override_get_async_session() -> AsyncGenerator:
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_async_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()
