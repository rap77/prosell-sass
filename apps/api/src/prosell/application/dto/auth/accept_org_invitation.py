"""DTO for accepting an organization invitation (Task 13)."""

from pydantic import BaseModel


class AcceptOrgInvitationRequest(BaseModel):
    """Request body for POST /auth/accept-org-invitation."""

    token: str
    password: str
    first_name: str
    last_name: str
