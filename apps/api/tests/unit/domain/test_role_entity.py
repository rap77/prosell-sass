"""Unit tests for Role and Permission entities.

Tests all business logic in the Role domain entities:
- RoleType enum values (6 role types)
- Permission enum values (all system permissions)
- ROLE_PERMISSIONS mapping correctness
- Permission hierarchy (SUPER_ADMIN > ADMIN > MANAGER > ...)
- Role entity factory methods
- Role permission checking methods
"""

from uuid import UUID, uuid4

from prosell.domain.entities.role import ROLE_PERMISSIONS, Permission, Role, RoleType


class TestRoleTypeEnum:
    """Test RoleType enum values."""

    def test_all_role_type_values_exist(self) -> None:
        """Test that all 6 role types are defined."""
        assert RoleType.SUPER_ADMIN == "super_admin"
        assert RoleType.ADMIN == "admin"
        assert RoleType.MANAGER == "manager"
        assert RoleType.SALES_AGENT == "sales_agent"
        assert RoleType.SALES_USER == "sales_user"
        assert RoleType.VIEWER == "viewer"

    def test_role_type_is_string_enum(self) -> None:
        """Test that RoleType inherits from str and Enum."""
        assert isinstance(RoleType.SUPER_ADMIN, str)
        assert RoleType.SUPER_ADMIN in RoleType


class TestPermissionEnum:
    """Test Permission enum values."""

    def test_user_management_permissions(self) -> None:
        """Test user management permission values."""
        assert Permission.USER_CREATE == "user:create"
        assert Permission.USER_READ == "user:read"
        assert Permission.USER_UPDATE == "user:update"
        assert Permission.USER_DELETE == "user:delete"

    def test_role_management_permissions(self) -> None:
        """Test role management permission values."""
        assert Permission.ROLE_CREATE == "role:create"
        assert Permission.ROLE_READ == "role:read"
        assert Permission.ROLE_UPDATE == "role:update"
        assert Permission.ROLE_DELETE == "role:delete"

    def test_organization_management_permissions(self) -> None:
        """Test organization management permission values."""
        assert Permission.ORG_CREATE == "org:create"
        assert Permission.ORG_READ == "org:read"
        assert Permission.ORG_UPDATE == "org:update"
        assert Permission.ORG_DELETE == "org:delete"

    def test_vehicle_permissions(self) -> None:
        """Test vehicle listing permission values."""
        assert Permission.VEHICLE_CREATE == "vehicle:create"
        assert Permission.VEHICLE_READ == "vehicle:read"
        assert Permission.VEHICLE_UPDATE == "vehicle:update"
        assert Permission.VEHICLE_DELETE == "vehicle:delete"

    def test_analytics_permissions(self) -> None:
        """Test analytics permission values."""
        assert Permission.ANALYTICS_VIEW == "analytics:view"
        assert Permission.ANALYTICS_EXPORT == "analytics:export"

    def test_settings_permissions(self) -> None:
        """Test settings permission values."""
        assert Permission.SETTINGS_READ == "settings:read"
        assert Permission.SETTINGS_UPDATE == "settings:update"

    def test_permission_is_string_enum(self) -> None:
        """Test that Permission inherits from str and Enum."""
        assert isinstance(Permission.USER_READ, str)
        assert Permission.USER_READ in Permission


class TestRolePermissionsMapping:
    """Test ROLE_PERMISSIONS mapping correctness."""

    def test_super_admin_has_all_permissions(self) -> None:
        """Test that SUPER_ADMIN has all permissions in the enum (auto-derived)."""
        super_admin_perms = ROLE_PERMISSIONS[RoleType.SUPER_ADMIN]
        assert len(super_admin_perms) == len(Permission)
        assert Permission.USER_CREATE in super_admin_perms
        assert Permission.USER_READ in super_admin_perms
        assert Permission.USER_UPDATE in super_admin_perms
        assert Permission.USER_DELETE in super_admin_perms
        assert Permission.ROLE_CREATE in super_admin_perms
        assert Permission.ROLE_READ in super_admin_perms
        assert Permission.ROLE_UPDATE in super_admin_perms
        assert Permission.ROLE_DELETE in super_admin_perms
        assert Permission.ORG_CREATE in super_admin_perms
        assert Permission.ORG_READ in super_admin_perms
        assert Permission.ORG_UPDATE in super_admin_perms
        assert Permission.ORG_DELETE in super_admin_perms
        assert Permission.VEHICLE_CREATE in super_admin_perms
        assert Permission.VEHICLE_READ in super_admin_perms
        assert Permission.VEHICLE_UPDATE in super_admin_perms
        assert Permission.VEHICLE_DELETE in super_admin_perms
        assert Permission.DEALER_ADMIN_VIEW_ALL in super_admin_perms
        assert Permission.MARKETPLACE_PUBLISH in super_admin_perms
        assert Permission.ANALYTICS_VIEW in super_admin_perms
        assert Permission.ANALYTICS_EXPORT in super_admin_perms
        assert Permission.SETTINGS_READ in super_admin_perms
        assert Permission.SETTINGS_UPDATE in super_admin_perms

    def test_admin_has_core_permissions(self) -> None:
        """Test that ADMIN has core permissions (no user/role management)."""
        admin_perms = ROLE_PERMISSIONS[RoleType.ADMIN]
        # Was 12; Subsystem D adds DEALER_ADMIN_VIEW_ALL + MARKETPLACE_PUBLISH = 14
        assert len(admin_perms) == 14
        # Should NOT have user management
        assert Permission.USER_CREATE not in admin_perms
        assert Permission.USER_DELETE not in admin_perms
        assert Permission.ROLE_CREATE not in admin_perms
        assert Permission.ROLE_DELETE not in admin_perms
        # Subsystem D: admin gets both new perms
        assert Permission.DEALER_ADMIN_VIEW_ALL in admin_perms
        assert Permission.MARKETPLACE_PUBLISH in admin_perms
        # Should have other permissions
        assert Permission.USER_READ in admin_perms
        assert Permission.USER_UPDATE in admin_perms
        assert Permission.ORG_READ in admin_perms
        assert Permission.VEHICLE_CREATE in admin_perms
        assert Permission.ANALYTICS_VIEW in admin_perms

    def test_manager_has_limited_permissions(self) -> None:
        """Test that MANAGER has 10 permissions (no org management, +marketplace)."""
        manager_perms = ROLE_PERMISSIONS[RoleType.MANAGER]
        # Was 9; Subsystem D adds MARKETPLACE_PUBLISH = 10
        assert len(manager_perms) == 10
        # Should NOT have organization management
        assert Permission.ORG_CREATE not in manager_perms
        assert Permission.ORG_UPDATE not in manager_perms
        assert Permission.ORG_DELETE not in manager_perms
        # Subsystem D: manager gets marketplace but NOT dealer admin view
        assert Permission.MARKETPLACE_PUBLISH in manager_perms
        assert Permission.DEALER_ADMIN_VIEW_ALL not in manager_perms
        # Should have user read, org read, vehicle operations, analytics, settings
        assert Permission.USER_READ in manager_perms
        assert Permission.ORG_READ in manager_perms
        assert Permission.VEHICLE_CREATE in manager_perms
        assert Permission.VEHICLE_DELETE in manager_perms

    def test_sales_agent_has_vehicle_permissions_only(self) -> None:
        """Test that SALES_AGENT has only vehicle + analytics permissions."""
        agent_perms = ROLE_PERMISSIONS[RoleType.SALES_AGENT]
        assert len(agent_perms) == 4
        assert Permission.VEHICLE_CREATE in agent_perms
        assert Permission.VEHICLE_READ in agent_perms
        assert Permission.VEHICLE_UPDATE in agent_perms
        assert Permission.ANALYTICS_VIEW in agent_perms
        # Should NOT have user management
        assert Permission.USER_READ not in agent_perms

    def test_sales_user_has_read_only(self) -> None:
        """Test that SALES_USER has only read permissions."""
        user_perms = ROLE_PERMISSIONS[RoleType.SALES_USER]
        assert len(user_perms) == 2
        assert Permission.VEHICLE_READ in user_perms
        assert Permission.ANALYTICS_VIEW in user_perms
        # Should NOT have create/update/delete
        assert Permission.VEHICLE_CREATE not in user_perms

    def test_viewer_has_minimal_permissions(self) -> None:
        """Test that VIEWER has same permissions as SALES_USER."""
        viewer_perms = ROLE_PERMISSIONS[RoleType.VIEWER]
        assert len(viewer_perms) == 2
        assert Permission.VEHICLE_READ in viewer_perms
        assert Permission.ANALYTICS_VIEW in viewer_perms


class TestPermissionHierarchy:
    """Test permission hierarchy between roles."""

    def test_super_admin_over_admin(self) -> None:
        """Test that SUPER_ADMIN has strictly more permissions than ADMIN."""
        super_admin_perms = ROLE_PERMISSIONS[RoleType.SUPER_ADMIN]
        admin_perms = ROLE_PERMISSIONS[RoleType.ADMIN]
        # All ADMIN permissions should be in SUPER_ADMIN
        for perm in admin_perms:
            assert perm in super_admin_perms
        # SUPER_ADMIN should have more permissions
        assert len(super_admin_perms) > len(admin_perms)

    def test_admin_over_manager(self) -> None:
        """Test that ADMIN has strictly more permissions than MANAGER."""
        admin_perms = ROLE_PERMISSIONS[RoleType.ADMIN]
        manager_perms = ROLE_PERMISSIONS[RoleType.MANAGER]
        # All MANAGER permissions should be in ADMIN
        for perm in manager_perms:
            assert perm in admin_perms
        # ADMIN should have more permissions
        assert len(admin_perms) > len(manager_perms)

    def test_manager_over_sales_agent(self) -> None:
        """Test that MANAGER has more permissions than SALES_AGENT."""
        manager_perms = ROLE_PERMISSIONS[RoleType.MANAGER]
        agent_perms = ROLE_PERMISSIONS[RoleType.SALES_AGENT]
        # Not all agent perms need to be in manager (agent has vehicle create)
        # But manager should have more total permissions
        assert len(manager_perms) > len(agent_perms)

    def test_hierarchy_chain(self) -> None:
        """Test complete permission hierarchy chain against the real ROLE_PERMISSIONS map."""
        perm_counts = {
            role_type: len(ROLE_PERMISSIONS[role_type])
            for role_type in (
                RoleType.SUPER_ADMIN,
                RoleType.ADMIN,
                RoleType.MANAGER,
                RoleType.SALES_AGENT,
                RoleType.SALES_USER,
                RoleType.VIEWER,
            )
        }
        assert perm_counts[RoleType.SUPER_ADMIN] > perm_counts[RoleType.ADMIN]
        assert perm_counts[RoleType.ADMIN] > perm_counts[RoleType.MANAGER]
        assert perm_counts[RoleType.MANAGER] > perm_counts[RoleType.SALES_AGENT]
        assert perm_counts[RoleType.SALES_AGENT] > perm_counts[RoleType.SALES_USER]
        assert perm_counts[RoleType.SALES_USER] == perm_counts[RoleType.VIEWER]


class TestRoleEntity:
    """Test Role entity methods and properties."""

    def test_create_system_role_factory(self) -> None:
        """Test Role.create_system_role() factory method."""
        role = Role.create_system_role(RoleType.ADMIN)

        assert isinstance(role.id, UUID)
        assert role.role_type == RoleType.ADMIN
        assert role.name == "Admin"
        assert role.is_system_role is True
        assert role.tenant_id is None
        assert role.description is not None and "System role" in role.description

    def test_create_custom_role_factory(self) -> None:
        """Test Role.create_custom_role() factory method."""
        tenant_id = uuid4()
        role = Role.create_custom_role(
            name="Custom Moderator",
            description="Can moderate user content",
            tenant_id=tenant_id,
        )

        assert isinstance(role.id, UUID)
        assert role.role_type == RoleType.VIEWER  # Default to minimal
        assert role.name == "Custom Moderator"
        assert role.description == "Can moderate user content"
        assert role.is_system_role is False
        assert role.tenant_id == tenant_id

    def test_get_permissions_system_role(self) -> None:
        """Test get_permissions() for system role."""
        role = Role.create_system_role(RoleType.SUPER_ADMIN)
        perms = role.get_permissions()

        assert len(perms) == len(Permission)
        assert Permission.USER_CREATE in perms
        assert Permission.VEHICLE_DELETE in perms

    def test_get_permissions_custom_role(self) -> None:
        """Test get_permissions() for custom role (defaults to VIEWER)."""
        role = Role.create_custom_role(
            name="Custom",
            description="Custom role",
            tenant_id=uuid4(),
        )
        perms = role.get_permissions()

        # VIEWER has 2 permissions (VEHICLE_READ, ANALYTICS_VIEW)
        assert len(perms) == 2

    def test_has_permission_system_role(self) -> None:
        """Test has_permission() for system role."""
        role = Role.create_system_role(RoleType.MANAGER)

        assert role.has_permission(Permission.USER_READ) is True
        assert role.has_permission(Permission.VEHICLE_CREATE) is True
        assert role.has_permission(Permission.USER_DELETE) is False

    def test_has_permission_custom_role(self) -> None:
        """Test has_permission() for custom role with minimal permissions."""
        role = Role.create_custom_role(
            name="Custom",
            description="Custom",
            tenant_id=uuid4(),
        )

        # Custom roles use RoleType.VIEWER which has VEHICLE_READ and ANALYTICS_VIEW
        assert role.has_permission(Permission.VEHICLE_READ) is True
        assert role.has_permission(Permission.ANALYTICS_VIEW) is True
        assert role.has_permission(Permission.USER_READ) is False
