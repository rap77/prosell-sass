"""Role (permission profile) request DTOs — bloque 3, admin profiles UI."""

from uuid import UUID

from pydantic import BaseModel, Field


class RoleGrantRequest(BaseModel):
    """One requested (zone, action) grant."""

    zone: str = Field(min_length=1)
    action: str = Field(min_length=1)


class RoleScopeRequest(BaseModel):
    """Requested data-visibility scope for a new/edited profile."""

    scope_type: str = Field(description="'own' | 'all' | 'explicit'")
    organization_ids: list[UUID] = Field(
        default_factory=list, description="Required when scope_type == 'explicit'"
    )


class CreateRoleRequest(BaseModel):
    """Body for POST /api/v1/admin/roles.

    `tenant_id` is deliberately absent — always derived from the
    authenticated actor server-side (IDOR prevention, same discipline
    as CreateOrganizationRequest), never trusted from the client.
    """

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    grants: list[RoleGrantRequest] = Field(default_factory=list)
    scope: RoleScopeRequest | None = None


class UpdateRoleRequest(BaseModel):
    """Body for PATCH /api/v1/admin/roles/{role_id} — a full replace of
    the editable fields (same shape as create: the admin profile editor
    always sends the complete current state back, not a partial diff).
    `role_type`/`is_system_role`/`tenant_id` are not editable here —
    they're identity, not matrix."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    grants: list[RoleGrantRequest] = Field(default_factory=list)
    scope: RoleScopeRequest | None = None
