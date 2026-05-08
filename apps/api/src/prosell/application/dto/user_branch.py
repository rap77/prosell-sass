"""UserBranch DTOs for API requests and responses."""

from datetime import datetime
from typing import cast
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AssignBranchRequest(BaseModel):
    """Request DTO for assigning a single branch to a user."""

    branch_id: UUID = Field(..., description="Branch UUID to assign")


class BulkAssignRequest(BaseModel):
    """Request DTO for bulk assigning users to branches."""

    user_ids: list[UUID] = Field(..., min_length=1, description="List of user UUIDs to assign")
    branch_ids: list[UUID] = Field(
        ..., min_length=1, description="List of branch UUIDs to assign to"
    )

    @field_validator("user_ids", "branch_ids")
    @classmethod
    def validate_non_empty(cls, v: list[UUID]) -> list[UUID]:
        """Validate that lists are not empty."""
        if not v:
            raise ValueError("List cannot be empty")
        return v


class UserBranchResponse(BaseModel):
    """Response DTO for user-branch assignment."""

    id: UUID = Field(..., description="Assignment record UUID")
    user_id: UUID = Field(..., description="User UUID")
    branch_id: UUID = Field(..., description="Branch UUID")
    tenant_id: UUID = Field(..., description="Tenant UUID for isolation")
    assigned_at: datetime = Field(..., description="When the assignment was made")
    assigned_by: UUID | None = Field(
        None, description="UUID of user who made the assignment (audit trail)"
    )


class UserBranchListResponse(BaseModel):
    """Response DTO for listing user-branch assignments."""

    items: list[UserBranchResponse] = Field(
        default_factory=lambda: cast(list[UserBranchResponse], []),
        description="List of assignments",
    )
    total: int = Field(..., description="Total count of assignments")
