"""DTOs for vehicle dealer assignment."""

from uuid import UUID

from pydantic import BaseModel, Field


class AssignDealerRequest(BaseModel):
    """Request to assign a vehicle to a dealer (organization)."""

    dealer_id: UUID = Field(..., description="Organization ID to assign vehicle to")


class AssignDealerResponse(BaseModel):
    """Response after assigning vehicle to dealer."""

    id: UUID
    product_id: UUID
    vin: str
    dealer_id: UUID
    dealer_name: str | None
