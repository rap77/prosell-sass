"""DTO for the available-transitions endpoint."""

from typing import Literal

from pydantic import BaseModel


class AvailableTransitionResponse(BaseModel):
    """One reverse transition the product could undergo from its current status.

    Shown to any authenticated user (not just super_admin) so the UI can
    render a disabled action with an explanation rather than hide it
    entirely for callers who lack the required role.
    """

    to_status: str
    endpoint: str
    requires_role: Literal["super_admin"]
    side_effects: list[Literal["fb_unpublish"]]
    method: Literal["reverse_publication", "resubmit", "restore", "revert_sale"]
