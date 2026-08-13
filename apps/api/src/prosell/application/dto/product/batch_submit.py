"""DTOs for batch product submission."""

from uuid import UUID

from pydantic import BaseModel, Field


class BatchSubmitRequest(BaseModel):
    """Request to submit multiple products for approval."""

    product_ids: list[UUID] = Field(..., min_length=1, max_length=100)


class BatchSubmitItemResult(BaseModel):
    """Result for a single product in a batch submit operation."""

    product_id: UUID
    status: str  # "submitted" | "failed"
    error_code: str | None = None  # "not_found" | "invalid_transition"
    message: str | None = None


class BatchSubmitResponse(BaseModel):
    """Response from batch submission operation."""

    results: list[BatchSubmitItemResult]
    submitted_count: int = 0
    failed_count: int = 0
