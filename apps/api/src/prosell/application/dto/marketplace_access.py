"""Marketplace access DTOs - Application layer data transfer objects."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class RequestAccessRequest(BaseModel):
    """Request to grant marketplace access to an operator organization."""

    operator_organization_id: UUID
    can_publish_marketplace: bool = True
    can_manage_inventory: bool = False


class AccessGrantResponse(BaseModel):
    """Response DTO for marketplace access grant."""

    id: UUID
    inventory_owner_organization_id: UUID
    operator_organization_id: UUID
    status: str
    can_publish_marketplace: bool
    can_manage_inventory: bool
    requested_by_user_id: UUID | None
    approved_by_user_id: UUID | None
    rejected_by_user_id: UUID | None
    revoked_by_user_id: UUID | None
    requested_at: datetime
    approved_at: datetime | None
    rejected_at: datetime | None
    revoked_at: datetime | None
    rejection_reason: str | None
    revocation_reason: str | None


class ApproveRequest(BaseModel):
    """Request to approve a pending grant (no body needed, grant_id in path)."""

    pass


class RejectRequest(BaseModel):
    """Request to reject a pending grant."""

    reason: str


class RevokeRequest(BaseModel):
    """Request to revoke an active grant."""

    reason: str


class CreateAccessAsAdminRequest(BaseModel):
    """Request to create marketplace access grant as admin (bypass REQUEST flow)."""

    inventory_owner_organization_id: UUID
    operator_organization_id: UUID
    can_publish_marketplace: bool = True
    can_manage_inventory: bool = False
    initial_status: str = "pending"  # "pending" or "active"
