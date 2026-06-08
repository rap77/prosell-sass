"""Regression: a custom tenant-scoped role round-trips through the repo.

`Role.create_custom_role(...)` returns a `Role` with `role_type=RoleType.VIEWER`
by default — a real, fully-built domain entity. Persisting it must round-trip
the `role_type` enum back to `RoleType.VIEWER` (not a bare string), and
`tenant_id` must survive the trip so multi-tenant filtering keeps working.

The conftest's `system_roles` fixture proves system roles persist OK, but
it never tests the `tenant_id` field on a custom role, and `_to_entity`
uses `Role.model_validate(model, from_attributes=True)` which depends on
Pydantic coercing the str back into the `RoleType` StrEnum.
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.role import Role, RoleType
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.role_repository_impl import (
    SqlAlchemyRoleRepository,
)


@pytest.mark.asyncio
async def test_create_custom_role_with_tenant_roundtrips(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    role = Role.create_custom_role(
        name=f"Custom Role {uuid4().hex[:6]}",
        description="Tenant-scoped custom role",
        tenant_id=test_organization.tenant_id,
    )

    created = await repo.create(role)
    fetched = await repo.get_by_id(created.id)

    assert fetched is not None
    assert fetched.id == role.id
    # role_type must come back as the enum, not a bare string
    assert fetched.role_type == RoleType.VIEWER
    assert isinstance(fetched.role_type, RoleType)
    # tenant_id must round-trip for multi-tenant isolation
    assert fetched.tenant_id == test_organization.tenant_id
    assert fetched.name == role.name
    assert fetched.is_system_role is False
