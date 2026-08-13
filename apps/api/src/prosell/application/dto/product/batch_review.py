"""DTOs for batch product approval/rejection."""

from uuid import UUID

from pydantic import BaseModel, Field


class BatchApproveRequest(BaseModel):
    """Request to approve multiple products."""

    product_ids: list[UUID] = Field(..., min_length=1, max_length=100)


class BatchRejectRequest(BaseModel):
    """Request to reject multiple products."""

    product_ids: list[UUID] = Field(..., min_length=1, max_length=100)
    reason: str = Field(..., min_length=1, max_length=1000)


class BatchReviewItemResult(BaseModel):
    """Result for a single product in a batch operation."""

    product_id: UUID
    status: str  # "approved" | "rejected" | "failed"
    error_code: str | None = None  # "not_found" | "invalid_transition"
    message: str | None = None


class BatchReviewResponse(BaseModel):
    """Response from batch approval/rejection operation."""

    results: list[BatchReviewItemResult]
    approved_count: int = 0
    rejected_count: int = 0
    failed_count: int = 0
