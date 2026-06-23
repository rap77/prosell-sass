"""DTOs for dealer organization creation (Task 12)."""

from uuid import UUID

from pydantic import BaseModel, EmailStr


class CreateDealerRequest(BaseModel):
    """Request body for POST /admin/dealers."""

    name: str
    vertical_ids: list[UUID]
    owner_email: EmailStr


class CreateDealerResponse(BaseModel):
    """Response body for POST /admin/dealers and the resend-invitation endpoint."""

    invitation_id: UUID
    organization_id: UUID
    email: str
    status: str
