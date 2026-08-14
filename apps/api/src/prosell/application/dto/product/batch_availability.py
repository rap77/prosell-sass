"""DTOs for batch product availability operations."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class BatchAvailabilityItemResult(BaseModel):
    """Result for a single product in a batch availability operation."""

    product_id: UUID
    status: Literal["reserved", "paused", "resumed", "sold", "failed"]
    error_code: Literal["not_found", "invalid_transition"] | None = None
    message: str | None = None


class BatchAvailabilityResponse(BaseModel):
    """Response for batch availability operations."""

    results: list[BatchAvailabilityItemResult]
    success_count: int
    failed_count: int
