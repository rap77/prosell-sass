"""DTOs for dealer organization creation (Task 12)."""

from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, EmailStr, StringConstraints


class CreateDealerRequest(BaseModel):
    """Request body for POST /admin/dealers."""

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
    vertical_ids: list[UUID]
    owner_email: EmailStr


class CreateDealerResponse(BaseModel):
    """Response body for POST /admin/dealers and the resend-invitation endpoint."""

    invitation_id: UUID
    organization_id: UUID
    email: str
    status: str
