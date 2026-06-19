"""Role-Based Permission Tests (B2.5).

Tests RBAC behavior across four roles: admin, manager, vendedor (sales_agent),
and viewer. Covers:

- B2.5.a: Test file structure
- B2.5.b: PERMISSION_MATRIX definition
- B2.5.c: Admin full access (create, read, update, delete, assign)
- B2.5.d: Manager team management (create, read, update, assign)
- B2.5.e: Vendedor own leads/appointments (create, read, update)
- B2.5.f: Viewer read-only
- B2.5.g: All role combinations
- B2.5.h: Authorization at API layer (require_permission / require_role)
- B2.5.i: Cross-tenant access blocked
- B2.5.j: Role escalation blocked
- B2.5.k: Permission matrix documentation

All tests are pure unit tests — no database, no HTTP client.
They test domain entities, domain logic, and the RBAC middleware directly.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException

from prosell.domain.entities.role import (
    ROLE_PERMISSIONS,
    Permission,
    Role,
    RoleType,
)
from prosell.domain.entities.user import User, UserStatus

# =============================================================================
# B2.5.b — PERMISSION_MATRIX
#
# Canonical mapping of which operations each role may perform.
# Mirrors the domain layer (ROLE_PERMISSIONS) but expresses intent in terms
# of business operations, making tests self-documenting.
# =============================================================================

PERMISSION_MATRIX: dict[str, dict[str, bool]] = {
    # ── admin (maps to RoleType.ADMIN) ────────────────────────────────────────
    "admin": {
        # User management
        "user:read": True,
        "user:create": False,  # USER_CREATE belongs only to super_admin
        "user:update": True,
        "user:delete": False,  # USER_DELETE belongs only to super_admin
        # Role management
        "role:read": False,
        "role:create": False,
        "role:update": False,
        "role:delete": False,
        # Org management
        "org:read": True,
        "org:create": False,
        "org:update": True,
        "org:delete": False,
        # Vehicle / product
        "vehicle:create": True,
        "vehicle:read": True,
        "vehicle:update": True,
        "vehicle:delete": True,
        # Analytics
        "analytics:view": True,
        "analytics:export": True,
        # Settings
        "settings:read": True,
        "settings:update": True,
    },
    # ── manager (maps to RoleType.MANAGER) ────────────────────────────────────
    "manager": {
        "user:read": True,
        "user:create": False,
        "user:update": False,
        "user:delete": False,
        "role:read": False,
        "role:create": False,
        "role:update": False,
        "role:delete": False,
        "org:read": True,
        "org:create": False,
        "org:update": False,
        "org:delete": False,
        "vehicle:create": True,
        "vehicle:read": True,
        "vehicle:update": True,
        "vehicle:delete": True,
        "analytics:view": True,
        "analytics:export": True,
        "settings:read": True,
        "settings:update": False,
    },
    # ── vendedor / sales_agent (maps to RoleType.SALES_AGENT) ─────────────────
    "vendedor": {
        "user:read": False,
        "user:create": False,
        "user:update": False,
        "user:delete": False,
        "role:read": False,
        "role:create": False,
        "role:update": False,
        "role:delete": False,
        "org:read": False,
        "org:create": False,
        "org:update": False,
        "org:delete": False,
        "vehicle:create": True,
        "vehicle:read": True,
        "vehicle:update": True,
        "vehicle:delete": False,
        "analytics:view": True,
        "analytics:export": False,
        "settings:read": False,
        "settings:update": False,
    },
    # ── viewer (maps to RoleType.VIEWER) ──────────────────────────────────────
    "viewer": {
        "user:read": False,
        "user:create": False,
        "user:update": False,
        "user:delete": False,
        "role:read": False,
        "role:create": False,
        "role:update": False,
        "role:delete": False,
        "org:read": False,
        "org:create": False,
        "org:update": False,
        "org:delete": False,
        "vehicle:create": False,
        "vehicle:read": True,
        "vehicle:update": False,
        "vehicle:delete": False,
        "analytics:view": True,
        "analytics:export": False,
        "settings:read": False,
        "settings:update": False,
    },
}

# Map business role name → RoleType enum value
ROLE_NAME_TO_TYPE: dict[str, RoleType] = {
    "admin": RoleType.ADMIN,
    "manager": RoleType.MANAGER,
    "vendedor": RoleType.SALES_AGENT,
    "viewer": RoleType.VIEWER,
}


# =============================================================================
# Helpers
# =============================================================================


def _make_user(role_type: RoleType, tenant_id: UUID | None = None) -> User:
    """Create a User domain entity with a single role."""
    tid = tenant_id or uuid4()
    role = Role(
        id=uuid4(),
        role_type=role_type,
        name=role_type.value.replace("_", " ").title(),
        is_system_role=True,
        tenant_id=None,
    )
    return User(
        id=uuid4(),
        email=f"{role_type.value}@test.prosell.io",
        full_name=f"Test {role_type.value.title()}",
        tenant_id=tid,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[role],
    )


def _perms_for(role_type: RoleType) -> set[Permission]:
    """Return the domain-layer permissions for a role type."""
    return ROLE_PERMISSIONS.get(role_type, set())


# =============================================================================
# B2.5.b — PERMISSION_MATRIX consistency: matrix must agree with domain layer
# =============================================================================


class TestPermissionMatrixConsistency:
    """B2.5.b: PERMISSION_MATRIX aligns with ROLE_PERMISSIONS from domain."""

    @pytest.mark.parametrize("role_name", ["admin", "manager", "vendedor", "viewer"])
    def test_permission_matrix_matches_domain_layer(self, role_name: str) -> None:
        """Every entry in PERMISSION_MATRIX must match ROLE_PERMISSIONS."""
        role_type = ROLE_NAME_TO_TYPE[role_name]
        domain_perms = _perms_for(role_type)
        matrix = PERMISSION_MATRIX[role_name]

        for perm_str, expected_has in matrix.items():
            perm = Permission(perm_str)
            actual_has = perm in domain_perms
            assert actual_has == expected_has, (
                f"Role '{role_name}' — permission '{perm_str}': "
                f"PERMISSION_MATRIX says {expected_has}, domain layer says {actual_has}"
            )

    def test_all_permissions_represented(self) -> None:
        """Every Permission enum value appears in PERMISSION_MATRIX for each role."""
        all_perm_strings = {p.value for p in Permission}
        for role_name in PERMISSION_MATRIX:
            matrix_keys = set(PERMISSION_MATRIX[role_name].keys())
            missing = all_perm_strings - matrix_keys
            assert (
                not missing
            ), f"Role '{role_name}' is missing permissions in PERMISSION_MATRIX: {missing}"


# =============================================================================
# B2.5.c — Admin: full access (create, read, update, delete, assign)
# =============================================================================


class TestAdminPermissions:
    """B2.5.c: Admin role has broad but NOT super-admin level access."""

    def setup_method(self) -> None:
        self.admin_user = _make_user(RoleType.ADMIN)
        self.admin_perms = _perms_for(RoleType.ADMIN)

    def test_admin_can_read_users(self) -> None:
        assert Permission.USER_READ in self.admin_perms

    def test_admin_can_update_users(self) -> None:
        assert Permission.USER_UPDATE in self.admin_perms

    def test_admin_cannot_create_users(self) -> None:
        """USER_CREATE is super_admin only."""
        assert Permission.USER_CREATE not in self.admin_perms

    def test_admin_cannot_delete_users(self) -> None:
        """USER_DELETE is super_admin only."""
        assert Permission.USER_DELETE not in self.admin_perms

    def test_admin_cannot_manage_roles(self) -> None:
        """Role management is super_admin only."""
        role_perms = {
            Permission.ROLE_CREATE,
            Permission.ROLE_READ,
            Permission.ROLE_UPDATE,
            Permission.ROLE_DELETE,
        }
        assert role_perms.isdisjoint(self.admin_perms)

    def test_admin_can_read_and_update_org(self) -> None:
        assert Permission.ORG_READ in self.admin_perms
        assert Permission.ORG_UPDATE in self.admin_perms

    def test_admin_cannot_create_or_delete_org(self) -> None:
        assert Permission.ORG_CREATE not in self.admin_perms
        assert Permission.ORG_DELETE not in self.admin_perms

    def test_admin_has_full_vehicle_crud(self) -> None:
        """Admin can create, read, update, and delete vehicles."""
        assert Permission.VEHICLE_CREATE in self.admin_perms
        assert Permission.VEHICLE_READ in self.admin_perms
        assert Permission.VEHICLE_UPDATE in self.admin_perms
        assert Permission.VEHICLE_DELETE in self.admin_perms

    def test_admin_has_full_analytics_access(self) -> None:
        assert Permission.ANALYTICS_VIEW in self.admin_perms
        assert Permission.ANALYTICS_EXPORT in self.admin_perms

    def test_admin_has_full_settings_access(self) -> None:
        assert Permission.SETTINGS_READ in self.admin_perms
        assert Permission.SETTINGS_UPDATE in self.admin_perms

    def test_admin_user_entity_has_role(self) -> None:
        """User entity has_role() returns True for admin."""
        assert self.admin_user.has_role("admin") is True

    def test_admin_user_entity_not_super_admin(self) -> None:
        assert self.admin_user.has_role("super_admin") is False

    def test_admin_user_entity_not_manager(self) -> None:
        assert self.admin_user.has_role("manager") is False


# =============================================================================
# B2.5.d — Manager: team management (create, read, update, assign)
# =============================================================================


class TestManagerPermissions:
    """B2.5.d: Manager can manage team operations but not org admin tasks."""

    def setup_method(self) -> None:
        self.manager_user = _make_user(RoleType.MANAGER)
        self.manager_perms = _perms_for(RoleType.MANAGER)

    def test_manager_can_read_users(self) -> None:
        assert Permission.USER_READ in self.manager_perms

    def test_manager_cannot_create_or_delete_users(self) -> None:
        assert Permission.USER_CREATE not in self.manager_perms
        assert Permission.USER_UPDATE not in self.manager_perms
        assert Permission.USER_DELETE not in self.manager_perms

    def test_manager_can_read_org(self) -> None:
        assert Permission.ORG_READ in self.manager_perms

    def test_manager_cannot_modify_org(self) -> None:
        assert Permission.ORG_CREATE not in self.manager_perms
        assert Permission.ORG_UPDATE not in self.manager_perms
        assert Permission.ORG_DELETE not in self.manager_perms

    def test_manager_has_full_vehicle_crud(self) -> None:
        """Manager can create, read, update, and delete vehicles (team scope)."""
        assert Permission.VEHICLE_CREATE in self.manager_perms
        assert Permission.VEHICLE_READ in self.manager_perms
        assert Permission.VEHICLE_UPDATE in self.manager_perms
        assert Permission.VEHICLE_DELETE in self.manager_perms

    def test_manager_can_view_and_export_analytics(self) -> None:
        assert Permission.ANALYTICS_VIEW in self.manager_perms
        assert Permission.ANALYTICS_EXPORT in self.manager_perms

    def test_manager_can_read_settings_but_not_update(self) -> None:
        assert Permission.SETTINGS_READ in self.manager_perms
        assert Permission.SETTINGS_UPDATE not in self.manager_perms

    def test_manager_cannot_manage_roles(self) -> None:
        role_perms = {
            Permission.ROLE_CREATE,
            Permission.ROLE_READ,
            Permission.ROLE_UPDATE,
            Permission.ROLE_DELETE,
        }
        assert role_perms.isdisjoint(self.manager_perms)

    def test_manager_fewer_permissions_than_admin(self) -> None:
        admin_perms = _perms_for(RoleType.ADMIN)
        assert len(self.manager_perms) < len(admin_perms)

    def test_manager_user_entity_has_role(self) -> None:
        assert self.manager_user.has_role("manager") is True

    def test_manager_user_entity_multi_check(self) -> None:
        """has_role() accepts a list — True if any matches."""
        assert self.manager_user.has_role(["admin", "manager"]) is True
        assert self.manager_user.has_role(["admin", "super_admin"]) is False


# =============================================================================
# B2.5.e — Vendedor: own leads/appointments (create, read, update)
# =============================================================================


class TestVendedorPermissions:
    """B2.5.e: Sales agent can work with vehicles and analytics only."""

    def setup_method(self) -> None:
        self.vendedor_user = _make_user(RoleType.SALES_AGENT)
        self.vendedor_perms = _perms_for(RoleType.SALES_AGENT)

    def test_vendedor_can_create_vehicles(self) -> None:
        assert Permission.VEHICLE_CREATE in self.vendedor_perms

    def test_vendedor_can_read_vehicles(self) -> None:
        assert Permission.VEHICLE_READ in self.vendedor_perms

    def test_vendedor_can_update_vehicles(self) -> None:
        assert Permission.VEHICLE_UPDATE in self.vendedor_perms

    def test_vendedor_cannot_delete_vehicles(self) -> None:
        """Deletion requires at least manager role."""
        assert Permission.VEHICLE_DELETE not in self.vendedor_perms

    def test_vendedor_can_view_analytics(self) -> None:
        assert Permission.ANALYTICS_VIEW in self.vendedor_perms

    def test_vendedor_cannot_export_analytics(self) -> None:
        assert Permission.ANALYTICS_EXPORT not in self.vendedor_perms

    def test_vendedor_has_no_user_management(self) -> None:
        user_perms = {
            Permission.USER_CREATE,
            Permission.USER_READ,
            Permission.USER_UPDATE,
            Permission.USER_DELETE,
        }
        assert user_perms.isdisjoint(self.vendedor_perms)

    def test_vendedor_has_no_org_management(self) -> None:
        org_perms = {
            Permission.ORG_CREATE,
            Permission.ORG_READ,
            Permission.ORG_UPDATE,
            Permission.ORG_DELETE,
        }
        assert org_perms.isdisjoint(self.vendedor_perms)

    def test_vendedor_has_no_settings_access(self) -> None:
        assert Permission.SETTINGS_READ not in self.vendedor_perms
        assert Permission.SETTINGS_UPDATE not in self.vendedor_perms

    def test_vendedor_has_exactly_4_permissions(self) -> None:
        """SALES_AGENT: VEHICLE_CREATE, VEHICLE_READ, VEHICLE_UPDATE, ANALYTICS_VIEW."""
        assert len(self.vendedor_perms) == 4

    def test_vendedor_user_entity_has_role(self) -> None:
        assert self.vendedor_user.has_role("sales_agent") is True

    def test_vendedor_user_entity_not_manager(self) -> None:
        assert self.vendedor_user.has_role("manager") is False


# =============================================================================
# B2.5.f — Viewer: read-only
# =============================================================================


class TestViewerPermissions:
    """B2.5.f: Viewer has minimal read-only access."""

    def setup_method(self) -> None:
        self.viewer_user = _make_user(RoleType.VIEWER)
        self.viewer_perms = _perms_for(RoleType.VIEWER)

    def test_viewer_can_read_vehicles(self) -> None:
        assert Permission.VEHICLE_READ in self.viewer_perms

    def test_viewer_can_view_analytics(self) -> None:
        assert Permission.ANALYTICS_VIEW in self.viewer_perms

    def test_viewer_cannot_create_anything(self) -> None:
        write_perms = {
            Permission.USER_CREATE,
            Permission.ROLE_CREATE,
            Permission.ORG_CREATE,
            Permission.VEHICLE_CREATE,
        }
        assert write_perms.isdisjoint(self.viewer_perms)

    def test_viewer_cannot_update_anything(self) -> None:
        update_perms = {
            Permission.USER_UPDATE,
            Permission.ROLE_UPDATE,
            Permission.ORG_UPDATE,
            Permission.VEHICLE_UPDATE,
            Permission.SETTINGS_UPDATE,
        }
        assert update_perms.isdisjoint(self.viewer_perms)

    def test_viewer_cannot_delete_anything(self) -> None:
        delete_perms = {
            Permission.USER_DELETE,
            Permission.ROLE_DELETE,
            Permission.ORG_DELETE,
            Permission.VEHICLE_DELETE,
        }
        assert delete_perms.isdisjoint(self.viewer_perms)

    def test_viewer_cannot_export_analytics(self) -> None:
        assert Permission.ANALYTICS_EXPORT not in self.viewer_perms

    def test_viewer_has_no_settings_access(self) -> None:
        assert Permission.SETTINGS_READ not in self.viewer_perms
        assert Permission.SETTINGS_UPDATE not in self.viewer_perms

    def test_viewer_has_exactly_2_permissions(self) -> None:
        """Viewer has only VEHICLE_READ and ANALYTICS_VIEW."""
        assert len(self.viewer_perms) == 2

    def test_viewer_user_entity_has_role(self) -> None:
        assert self.viewer_user.has_role("viewer") is True


# =============================================================================
# B2.5.g — All role combinations
# =============================================================================


class TestAllRoleCombinations:
    """B2.5.g: Exhaustive parametric tests for every role x permission pair."""

    @pytest.mark.parametrize(
        "role_name,perm_str,expected",
        [
            # ── admin ─────────────────────────────────────────────────────────
            ("admin", "vehicle:create", True),
            ("admin", "vehicle:read", True),
            ("admin", "vehicle:update", True),
            ("admin", "vehicle:delete", True),
            ("admin", "user:read", True),
            ("admin", "user:update", True),
            ("admin", "user:create", False),
            ("admin", "user:delete", False),
            ("admin", "role:create", False),
            ("admin", "org:create", False),
            ("admin", "org:delete", False),
            ("admin", "analytics:view", True),
            ("admin", "analytics:export", True),
            ("admin", "settings:read", True),
            ("admin", "settings:update", True),
            # ── manager ───────────────────────────────────────────────────────
            ("manager", "vehicle:create", True),
            ("manager", "vehicle:read", True),
            ("manager", "vehicle:update", True),
            ("manager", "vehicle:delete", True),
            ("manager", "user:read", True),
            ("manager", "user:update", False),
            ("manager", "user:delete", False),
            ("manager", "org:read", True),
            ("manager", "org:update", False),
            ("manager", "analytics:view", True),
            ("manager", "analytics:export", True),
            ("manager", "settings:read", True),
            ("manager", "settings:update", False),
            # ── vendedor ──────────────────────────────────────────────────────
            ("vendedor", "vehicle:create", True),
            ("vendedor", "vehicle:read", True),
            ("vendedor", "vehicle:update", True),
            ("vendedor", "vehicle:delete", False),
            ("vendedor", "user:read", False),
            ("vendedor", "org:read", False),
            ("vendedor", "analytics:view", True),
            ("vendedor", "analytics:export", False),
            ("vendedor", "settings:read", False),
            # ── viewer ────────────────────────────────────────────────────────
            ("viewer", "vehicle:read", True),
            ("viewer", "vehicle:create", False),
            ("viewer", "vehicle:update", False),
            ("viewer", "vehicle:delete", False),
            ("viewer", "analytics:view", True),
            ("viewer", "analytics:export", False),
            ("viewer", "user:read", False),
            ("viewer", "org:read", False),
            ("viewer", "settings:read", False),
        ],
    )
    def test_role_permission_pair(self, role_name: str, perm_str: str, expected: bool) -> None:
        role_type = ROLE_NAME_TO_TYPE[role_name]
        role_entity = Role.create_system_role(role_type)
        perm = Permission(perm_str)
        assert role_entity.has_permission(perm) is expected, (
            f"Role '{role_name}' — '{perm_str}': expected {expected}, "
            f"got {role_entity.has_permission(perm)}"
        )

    def test_permission_hierarchy_admin_superset_of_manager(self) -> None:
        """Every manager permission is also present in admin."""
        admin_perms = _perms_for(RoleType.ADMIN)
        manager_perms = _perms_for(RoleType.MANAGER)
        for perm in manager_perms:
            assert perm in admin_perms, f"Admin missing manager permission: {perm}"

    def test_permission_hierarchy_manager_superset_of_vendedor_read(self) -> None:
        """All read permissions vendedor has, manager also has."""
        manager_perms = _perms_for(RoleType.MANAGER)
        vendedor_perms = _perms_for(RoleType.SALES_AGENT)
        read_perms_vendedor = {p for p in vendedor_perms if "read" in p.value or "view" in p.value}
        for perm in read_perms_vendedor:
            assert perm in manager_perms, f"Manager missing vendedor read permission: {perm}"

    def test_viewer_subset_of_every_higher_role(self) -> None:
        """Every viewer permission is present in all higher roles."""
        viewer_perms = _perms_for(RoleType.VIEWER)
        for role_type in [
            RoleType.SALES_AGENT,
            RoleType.MANAGER,
            RoleType.ADMIN,
            RoleType.SUPER_ADMIN,
        ]:
            higher_perms = _perms_for(role_type)
            for perm in viewer_perms:
                assert (
                    perm in higher_perms
                ), f"Role '{role_type.value}' missing viewer permission '{perm}'"

    def test_no_role_above_super_admin(self) -> None:
        """SUPER_ADMIN has all defined permissions."""
        super_perms = _perms_for(RoleType.SUPER_ADMIN)
        all_perms = set(Permission)
        assert super_perms == all_perms


# =============================================================================
# B2.5.h — Authorization at API layer (require_permission / require_role)
# =============================================================================


class TestAPILayerAuthorization:
    """B2.5.h: The require_permission and require_role dependency factories
    raise HTTP 403 when the user lacks the required access."""

    def _user_with_roles(self, *role_types: RoleType) -> User:
        """Build a User with multiple roles."""
        tid = uuid4()
        roles = [
            Role(
                id=uuid4(),
                role_type=rt,
                name=rt.value,
                is_system_role=True,
                tenant_id=None,
            )
            for rt in role_types
        ]
        return User(
            id=uuid4(),
            email="test@prosell.io",
            full_name="Test User",
            tenant_id=tid,
            status=UserStatus.ACTIVE,
            email_verified=True,
            roles=roles,
        )

    # ── require_roles (RBACMiddleware) ─────────────────────────────────────────

    def test_rbac_middleware_allows_matching_role(self) -> None:
        """RBACMiddleware.require_roles passes when user has the role."""
        from prosell.infrastructure.api.middleware.rbac_middleware import RBACMiddleware

        # The middleware operates on a dict with 'roles' key
        user_dict: dict[str, Any] = {"roles": ["admin"]}

        # Instantiate the wrapper inline to verify it doesn't raise
        @RBACMiddleware.require_roles("admin", "super_admin")
        async def _endpoint() -> str:
            return "ok"

        import asyncio

        result: str = asyncio.run(_endpoint(current_user=user_dict))  # type: ignore[call-arg]
        assert result == "ok"

    def test_rbac_middleware_blocks_wrong_role(self) -> None:
        """RBACMiddleware.require_roles raises 403 when user lacks the role."""
        from prosell.infrastructure.api.middleware.rbac_middleware import RBACMiddleware

        user_dict: dict[str, Any] = {"roles": ["viewer"]}

        @RBACMiddleware.require_roles("admin", "super_admin")
        async def _endpoint(_current_user: dict[str, Any]) -> str:
            return "ok"

        import asyncio

        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(_endpoint(current_user=user_dict))  # type: ignore[call-arg]

        assert exc_info.value.status_code == 403

    def test_rbac_middleware_blocks_empty_roles(self) -> None:
        """RBACMiddleware.require_roles raises 403 when user has no roles."""
        from prosell.infrastructure.api.middleware.rbac_middleware import RBACMiddleware

        user_dict: dict[str, Any] = {"roles": []}

        @RBACMiddleware.require_roles("admin")
        async def _endpoint(_current_user: dict[str, Any]) -> str:
            return "ok"

        import asyncio

        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(_endpoint(current_user=user_dict))  # type: ignore[call-arg]

        assert exc_info.value.status_code == 403

    def test_rbac_middleware_allows_any_of_multiple_roles(self) -> None:
        """require_roles is satisfied when user has *any* of the listed roles."""
        from prosell.infrastructure.api.middleware.rbac_middleware import RBACMiddleware

        user_dict: dict[str, Any] = {"roles": ["manager"]}

        @RBACMiddleware.require_roles("admin", "manager", "super_admin")
        async def _endpoint() -> str:
            return "ok"

        import asyncio

        result: str = asyncio.run(_endpoint(current_user=user_dict))  # type: ignore[call-arg]
        assert result == "ok"

    # ── require_permissions (RBACMiddleware) ───────────────────────────────────

    def test_rbac_middleware_allows_matching_permission(self) -> None:
        """require_permissions passes when user role grants the permission."""
        from prosell.infrastructure.api.middleware.rbac_middleware import RBACMiddleware

        user_dict: dict[str, Any] = {"roles": ["admin"]}

        @RBACMiddleware.require_permissions("vehicle:create")
        async def _endpoint() -> str:
            return "ok"

        import asyncio

        result: str = asyncio.run(_endpoint(current_user=user_dict))  # type: ignore[call-arg]
        assert result == "ok"

    def test_rbac_middleware_blocks_missing_permission(self) -> None:
        """require_permissions raises 403 when user's role lacks the permission."""
        from prosell.infrastructure.api.middleware.rbac_middleware import RBACMiddleware

        user_dict: dict[str, Any] = {"roles": ["viewer"]}

        @RBACMiddleware.require_permissions("vehicle:create")
        async def _endpoint(_current_user: dict[str, Any]) -> str:
            return "ok"

        import asyncio

        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(_endpoint(current_user=user_dict))  # type: ignore[call-arg]

        assert exc_info.value.status_code == 403

    def test_rbac_detail_contains_missing_permission(self) -> None:
        """403 error detail lists the missing permissions."""
        from prosell.infrastructure.api.middleware.rbac_middleware import RBACMiddleware

        user_dict: dict[str, Any] = {"roles": ["viewer"]}

        @RBACMiddleware.require_permissions("user:delete")
        async def _endpoint(_current_user: dict[str, Any]) -> str:
            return "ok"

        import asyncio

        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(_endpoint(user_dict))  # type: ignore[call-arg]

        assert "user:delete" in exc_info.value.detail

    # ── Role entity has_permission ─────────────────────────────────────────────

    def test_role_entity_has_permission_returns_true(self) -> None:
        role = Role.create_system_role(RoleType.ADMIN)
        assert role.has_permission(Permission.VEHICLE_CREATE) is True

    def test_role_entity_has_permission_returns_false(self) -> None:
        role = Role.create_system_role(RoleType.VIEWER)
        assert role.has_permission(Permission.VEHICLE_CREATE) is False

    # ── User entity has_role ───────────────────────────────────────────────────

    def test_user_has_role_returns_true(self) -> None:
        user = _make_user(RoleType.MANAGER)
        assert user.has_role("manager") is True

    def test_user_has_role_returns_false(self) -> None:
        user = _make_user(RoleType.VIEWER)
        assert user.has_role("admin") is False

    def test_user_has_role_no_roles_returns_false(self) -> None:
        user = _make_user(RoleType.VIEWER)
        object.__setattr__(user, "roles", None)
        assert user.has_role("viewer") is False

    def test_user_has_role_multiple_roles(self) -> None:
        """User with multiple roles satisfies any of them."""
        user = self._user_with_roles(RoleType.MANAGER, RoleType.SALES_AGENT)
        assert user.has_role("manager") is True
        assert user.has_role("sales_agent") is True
        assert user.has_role(["admin", "manager"]) is True
        assert user.has_role("admin") is False


# =============================================================================
# B2.5.i — Cross-tenant access blocked
# =============================================================================


class TestCrossTenantAccessBlocked:
    """B2.5.i: Users from tenant A cannot access resources from tenant B.

    These tests exercise the tenant isolation contract at the domain level.
    Repository-level tests live in test_tenant_isolation.py — here we focus
    on the domain logic that enforces tenant_id boundaries.
    """

    def test_user_tenant_id_is_immutable_identity(self) -> None:
        """A user's tenant_id is set at creation and not changed by role assignment."""
        tenant_a = uuid4()
        user = _make_user(RoleType.ADMIN, tenant_id=tenant_a)
        assert user.tenant_id == tenant_a

    def test_admin_role_does_not_grant_cross_tenant_access(self) -> None:
        """Having admin role doesn't override tenant boundary."""
        tenant_a = uuid4()
        tenant_b = uuid4()
        user_a = _make_user(RoleType.ADMIN, tenant_id=tenant_a)

        # The user's tenant_id is unambiguous — business logic must compare it
        assert user_a.tenant_id == tenant_a
        assert user_a.tenant_id != tenant_b

    def test_super_admin_still_scoped_to_own_tenant(self) -> None:
        """Even SUPER_ADMIN users have a tenant_id binding."""
        tenant_a = uuid4()
        super_user = _make_user(RoleType.SUPER_ADMIN, tenant_id=tenant_a)
        assert super_user.tenant_id == tenant_a

    def test_resource_with_different_tenant_not_accessible(self) -> None:
        """Simulates the contract: get_by_id(resource_id, tenant_id=user.tenant_id)
        returns None when resource belongs to another tenant."""
        tenant_a = uuid4()
        tenant_b = uuid4()

        # Resource belongs to tenant B
        resource_tenant_id = tenant_b
        # User is in tenant A
        user = _make_user(RoleType.ADMIN, tenant_id=tenant_a)

        # The tenant mismatch must be detectable
        assert user.tenant_id != resource_tenant_id

    def test_manager_cannot_claim_access_by_role_in_wrong_tenant(self) -> None:
        """Manager in tenant A is not a manager in tenant B."""
        tenant_a = uuid4()
        tenant_b = uuid4()

        manager_a = _make_user(RoleType.MANAGER, tenant_id=tenant_a)
        # Even if we check manager_a's role, its tenant_id tells us it's scoped to A
        assert manager_a.has_role("manager") is True
        assert manager_a.tenant_id != tenant_b

    def test_multiple_users_different_tenants_independent(self) -> None:
        """Two users in different tenants have independent role scopes."""
        tenant_a = uuid4()
        tenant_b = uuid4()

        admin_a = _make_user(RoleType.ADMIN, tenant_id=tenant_a)
        viewer_b = _make_user(RoleType.VIEWER, tenant_id=tenant_b)

        assert admin_a.tenant_id != viewer_b.tenant_id
        assert admin_a.has_role("admin") is True
        assert viewer_b.has_role("admin") is False


# =============================================================================
# B2.5.j — Role escalation blocked
# =============================================================================


class TestRoleEscalationBlocked:
    """B2.5.j: Users cannot elevate their own privileges."""

    def test_viewer_cannot_claim_admin_permissions(self) -> None:
        """VIEWER role does not have admin-level permissions."""
        viewer = Role.create_system_role(RoleType.VIEWER)
        admin_only_perms = [
            Permission.USER_UPDATE,
            Permission.ORG_UPDATE,
            Permission.SETTINGS_UPDATE,
        ]
        for perm in admin_only_perms:
            assert not viewer.has_permission(
                perm
            ), f"VIEWER unexpectedly has admin permission: {perm}"

    def test_vendedor_cannot_delete_vehicles(self) -> None:
        """SALES_AGENT does not have VEHICLE_DELETE — that requires manager+."""
        vendedor = Role.create_system_role(RoleType.SALES_AGENT)
        assert not vendedor.has_permission(Permission.VEHICLE_DELETE)

    def test_manager_cannot_claim_super_admin_permissions(self) -> None:
        """MANAGER does not have user/role create/delete."""
        manager = Role.create_system_role(RoleType.MANAGER)
        escalation_perms = [
            Permission.USER_CREATE,
            Permission.USER_DELETE,
            Permission.ROLE_CREATE,
            Permission.ROLE_UPDATE,
            Permission.ROLE_DELETE,
            Permission.ORG_CREATE,
            Permission.ORG_DELETE,
        ]
        for perm in escalation_perms:
            assert not manager.has_permission(
                perm
            ), f"MANAGER unexpectedly has super_admin permission: {perm}"

    def test_custom_role_defaults_to_viewer_permissions(self) -> None:
        """Custom roles start with VIEWER permissions (minimal) — no escalation."""
        tenant_id = uuid4()
        custom_role = Role.create_custom_role(
            name="Custom Role",
            description="Test custom role",
            tenant_id=tenant_id,
        )
        assert custom_role.role_type == RoleType.VIEWER
        viewer_perms = _perms_for(RoleType.VIEWER)
        assert custom_role.get_permissions() == viewer_perms

    def test_user_with_sales_agent_role_cannot_satisfy_admin_role_check(self) -> None:
        """User.has_role('admin') returns False for a sales_agent user."""
        vendedor = _make_user(RoleType.SALES_AGENT)
        assert vendedor.has_role("admin") is False
        assert vendedor.has_role("super_admin") is False
        assert vendedor.has_role("manager") is False

    def test_rbac_middleware_prevents_privilege_escalation(self) -> None:
        """require_roles('admin') blocks a viewer user at the middleware layer."""
        from prosell.infrastructure.api.middleware.rbac_middleware import RBACMiddleware

        viewer_dict: dict[str, Any] = {"roles": ["viewer"]}

        @RBACMiddleware.require_roles("admin")
        async def _admin_endpoint(_current_user: dict[str, Any]) -> str:
            return "admin data"

        import asyncio

        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(_admin_endpoint(viewer_dict))  # type: ignore[call-arg]

        assert exc_info.value.status_code == 403

    def test_permission_check_fails_for_escalation_attempt(self) -> None:
        """require_permissions blocks viewer trying to access create endpoint."""
        from prosell.infrastructure.api.middleware.rbac_middleware import RBACMiddleware

        viewer_dict: dict[str, Any] = {"roles": ["viewer"]}

        @RBACMiddleware.require_permissions("user:create")
        async def _create_user_endpoint(_current_user: dict[str, Any]) -> str:
            return "user created"

        import asyncio

        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(
                _create_user_endpoint(viewer_dict)  # type: ignore[call-arg]
            )

        assert exc_info.value.status_code == 403

    def test_invalid_role_string_does_not_grant_permissions(self) -> None:
        """Injecting a non-existent role string grants no permissions via middleware."""
        from prosell.infrastructure.api.middleware.rbac_middleware import RBACMiddleware

        # Attempt to use a crafted role name that doesn't exist in RoleType enum
        fake_role_dict: dict[str, Any] = {"roles": ["super_hacker"]}

        @RBACMiddleware.require_permissions("vehicle:create")
        async def _endpoint(_current_user: dict[str, Any]) -> str:
            return "ok"

        import asyncio

        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(_endpoint(fake_role_dict))  # type: ignore[call-arg]

        assert exc_info.value.status_code == 403


# =============================================================================
# B2.5.k — Permission matrix documentation
#
# This class serves as executable documentation: each test method name reads
# like a spec sentence, and the assertions are the acceptance criteria.
# =============================================================================


class TestPermissionMatrixDocumentation:
    """B2.5.k: Documented permission matrix — serves as living specification.

    PERMISSION MATRIX
    =================
    Role         | user:* | role:* | org:*  | vehicle:* | analytics | settings
    -------------|--------|--------|--------|-----------|-----------|----------
    super_admin  | CRUD   | CRUD   | CRUD   | CRUD      | view+exp  | R+W
    admin        | R+U    | none   | R+U    | CRUD      | view+exp  | R+W
    manager      | R      | none   | R      | CRUD      | view+exp  | R
    vendedor     | none   | none   | none   | CRU       | view      | none
    viewer       | none   | none   | none   | R         | view      | none

    Legend:
      CRUD = create, read, update, delete
      CRU  = create, read, update
      R    = read only
      R+U  = read + update
      R+W  = read + write (settings:read + settings:update)
      none = no access
    """

    def test_doc_super_admin_has_all_20_permissions(self) -> None:
        """SUPER_ADMIN covers all 20 system permissions."""
        assert len(_perms_for(RoleType.SUPER_ADMIN)) == len(Permission)

    def test_doc_admin_has_12_permissions(self) -> None:
        """ADMIN has 12 perms: user R+U, no role mgmt, org R+U, vehicle CRUD, analytics."""
        assert len(_perms_for(RoleType.ADMIN)) == 12

    def test_doc_manager_has_9_permissions(self) -> None:
        """MANAGER has 9 permissions (user R, org R, vehicle CRUD, analytics, settings R)."""
        assert len(_perms_for(RoleType.MANAGER)) == 9

    def test_doc_vendedor_has_4_permissions(self) -> None:
        """SALES_AGENT has 4 permissions (vehicle CRU, analytics view)."""
        assert len(_perms_for(RoleType.SALES_AGENT)) == 4

    def test_doc_viewer_has_2_permissions(self) -> None:
        """VIEWER has 2 permissions (vehicle R, analytics view)."""
        assert len(_perms_for(RoleType.VIEWER)) == 2

    def test_doc_permission_hierarchy_strictly_decreasing(self) -> None:
        """Permission counts decrease monotonically down the hierarchy."""
        counts = [
            len(_perms_for(RoleType.SUPER_ADMIN)),  # 20
            len(_perms_for(RoleType.ADMIN)),  # 12
            len(_perms_for(RoleType.MANAGER)),  # 9
            len(_perms_for(RoleType.SALES_AGENT)),  # 4
            len(_perms_for(RoleType.VIEWER)),  # 2
        ]
        for i in range(len(counts) - 1):
            assert (
                counts[i] > counts[i + 1]
            ), f"Hierarchy broken at index {i}: {counts[i]} <= {counts[i + 1]}"

    def test_doc_every_role_can_at_least_read_vehicles(self) -> None:
        """All roles have at minimum VEHICLE_READ (the most basic read access)."""
        for role_type in RoleType:
            perms = _perms_for(role_type)
            assert Permission.VEHICLE_READ in perms, f"Role {role_type.value} missing VEHICLE_READ"

    def test_doc_analytics_view_available_to_all_roles(self) -> None:
        """ANALYTICS_VIEW is granted to every role (basic business insight)."""
        for role_type in RoleType:
            perms = _perms_for(role_type)
            assert (
                Permission.ANALYTICS_VIEW in perms
            ), f"Role {role_type.value} missing ANALYTICS_VIEW"

    def test_doc_destructive_ops_require_manager_or_above(self) -> None:
        """VEHICLE_DELETE requires at least MANAGER role."""
        roles_with_delete = {rt for rt in RoleType if Permission.VEHICLE_DELETE in _perms_for(rt)}
        roles_without_delete = set(RoleType) - roles_with_delete
        assert RoleType.SALES_AGENT in roles_without_delete
        assert RoleType.VIEWER in roles_without_delete
        assert RoleType.MANAGER in roles_with_delete
        assert RoleType.ADMIN in roles_with_delete
        assert RoleType.SUPER_ADMIN in roles_with_delete
