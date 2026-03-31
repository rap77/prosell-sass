"""DTOs for bulk vehicle dealer assignment."""

from uuid import UUID

from pydantic import BaseModel, Field


class BulkAssignDealerRequest(BaseModel):
    """Request to bulk assign vehicles to a dealer (organization)."""

    vehicle_ids: list[UUID] = Field(
        ..., min_length=1, max_length=100, description="List of vehicle IDs to assign"
    )
    dealer_id: UUID = Field(..., description="Organization ID to assign vehicles to")


class BulkAssignDealerResponse(BaseModel):
    """Response after bulk assigning vehicles to dealer."""

    assigned_count: int = Field(..., description="Number of vehicles successfully assigned")
    failed_count: int = Field(..., description="Number of vehicles that failed to assign")
    errors: list[str] = Field(
        default_factory=list, description="List of error messages for failed assignments"
    )
