"""DTO for accepting an organization invitation (Task 13)."""

from typing import Annotated

from pydantic import BaseModel, StringConstraints

# CR-3: harden the trust boundary. The frontend Zod schema catches min(1),
# but a direct POST to /auth/accept-org-invitation bypasses the frontend
# entirely. strip_whitespace=True runs BEFORE min_length=1, so a name like
# "   " is rejected the same as "". max_length=100 matches the User.full_name
# column constraint and rejects pathological inputs.
NameField = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]


class AcceptOrgInvitationRequest(BaseModel):
    """Request body for POST /auth/accept-org-invitation."""

    token: str
    password: str
    first_name: NameField
    last_name: NameField
