"""Request DTOs for batch product availability operations."""

from uuid import UUID

from pydantic import BaseModel, Field


class BatchAvailabilityRequest(BaseModel):
    """Request to perform batch availability operations (reserve, pause, resume, sold)."""

    product_ids: list[UUID] = Field(..., min_length=1, max_length=100)
