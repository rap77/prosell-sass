"""Role (permission profile) response DTOs — bloque 3, admin profiles UI."""

from uuid import UUID

from pydantic import BaseModel, Field

from prosell.domain.entities.role import Role
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope


class RoleGrantResponse(BaseModel):
    """One (zone, action) grant."""

    zone: str
    action: str


class RoleScopeResponse(BaseModel):
    """Data-visibility scope — mirrors the Scope specification objects
    (OwnScope/AllScope/ExplicitOrgsScope) as a flat, JSON-friendly shape."""

    scope_type: str = Field(description="'own' | 'all' | 'explicit' | 'none' (unconfigured)")
    organization_ids: list[UUID] = Field(
        default_factory=list, description="Only populated when scope_type == 'explicit'"
    )


class RoleResponse(BaseModel):
    """A role (system template or custom profile), with its current
    grants/scope — the shape the admin profiles UI lists and edits."""

    id: UUID
    name: str
    description: str | None
    role_type: str | None = Field(description="None for a custom (non-system) role")
    is_system_role: bool
    tenant_id: UUID | None
    grants: list[RoleGrantResponse]
    scope: RoleScopeResponse

    @classmethod
    def from_entity(cls, role: Role) -> "RoleResponse":
        return cls(
            id=role.id,
            name=role.name,
            description=role.description,
            role_type=role.role_type.value if role.role_type is not None else None,
            is_system_role=role.is_system_role,
            tenant_id=role.tenant_id,
            grants=[RoleGrantResponse(zone=g.zone, action=g.action) for g in role.grants],
            scope=_scope_to_response(role.scope),
        )


def _scope_to_response(scope: OwnScope | AllScope | ExplicitOrgsScope | None) -> RoleScopeResponse:
    if scope is None:
        return RoleScopeResponse(scope_type="none")
    if isinstance(scope, OwnScope):
        return RoleScopeResponse(scope_type="own")
    if isinstance(scope, AllScope):
        return RoleScopeResponse(scope_type="all")
    return RoleScopeResponse(scope_type="explicit", organization_ids=sorted(scope.organization_ids))


class RoleListResponse(BaseModel):
    """List response — matches the shape other admin list endpoints use
    (`items` + `total`), not a bare array, for forward-compat with
    pagination once the admin UI needs it."""

    items: list[RoleResponse]
    total: int
