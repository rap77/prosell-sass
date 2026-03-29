"""UserDealer DTOs for API requests and responses."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AssignDealerRequest(BaseModel):
    """Request DTO for assigning a single dealer to a user."""

    dealer_id: UUID = Field(..., description="Dealer UUID to assign")


class BulkAssignRequest(BaseModel):
    """Request DTO for bulk assigning users to dealers."""

    user_ids: list[UUID] = Field(..., min_length=1, description="List of user UUIDs to assign")
    dealer_ids: list[UUID] = Field(
        ..., min_length=1, description="List of dealer UUIDs to assign to"
    )

    @field_validator("user_ids", "dealer_ids")
    @classmethod
    def validate_non_empty(cls, v: list[UUID]) -> list[UUID]:
        """Validate that lists are not empty."""
        if not v:
            raise ValueError("List cannot be empty")
        return v


class UserDealerResponse(BaseModel):
    """Response DTO for user-dealer assignment."""

    id: UUID = Field(..., description="Assignment record UUID")
    user_id: UUID = Field(..., description="User UUID")
    dealer_id: UUID = Field(..., description="Dealer UUID")
    tenant_id: UUID = Field(..., description="Tenant UUID for isolation")
    assigned_at: datetime = Field(..., description="When the assignment was made")
    assigned_by: UUID | None = Field(
        None, description="UUID of user who made the assignment (audit trail)"
    )


class UserDealerListResponse(BaseModel):
    """Response DTO for listing user-dealer assignments."""

    items: list[UserDealerResponse] = Field(default_factory=list, description="List of assignments")
    total: int = Field(..., description="Total count of assignments")
