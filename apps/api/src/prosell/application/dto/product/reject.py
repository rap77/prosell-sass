"""Product rejection DTO."""

from pydantic import BaseModel, Field


class RejectProductRequest(BaseModel):
    """DTO for product rejection request."""

    reason: str = Field(..., min_length=1, max_length=1000)
