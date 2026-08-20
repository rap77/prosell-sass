"""Prove-It test for a cross-tenant auth bypass in the batch product endpoints.

Found by GGA while reviewing an unrelated commit: `tenant_id = None if
current_user.has_role("super_admin") else current_user.tenant_id` followed by
`if tenant_id is not None and current_user.tenant_id is None: raise 403` can
never raise -- when the user isn't super_admin, tenant_id IS
current_user.tenant_id, so "tenant_id is not None and current_user.tenant_id
is None" reduces to "X is not None and X is None", always False. A
non-super-admin, tenant-less user's request silently falls through with
tenant_id=None passed to the use case -- the same value used for
super_admin's "no filter, see every tenant" bypass.
"""

from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session


def _make_tenantless_manager() -> User:
    """MANAGER: has MARKETPLACE_PUBLISH (so it clears that gate) but is NOT
    super_admin, with no tenant -- the state every other single-product
    endpoint in this router explicitly rejects."""
    role = Role(
        id=uuid4(),
        role_type=RoleType.MANAGER,
        name="Manager",
        is_system_role=True,
        tenant_id=None,
    )
    return User(
        id=uuid4(),
        email=f"tenantless-{uuid4().hex[:8]}@test.prosell.io",
        full_name="Tenantless Manager",
        tenant_id=None,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[role],
    )


@pytest.fixture
async def async_client_as_tenantless_manager(db_session: AsyncSession):
    user = _make_tenantless_manager()

    async def override_get_async_session():
        yield db_session

    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: user
    app.dependency_overrides[get_async_session] = override_get_async_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("path", "body"),
    [
        ("/api/v1/products/batch/submit", {"product_ids": [str(uuid4())]}),
        ("/api/v1/products/batch/reserve", {"product_ids": [str(uuid4())]}),
        ("/api/v1/products/batch/pause", {"product_ids": [str(uuid4())]}),
        ("/api/v1/products/batch/resume", {"product_ids": [str(uuid4())]}),
        ("/api/v1/products/batch/sold", {"product_ids": [str(uuid4())]}),
        ("/api/v1/products/batch/approve", {"product_ids": [str(uuid4())]}),
        (
            "/api/v1/products/batch/reject",
            {"product_ids": [str(uuid4())], "reason": "test"},
        ),
    ],
)
async def test_tenantless_non_admin_is_rejected_not_given_cross_tenant_access(
    async_client_as_tenantless_manager: AsyncClient,
    path: str,
    body: dict[str, object],
) -> None:
    response = await async_client_as_tenantless_manager.post(path, json=body)

    assert response.status_code == 403
