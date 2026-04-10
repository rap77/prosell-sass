"""
Conftest for Category and Product integration tests.

Auth pattern (Brain #7 Condition B):
    Use app.dependency_overrides[get_current_auth_user_from_cookie] to inject
    test users. The db_session is real (no override). No cookies, no JWT generation.

Role-based fixtures:
    admin_user  — User with SUPER_ADMIN role (can see inactive categories)
    seller_user — User with SALES_AGENT role (filtered to is_active=True categories)
"""

from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app


@pytest.fixture
def shared_tenant_id():
    """Shared tenant_id for all users and resources in a test."""
    return uuid4()


@pytest.fixture
def admin_user(shared_tenant_id):
    """Admin user with SUPER_ADMIN role — can see inactive categories."""
    admin_role = Role(
        id=uuid4(),
        role_type=RoleType.SUPER_ADMIN,
        name="Super Admin",
        is_system_role=True,
        tenant_id=None,
    )
    user = User(
        id=uuid4(),
        email=f"admin-{uuid4().hex[:8]}@test.prosell.io",
        full_name="Admin Test User",
        tenant_id=shared_tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[admin_role],
    )
    return user


@pytest.fixture
def seller_user(shared_tenant_id):
    """Seller user with SALES_AGENT role — only sees active categories."""
    seller_role = Role(
        id=uuid4(),
        role_type=RoleType.SALES_AGENT,
        name="Sales Agent",
        is_system_role=True,
        tenant_id=None,
    )
    user = User(
        id=uuid4(),
        email=f"seller-{uuid4().hex[:8]}@test.prosell.io",
        full_name="Seller Test User",
        tenant_id=shared_tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[seller_role],
    )
    return user


@pytest_asyncio.fixture
async def async_client_as_admin(admin_user):
    """
    AsyncClient authenticated as admin_user via dependency_override.

    Uses dependency_overrides — NOT cookies or JWT tokens.
    db_session is NOT overridden: real DB interaction.
    """
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: admin_user
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def async_client_as_seller(seller_user):
    """
    AsyncClient authenticated as seller_user via dependency_override.

    Seller role = SALES_AGENT — ListCategoriesUseCase forces is_active=True.
    """
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: seller_user
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
    app.dependency_overrides.clear()
