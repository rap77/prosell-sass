"""Integration tests for POST /api/v1/categories/infer (T4).

The endpoint wires the request body into InferCategoryUseCase and
returns the typed response. Tests cover what only the endpoint can
verify: auth, DTO validation, H3 (no body logging), and tenant
isolation.

These tests require a real database (Docker at port 5433 per CLAUDE.md).
Without DB they skip — the use case itself is unit-tested in
``tests/unit/application/use_cases/category/test_infer_category.py``.
"""

from collections.abc import AsyncGenerator
from uuid import UUID, uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
)
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel

pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Local fixtures (kept inline to avoid polluting the shared conftest)
# ---------------------------------------------------------------------------


def _seller_user(tenant_id: UUID) -> User:
    seller_role = Role(
        id=uuid4(),
        role_type=RoleType.SALES_AGENT,
        name="Sales Agent",
        is_system_role=True,
        tenant_id=None,
    )
    return User(
        id=uuid4(),
        email=f"seller-{tenant_id.hex[:6]}@test.local",
        full_name="Test Seller",
        tenant_id=tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[seller_role],
    )


@pytest_asyncio.fixture
async def seller_in_default_org(
    test_organization,
) -> User:
    """A seller user bound to test_organization.tenant_id."""
    return _seller_user(test_organization.tenant_id)


@pytest_asyncio.fixture
async def other_organization(db_session: AsyncSession) -> AsyncGenerator[OrganizationModel]:
    """A second org for tenant-isolation tests. Different tenant_id."""
    org_id = uuid4()
    org = OrganizationModel(
        id=org_id,
        name=f"Other Org {uuid4().hex[:8]}",
        tenant_id=org_id,
        status="active",
        description="Other org for tenant isolation",
        settings={},
    )
    db_session.add(org)
    await db_session.flush()
    yield org


@pytest_asyncio.fixture
async def seller_in_other_org(other_organization) -> User:
    """A seller user bound to other_organization.tenant_id."""
    return _seller_user(other_organization.tenant_id)


@pytest_asyncio.fixture
async def seed_root_categories(
    db_session: AsyncSession,
    test_organization,  # noqa: ARG001
) -> list[CategoryModel]:
    """Seed two active root categories visible to test_organization.

    "Vehicles" has make/model/year fields (mimics real Vehicles vertical).
    "Real Estate" has bedrooms/area fields. Both are is_active=True
    root categories (parent_id=None) — exactly what get_active_roots
    returns.
    """
    vehicles = CategoryModel(
        id=uuid4(),
        tenant_id=None,  # global template
        name="Vehicles",
        slug="vehicles",
        level=0,
        parent_id=None,
        is_active=True,
        field_config=[
            {"field_name": "make", "field_label": "Make", "field_type": "string"},
            {"field_name": "model", "field_label": "Model", "field_type": "string"},
            {"field_name": "year", "field_label": "Year", "field_type": "number"},
        ],
        attribute_schema={
            "make": {"type": "string"},
            "model": {"type": "string"},
            "year": {"type": "number"},
        },
    )
    real_estate = CategoryModel(
        id=uuid4(),
        tenant_id=None,
        name="Real Estate",
        slug="real-estate",
        level=0,
        parent_id=None,
        is_active=True,
        field_config=[
            {"field_name": "bedrooms", "field_label": "Bedrooms", "field_type": "number"},
            {"field_name": "area", "field_label": "Area", "field_type": "number"},
        ],
        attribute_schema={},
    )
    db_session.add_all([vehicles, real_estate])
    await db_session.flush()
    return [vehicles, real_estate]


@pytest_asyncio.fixture
async def other_tenant_root_category(
    db_session: AsyncSession,
    other_organization,
) -> CategoryModel:
    """A root category that belongs to a DIFFERENT tenant.

    Must NOT appear in seller_in_default_org's inference response.
    """
    cat = CategoryModel(
        id=uuid4(),
        tenant_id=other_organization.tenant_id,
        name="OtherTenantRoot",
        slug=f"other-{uuid4().hex[:6]}",
        level=0,
        parent_id=None,
        is_active=True,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(cat)
    await db_session.flush()
    return cat


@pytest_asyncio.fixture
async def client_as_seller(
    seller_in_default_org: User,
    db_session: AsyncSession,
) -> AsyncGenerator[AsyncClient]:
    """AsyncClient authenticated as seller_in_default_org."""
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: seller_in_default_org

    async def override_session() -> AsyncGenerator:
        yield db_session

    app.dependency_overrides[get_async_session] = override_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client_as_other_seller(
    seller_in_other_org: User,
    db_session: AsyncSession,
) -> AsyncGenerator[AsyncClient]:
    """AsyncClient authenticated as seller_in_other_org (for isolation tests)."""
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: seller_in_other_org

    async def override_session() -> AsyncGenerator:
        yield db_session

    app.dependency_overrides[get_async_session] = override_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def unauthenticated_client(
    db_session: AsyncSession,
) -> AsyncGenerator[AsyncClient]:
    """AsyncClient with NO auth override — request goes through the
    real get_current_auth_user_from_cookie which will raise 401."""
    # Make sure no stale override
    app.dependency_overrides.pop(get_current_auth_user_from_cookie, None)

    async def override_session() -> AsyncGenerator:
        yield db_session

    app.dependency_overrides[get_async_session] = override_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_async_session, None)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_infer_returns_suggestion_for_vehicles(
    client_as_seller,
    seed_root_categories,  # noqa: ARG001
) -> None:
    """Happy path: title + matching attrs → Vehicles is the suggestion."""
    response = await client_as_seller.post(
        "/api/v1/categories/infer",
        json={
            "title": "Honda Civic 2020",
            "attributes": {"make": "Honda", "model": "Civic", "year": 2020},
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["suggestion"] is not None
    assert body["suggestion"]["name"] == "Vehicles"
    assert body["suggestion"]["score"] >= 0.5
    # Both root categories are in alternatives (Vehicles first)
    names = {a["name"] for a in body["alternatives"]}
    assert "Vehicles" in names
    assert "Real Estate" in names


async def test_infer_tenant_isolation(
    client_as_seller,
    seed_root_categories,  # noqa: ARG001
    other_tenant_root_category,
) -> None:
    """Seller MUST NOT see other tenants' categories in the response."""
    response = await client_as_seller.post(
        "/api/v1/categories/infer",
        json={"title": "Foo", "attributes": {}},
    )
    assert response.status_code == 200
    names = {a["name"] for a in response.json()["alternatives"]}
    assert other_tenant_root_category.name not in names


async def test_infer_requires_authentication(
    unauthenticated_client,
) -> None:
    """No auth → 401. The endpoint must enforce authentication before
    any inference work happens."""
    response = await unauthenticated_client.post(
        "/api/v1/categories/infer",
        json={"title": "X", "attributes": {}},
    )
    assert response.status_code == 401


async def test_infer_accepts_missing_attributes_field(
    client_as_seller,
    seed_root_categories,  # noqa: ARG001
) -> None:
    """M3: request without `attributes` key at all — Pydantic default_factory
    produces {}. Must NOT 422."""
    response = await client_as_seller.post(
        "/api/v1/categories/infer",
        json={"title": "Honda"},
    )
    assert response.status_code == 200


async def test_infer_accepts_explicit_empty_attributes(
    client_as_seller,
    seed_root_categories,  # noqa: ARG001
) -> None:
    """M3: explicit empty dict must NOT 422 — same as missing key."""
    response = await client_as_seller.post(
        "/api/v1/categories/infer",
        json={"title": "Honda", "attributes": {}},
    )
    assert response.status_code == 200


async def test_infer_returns_empty_for_whitespace_only_title(
    client_as_seller,
    seed_root_categories,  # noqa: ARG001
) -> None:
    """M1: '   ' passes Pydantic min_length=1 but the scorer filters it
    internally → 200 OK with no suggestion and empty alternatives.
    Rejecting at Pydantic would be a UX regression (backspace-typing
    briefly sends ' ' between deletes).
    """
    response = await client_as_seller.post(
        "/api/v1/categories/infer",
        json={"title": "   ", "attributes": {}},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["suggestion"] is None
    assert body["alternatives"] == []


async def test_infer_does_not_log_request_body(
    client_as_seller,
    seed_root_categories,  # noqa: ARG001
    caplog,
) -> None:
    """H3 privacy: the endpoint MUST NOT log title or attributes (could
    be PII or competitor product details). We assert a known secret
    string in the body does not appear in any log record.
    """
    secret = "SECRET_PRODUCT_NAME_DO_NOT_LOG"
    with caplog.at_level("INFO"):
        response = await client_as_seller.post(
            "/api/v1/categories/infer",
            json={"title": secret, "attributes": {}},
        )
    assert response.status_code == 200
    # caplog captures app loggers (uvicorn access logs don't include the body)
    leaked = any(secret in r.getMessage() for r in caplog.records)
    assert not leaked, (
        f"Endpoint leaked request body to logs: {[r.getMessage() for r in caplog.records]}"
    )


async def test_infer_rejects_truly_invalid_body(
    client_as_seller,
) -> None:
    """Missing `title` field entirely → 422 (Pydantic validation)."""
    response = await client_as_seller.post(
        "/api/v1/categories/infer",
        json={"attributes": {}},
    )
    assert response.status_code == 422
