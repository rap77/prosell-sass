"""Lead request DTOs."""

from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from prosell.domain.entities.lead import LeadStatus
from prosell.domain.value_objects.lead_source import LeadSource


class CreateLeadRequest(BaseModel):
    """DTO for creating a new lead."""

    buyer_name: str = Field(..., min_length=1, max_length=255)
    buyer_email: EmailStr | None = None
    buyer_phone: str | None = Field(default=None, max_length=50)
    product_id: UUID | None = None
    vendedor_id: UUID | None = None
    message: str | None = Field(default=None, max_length=2000)
    source: LeadSource = Field(default=LeadSource.MANUAL)

    model_config = {"str_strip_whitespace": True}


class UpdateLeadStatusRequest(BaseModel):
    """DTO for updating lead status."""

    new_status: LeadStatus
    reason: str | None = Field(default=None, max_length=500)


class ListLeadsRequest(BaseModel):
    """DTO for listing leads with pagination."""

    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    status: LeadStatus | None = None
    vendedor_id: UUID | None = Field(default=None, description="Filter by vendedor ID (manager-only)")


class AssignLeadRequest(BaseModel):
    """DTO for assigning a lead to a vendedor."""

    vendedor_id: UUID | None = Field(..., description="New vendedor ID (null to unassign)")
