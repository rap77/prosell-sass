"""DTOs for the generalized bulk upload response."""

from uuid import UUID

from pydantic import BaseModel, Field


class BulkUploadRowError(BaseModel):
    """Per-row error from CSV bulk upload validation."""

    row_number: int = Field(description="1-indexed row number (row 1 = header)")
    column: str | None = Field(
        default=None,
        description="Column name, e.g. 'attributes.vin' or 'price'. None = row-level error.",
    )
    message: str = Field(description="User-facing error message")
    raw_row: dict[str, str] = Field(
        default_factory=dict,
        description="Original unprocessed CSV row values",
    )


class BulkUploadUploadResult(BaseModel):
    """Response shape for POST /api/v1/products/bulk-upload."""

    upload_id: UUID = Field(description="ID for GET /bulk-upload/errors.csv?upload_id=X")
    total_rows: int
    created_count: int
    failed_count: int
    errors: list[BulkUploadRowError]
