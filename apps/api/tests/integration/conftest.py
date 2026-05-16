"""Integration test fixtures - provides database session for tests.

PHASE 1 FIX: Session-scoped system roles to prevent unique constraint violations.
"""

from collections.abc import AsyncGenerator
from typing import Any
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from prosell.infrastructure.models.role_model import RoleModel

TEST_DB_URL = "postgresql+asyncpg://prosell:prosell_test_password@localhost:5433/prosell_test"

# =============================================================================
# SESSION-SCOPED FIXTURES - Run once per test session
# =============================================================================

@pytest_asyncio.fixture(scope="session")
async def _session_engine() -> AsyncGenerator[Any]:
    """Create engine for session-scoped fixtures."""
    engine: AsyncEngine = create_async_engine(TEST_DB_URL, echo=False)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def system_roles(_session_engine) -> dict[str, RoleModel]:
    """
    Create system roles ONCE per test session.
    These roles are committed to the database and persist across all tests.

    This fixes: "duplicate key value violates unique constraint roles_role_type_key"
    """
    async_session_maker = async_sessionmaker(
        _session_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session_maker() as session:
        # Check if roles already exist (from previous test run or manual setup)
        stmt = select(RoleModel).where(
            RoleModel.role_type.in_(["SUPER_ADMIN", "SALES_AGENT", "MANAGER", "ADMIN"])
        )
        result = await session.execute(stmt)
        existing_roles = {r.role_type: r for r in result.scalars().all()}

        roles = {}

        # Create SUPER_ADMIN if not exists
        if "SUPER_ADMIN" not in existing_roles:
            role = RoleModel(
                id=uuid4(),
                role_type="SUPER_ADMIN",
                name="Super Admin",
                description="Super admin role for tests",
                is_system_role=True,
                tenant_id=None,
            )
            session.add(role)
            await session.flush()
            roles["SUPER_ADMIN"] = role
        else:
            roles["SUPER_ADMIN"] = existing_roles["SUPER_ADMIN"]

        # Create SALES_AGENT if not exists
        if "SALES_AGENT" not in existing_roles:
            role = RoleModel(
                id=uuid4(),
                role_type="SALES_AGENT",
                name="Sales Agent",
                description="Sales agent role for tests",
                is_system_role=True,
                tenant_id=None,
            )
            session.add(role)
            await session.flush()
            roles["SALES_AGENT"] = role
        else:
            roles["SALES_AGENT"] = existing_roles["SALES_AGENT"]

        # Create MANAGER if not exists
        if "MANAGER" not in existing_roles:
            role = RoleModel(
                id=uuid4(),
                role_type="MANAGER",
                name="Manager",
                description="Manager role for tests",
                is_system_role=True,
                tenant_id=None,
            )
            session.add(role)
            await session.flush()
            roles["MANAGER"] = role
        else:
            roles["MANAGER"] = existing_roles["MANAGER"]

        # Create ADMIN if not exists
        if "ADMIN" not in existing_roles:
            role = RoleModel(
                id=uuid4(),
                role_type="ADMIN",
                name="Admin",
                description="Admin role for tests",
                is_system_role=True,
                tenant_id=None,
            )
            session.add(role)
            await session.flush()
            roles["ADMIN"] = role
        else:
            roles["ADMIN"] = existing_roles["ADMIN"]

        # Commit to persist these roles for the entire test session
        await session.commit()

    return roles


# =============================================================================
# FUNCTION-SCOPED FIXTURES - Clean state for each test
# =============================================================================

@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession]:
    """
    Function-scoped fixture providing a clean database session for each test.
    Wraps test in transaction and rolls back after completion.
    """
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async_session_maker = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session_maker() as session, session.begin():
        yield session
        # Rollback after test to keep database clean
        await session.rollback()

    await engine.dispose()


# =============================================================================
# TEST DATA FIXTURES - Use system_roles instead of creating new ones
# =============================================================================

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.role_model import RoleModel, UserRoleModel
from prosell.infrastructure.models.user_model import UserModel


@pytest_asyncio.fixture
async def test_organization(db_session: AsyncSession) -> AsyncGenerator[OrganizationModel]:
    """
    Create a test organization in the database.
    This is required for any entity that has a tenant_id foreign key.

    NOTE: The organization.id is what should be used as tenant_id for other entities,
    because categories.tenant_id references organizations(id).
    """
    org_id: UUID = uuid4()

    org = OrganizationModel(
        id=org_id,
        name=f"Test Org {uuid4().hex[:8]}",
        tenant_id=org_id,  # In this model, org.id == org.tenant_id
        status="active",
        description="Test organization for integration tests",
        settings={},
    )

    db_session.add(org)
    await db_session.flush()  # Flush to get ID but don't commit yet

    yield org
    # Rollback will happen automatically via db_session fixture


@pytest_asyncio.fixture
async def test_role(system_roles: dict[str, RoleModel]) -> RoleModel:
    """
    Return the SUPER_ADMIN system role.
    Does NOT create a new role - uses the session-scoped one.
    """
    return system_roles["SUPER_ADMIN"]


@pytest_asyncio.fixture
async def test_seller_role(system_roles: dict[str, RoleModel]) -> RoleModel:
    """
    Return the SALES_AGENT system role.
    Does NOT create a new role - uses the session-scoped one.
    """
    return system_roles["SALES_AGENT"]


@pytest_asyncio.fixture
async def test_manager_role(system_roles: dict[str, RoleModel]) -> RoleModel:
    """
    Return the MANAGER system role.
    Does NOT create a new role - uses the session-scoped one.
    """
    return system_roles["MANAGER"]


@pytest_asyncio.fixture
async def test_user(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_role: RoleModel,
) -> AsyncGenerator[UserModel]:
    """
    Create a test user in the database with SUPER_ADMIN role.
    User belongs to the test_organization.
    """
    user_id: UUID = uuid4()

    user = UserModel(
        id=user_id,
        email=f"admin-{uuid4().hex[:8]}@test.prosell.io",
        full_name="Admin Test User",
        tenant_id=test_organization.tenant_id,
        status="active",
        email_verified=True,
        is_2fa_enabled=False,
        failed_login_attempts=0,
    )

    db_session.add(user)
    await db_session.flush()

    # Assign role to user
    user_role = UserRoleModel(
        id=uuid4(),
        user_id=user.id,
        role_id=test_role.id,
    )

    db_session.add(user_role)
    await db_session.flush()

    yield user


@pytest_asyncio.fixture
async def test_seller_user(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_seller_role: RoleModel,
) -> AsyncGenerator[UserModel]:
    """
    Create a test seller user in the database with SALES_AGENT role.
    User belongs to the test_organization.
    """
    user_id: UUID = uuid4()

    user = UserModel(
        id=user_id,
        email=f"seller-{uuid4().hex[:8]}@test.prosell.io",
        full_name="Seller Test User",
        tenant_id=test_organization.tenant_id,
        status="active",
        email_verified=True,
        is_2fa_enabled=False,
        failed_login_attempts=0,
    )

    db_session.add(user)
    await db_session.flush()

    # Assign role to user
    user_role = UserRoleModel(
        id=uuid4(),
        user_id=user.id,
        role_id=test_seller_role.id,
    )

    db_session.add(user_role)
    await db_session.flush()

    yield user


@pytest_asyncio.fixture
async def test_category(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> AsyncGenerator[CategoryModel]:
    """Create a test category in the database."""
    category = CategoryModel(
        id=uuid4(),
        name=f"Test Category {uuid4().hex[:8]}",
        slug=f"test-category-{uuid4().hex[:8]}",
        tenant_id=test_organization.tenant_id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )

    db_session.add(category)
    await db_session.flush()

    yield category


# =============================================================================
# HELPER FIXTURES - For convenience
# =============================================================================

@pytest.fixture
def shared_tenant_id() -> UUID:
    """Shared tenant_id for all users and resources in a test (legacy)."""
    return uuid4()  # type: ignore[no-any-return]


@pytest.fixture(autouse=True)
def disable_rate_limiting(monkeypatch: pytest.MonkeyPatch) -> None:
    """Disable rate limiting during integration tests."""
    try:
        from prosell.infrastructure.api.middleware.rate_limit_middleware import limiter

        if hasattr(limiter, "enabled"):
            monkeypatch.setattr(limiter, "enabled", False)
        else:
            def mock_check(*_args: Any, **_kwargs: Any) -> None:
                return None
            monkeypatch.setattr(limiter, "_check_rate_limit", mock_check)
    except (ImportError, AttributeError):
        pass  # Rate limiting may not be enabled
