"""Regression: a custom tenant-scoped role round-trips through the repo.

`Role.create_custom_role(...)` returns a `Role` with `role_type=None` —
migration `20261006_0001` relaxed `roles.role_type` to nullable so a
custom role never collides with a real `RoleType` (e.g. VIEWER)'s row
under the partial unique index. Persisting it must round-trip `None`
(not a stray string like `"None"`, and not silently defaulting back to
VIEWER — that was the actual bug, fixed alongside this test), and
`tenant_id` must survive the trip so multi-tenant filtering keeps working.

The conftest's `system_roles` fixture proves system roles persist OK, but
it never tests the `tenant_id` field on a custom role.
"""

from uuid import UUID, uuid4

import pytest

from prosell.domain.entities.role import Role
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.domain.value_objects.role_grant import RoleGrant
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.role_model import (
    RoleGrantModel,
    RoleOrganizationAccessModel,
    RoleScopeModel,
    UserRoleModel,
)
from prosell.infrastructure.models.user_model import UserModel
from prosell.infrastructure.repositories.role_repository_impl import (
    SqlAlchemyRoleRepository,
)


async def _create_and_assign_fresh_role(db_session, user: UserModel, tenant_id: UUID) -> UUID:
    """A brand-new custom role with zero grants/scope, assigned to `user`.

    Deliberately NOT the shared, session-scoped `test_role` fixture
    (SUPER_ADMIN): the seed migration `20261006_0002` now gives every
    system role real grants/scope, so a test that assumes a system role
    starts empty would be fragile against — and collide with — whatever
    that migration seeds. A fresh custom role has none of that baggage.
    """
    repo = SqlAlchemyRoleRepository(db_session)
    role = await repo.create(
        Role.create_custom_role(
            name=f"Fresh {uuid4().hex[:6]}", description="Test-only", tenant_id=tenant_id
        )
    )
    db_session.add(UserRoleModel(id=uuid4(), user_id=user.id, role_id=role.id))
    await db_session.flush()
    return role.id


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
    # role_type must round-trip as None — no hardcoded fallback to a
    # real RoleType (that was the bug: it would collide with that
    # system role's row under the partial unique index).
    assert fetched.role_type is None
    # tenant_id must round-trip for multi-tenant isolation
    assert fetched.tenant_id == test_organization.tenant_id
    assert fetched.name == role.name
    assert fetched.is_system_role is False


@pytest.mark.asyncio
async def test_role_get_by_id_does_not_filter_by_tenant(
    db_session,
) -> None:
    """GAP-5 documentation: RoleRepository.get_by_id() does NOT filter by tenant.

    The repo's contract is `caller filters` — system roles (tenant_id=NULL)
    and tenant-scoped roles share the same table, and the abstract method
    has no tenant_id parameter. Callers in the application layer must
    apply the tenant filter explicitly. This test pins the contract so
    a future refactor that silently adds a tenant_id parameter would
    show up as a behaviour change in the assertion below.
    """
    from prosell.infrastructure.models.organization_model import OrganizationModel

    repo = SqlAlchemyRoleRepository(db_session)
    other_org_id = uuid4()
    other_org = OrganizationModel(
        id=other_org_id,
        tenant_id=other_org_id,
        name="Other Org",
        status="active",
        description="Other",
        settings={},
    )
    db_session.add(other_org)
    await db_session.flush()

    other_role = Role.create_custom_role(
        name=f"Other {uuid4().hex[:6]}",
        description="Belongs to a different tenant",
        tenant_id=other_org.tenant_id,
    )
    created = await repo.create(other_role)

    # Repo returns it regardless of who calls — caller must filter
    fetched = await repo.get_by_id(created.id)
    assert fetched is not None
    assert fetched.tenant_id == other_org.tenant_id


@pytest.mark.asyncio
async def test_create_persists_initial_grants_and_scope(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    """create() must persist grants/scope atomically with the role row —
    creating a profile and its initial matrix is one logical operation
    for the admin UI (bloque 3, item 3.2's write slice), not two."""
    role = Role.create_custom_role(
        name=f"Custom With Grants {uuid4().hex[:6]}",
        description="Has grants from the start",
        tenant_id=test_organization.tenant_id,
    )
    role.grants = [RoleGrant(zone="catalog", action="read")]
    role.scope = OwnScope()

    repo = SqlAlchemyRoleRepository(db_session)
    created = await repo.create(role)
    fetched = await repo.get_by_id_with_grants(created.id)

    assert fetched is not None
    assert fetched.has_zone_action("catalog", "read") is True
    assert isinstance(fetched.scope, OwnScope)


@pytest.mark.asyncio
async def test_create_with_no_grants_or_scope_persists_cleanly(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    """The common case (no initial matrix yet) must not crash or write
    spurious rows."""
    repo = SqlAlchemyRoleRepository(db_session)
    role = Role.create_custom_role(
        name=f"Bare Custom {uuid4().hex[:6]}",
        description=None,
        tenant_id=test_organization.tenant_id,
    )

    created = await repo.create(role)
    fetched = await repo.get_by_id_with_grants(created.id)

    assert fetched is not None
    assert fetched.grants == []
    assert fetched.scope is None


@pytest.mark.asyncio
async def test_get_user_roles_with_grants_populates_grants_and_own_scope(
    db_session,
    test_user: UserModel,
    test_organization: OrganizationModel,
) -> None:
    """Real async session, real eager-loaded relationships — this is
    exactly the shape of bug (`MissingGreenlet`) that bit `_to_entity()`
    for a plain `get_user_roles()` call; `get_user_roles_with_grants()`
    must not repeat it despite reading the SAME relationship names."""
    role_id = await _create_and_assign_fresh_role(
        db_session, test_user, test_organization.tenant_id
    )
    db_session.add(RoleGrantModel(id=uuid4(), role_id=role_id, zone="catalog", action="read"))
    db_session.add(RoleGrantModel(id=uuid4(), role_id=role_id, zone="catalog", action="update"))
    db_session.add(RoleScopeModel(id=uuid4(), role_id=role_id, scope_type="own"))
    await db_session.flush()

    repo = SqlAlchemyRoleRepository(db_session)
    roles = await repo.get_user_roles_with_grants(test_user.id)

    role = next(r for r in roles if r.id == role_id)
    assert role.has_zone_action("catalog", "read") is True
    assert role.has_zone_action("catalog", "update") is True
    assert role.has_zone_action("catalog", "delete") is False
    assert isinstance(role.scope, OwnScope)


@pytest.mark.asyncio
async def test_get_user_roles_with_grants_populates_explicit_orgs_scope(
    db_session,
    test_user: UserModel,
    test_organization: OrganizationModel,
    second_organization: OrganizationModel,
) -> None:
    role_id = await _create_and_assign_fresh_role(
        db_session, test_user, test_organization.tenant_id
    )
    db_session.add(RoleScopeModel(id=uuid4(), role_id=role_id, scope_type="explicit"))
    db_session.add(
        RoleOrganizationAccessModel(
            id=uuid4(), role_id=role_id, organization_id=test_organization.id
        )
    )
    await db_session.flush()

    repo = SqlAlchemyRoleRepository(db_session)
    roles = await repo.get_user_roles_with_grants(test_user.id)

    scope = next(r for r in roles if r.id == role_id).scope
    assert isinstance(scope, ExplicitOrgsScope)
    assert (
        scope.permits(organization_id=test_organization.id, actor_organization_id=uuid4()) is True
    )
    assert (
        scope.permits(organization_id=second_organization.id, actor_organization_id=uuid4())
        is False
    )


@pytest.mark.asyncio
async def test_get_user_roles_with_grants_populates_all_scope(
    db_session,
    test_user: UserModel,
    test_organization: OrganizationModel,
) -> None:
    role_id = await _create_and_assign_fresh_role(
        db_session, test_user, test_organization.tenant_id
    )
    db_session.add(RoleScopeModel(id=uuid4(), role_id=role_id, scope_type="all"))
    await db_session.flush()

    repo = SqlAlchemyRoleRepository(db_session)
    roles = await repo.get_user_roles_with_grants(test_user.id)

    assert isinstance(next(r for r in roles if r.id == role_id).scope, AllScope)


@pytest.mark.asyncio
async def test_get_user_roles_with_grants_defaults_when_no_rows_exist(
    db_session,
    test_user: UserModel,
    test_organization: OrganizationModel,
) -> None:
    """A role with no `role_grants`/`role_scope` rows yet (the common
    case until an admin actually configures one) maps as empty/None,
    same as `_to_entity()`'s default — not a crash, not a stale value."""
    role_id = await _create_and_assign_fresh_role(
        db_session, test_user, test_organization.tenant_id
    )

    repo = SqlAlchemyRoleRepository(db_session)
    roles = await repo.get_user_roles_with_grants(test_user.id)

    role = next(r for r in roles if r.id == role_id)
    assert role.grants == []
    assert role.scope is None


@pytest.mark.asyncio
async def test_get_by_id_with_grants_populates_grants_and_scope(
    db_session,
    test_user: UserModel,
    test_organization: OrganizationModel,
) -> None:
    role_id = await _create_and_assign_fresh_role(
        db_session, test_user, test_organization.tenant_id
    )
    db_session.add(RoleGrantModel(id=uuid4(), role_id=role_id, zone="catalog", action="read"))
    db_session.add(RoleScopeModel(id=uuid4(), role_id=role_id, scope_type="own"))
    await db_session.flush()

    repo = SqlAlchemyRoleRepository(db_session)
    role = await repo.get_by_id_with_grants(role_id)

    assert role is not None
    assert role.id == role_id
    assert role.has_zone_action("catalog", "read") is True
    assert isinstance(role.scope, OwnScope)


@pytest.mark.asyncio
async def test_get_by_id_with_grants_returns_none_when_missing(db_session) -> None:
    repo = SqlAlchemyRoleRepository(db_session)
    assert await repo.get_by_id_with_grants(uuid4()) is None


@pytest.mark.asyncio
async def test_list_with_grants_scoped_to_tenant_includes_system_roles(
    db_session,
    test_user: UserModel,
    test_organization: OrganizationModel,
    second_organization: OrganizationModel,
) -> None:
    """Scoped to one tenant_id: that tenant's custom roles + every
    system role (tenant_id IS NULL) — never another tenant's custom role."""
    own_role_id = await _create_and_assign_fresh_role(
        db_session, test_user, test_organization.tenant_id
    )
    other_role_id = await _create_and_assign_fresh_role(
        db_session, test_user, second_organization.tenant_id
    )

    repo = SqlAlchemyRoleRepository(db_session)
    roles = await repo.list_with_grants(tenant_id=test_organization.tenant_id)
    role_ids = {r.id for r in roles}

    assert own_role_id in role_ids
    assert other_role_id not in role_ids
    # System roles (tenant_id=None) are always visible regardless of filter.
    assert any(r.is_system_role for r in roles)


@pytest.mark.asyncio
async def test_list_with_grants_with_none_tenant_returns_every_role(
    db_session,
    test_user: UserModel,
    test_organization: OrganizationModel,
    second_organization: OrganizationModel,
) -> None:
    """tenant_id=None means no filter at all — the AllScope case."""
    own_role_id = await _create_and_assign_fresh_role(
        db_session, test_user, test_organization.tenant_id
    )
    other_role_id = await _create_and_assign_fresh_role(
        db_session, test_user, second_organization.tenant_id
    )

    repo = SqlAlchemyRoleRepository(db_session)
    roles = await repo.list_with_grants(tenant_id=None)
    role_ids = {r.id for r in roles}

    assert own_role_id in role_ids
    assert other_role_id in role_ids
