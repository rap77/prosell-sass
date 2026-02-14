"""Role and Permission entities for RBAC."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4


class RoleType(StrEnum):
    """System-defined role types."""

    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    SALES_AGENT = "sales_agent"
    SALES_USER = "sales_user"
    VIEWER = "viewer"


class Permission(StrEnum):
    """System permissions."""

    # User management
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"

    # Role management
    ROLE_CREATE = "role:create"
    ROLE_READ = "role:read"
    ROLE_UPDATE = "role:update"
    ROLE_DELETE = "role:delete"

    # Organization management
    ORG_CREATE = "org:create"
    ORG_READ = "org:read"
    ORG_UPDATE = "org:update"
    ORG_DELETE = "org:delete"

    # Vehicle listings
    VEHICLE_CREATE = "vehicle:create"
    VEHICLE_READ = "vehicle:read"
    VEHICLE_UPDATE = "vehicle:update"
    VEHICLE_DELETE = "vehicle:delete"

    # Analytics
    ANALYTICS_VIEW = "analytics:view"
    ANALYTICS_EXPORT = "analytics:export"

    # Settings
    SETTINGS_READ = "settings:read"
    SETTINGS_UPDATE = "settings:update"


# Role permission mappings
ROLE_PERMISSIONS: dict[RoleType, set[Permission]] = {
    RoleType.SUPER_ADMIN: {
        # All permissions
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.ROLE_CREATE,
        Permission.ROLE_READ,
        Permission.ROLE_UPDATE,
        Permission.ROLE_DELETE,
        Permission.ORG_CREATE,
        Permission.ORG_READ,
        Permission.ORG_UPDATE,
        Permission.ORG_DELETE,
        Permission.VEHICLE_CREATE,
        Permission.VEHICLE_READ,
        Permission.VEHICLE_UPDATE,
        Permission.VEHICLE_DELETE,
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_EXPORT,
        Permission.SETTINGS_READ,
        Permission.SETTINGS_UPDATE,
    },
    RoleType.ADMIN: {
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.ORG_READ,
        Permission.ORG_UPDATE,
        Permission.VEHICLE_CREATE,
        Permission.VEHICLE_READ,
        Permission.VEHICLE_UPDATE,
        Permission.VEHICLE_DELETE,
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_EXPORT,
        Permission.SETTINGS_READ,
        Permission.SETTINGS_UPDATE,
    },
    RoleType.MANAGER: {
        Permission.USER_READ,
        Permission.ORG_READ,
        Permission.VEHICLE_CREATE,
        Permission.VEHICLE_READ,
        Permission.VEHICLE_UPDATE,
        Permission.VEHICLE_DELETE,
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_EXPORT,
        Permission.SETTINGS_READ,
    },
    RoleType.SALES_AGENT: {
        Permission.VEHICLE_CREATE,
        Permission.VEHICLE_READ,
        Permission.VEHICLE_UPDATE,
        Permission.ANALYTICS_VIEW,
    },
    RoleType.SALES_USER: {
        Permission.VEHICLE_READ,
        Permission.ANALYTICS_VIEW,
    },
    RoleType.VIEWER: {
        Permission.VEHICLE_READ,
        Permission.ANALYTICS_VIEW,
    },
}


@dataclass
class Role:
    """Role entity for RBAC."""

    id: UUID
    role_type: RoleType
    name: str
    description: str | None
    is_system_role: bool
    tenant_id: UUID | None
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def create_system_role(cls, role_type: RoleType) -> Role:
        """Create a system role with default permissions."""

        return cls(
            id=uuid4(),
            role_type=role_type,
            name=role_type.value.replace("_", " ").title(),
            description=f"System role: {role_type.value}",
            is_system_role=True,
            tenant_id=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

    @classmethod
    def create_custom_role(
        cls,
        name: str,
        description: str | None,
        tenant_id: UUID,
    ) -> Role:
        """Create a custom role for an organization."""

        return cls(
            id=uuid4(),
            role_type=RoleType.VIEWER,  # Default to minimal permissions
            name=name,
            description=description,
            is_system_role=False,
            tenant_id=tenant_id,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

    def get_permissions(self) -> set[Permission]:
        """Get permissions for this role."""
        return ROLE_PERMISSIONS.get(self.role_type, set())

    def has_permission(self, permission: Permission) -> bool:
        """Check if role has a specific permission."""
        return permission in self.get_permissions()
