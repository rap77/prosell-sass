"""Bulk upload DTOs for preview and with-images endpoints."""

from typing import Any

from pydantic import BaseModel, Field


class PreviewRowResponse(BaseModel):
    """Response DTO for a single row in the preview."""

    row_number: int = Field(description="Row number in the CSV (1-indexed, header is row 1)")
    vin: str = Field(description="VIN extracted from the row")
    title: str = Field(description="Title/cod_dealer from the row")
    importable: bool = Field(description="Whether this row can be imported")
    mapped_fields: dict[str, Any] = Field(
        default_factory=dict,
        description="Fields that were successfully mapped to the ProSell model",
    )
    missing_fields: list[str] = Field(
        default_factory=list,
        description="Required fields that are missing or invalid",
    )
    unmapped_csv_columns: list[str] = Field(
        default_factory=list,
        description="CSV columns that have no mapping to ProSell fields",
    )
    images_found: list[str] = Field(
        default_factory=list,
        description="Image paths found for this vehicle",
    )
    errors: list[str] = Field(
        default_factory=list,
        description="Validation or parsing errors for this row",
    )


class PreviewSummaryResponse(BaseModel):
    """Summary statistics for the preview."""

    importable_count: int = Field(description="Number of rows that can be imported")
    error_count: int = Field(description="Number of rows with errors")
    images_count: int = Field(description="Total number of images found across all rows")


class BulkUploadPreviewResponse(BaseModel):
    """Response DTO for the bulk upload preview endpoint."""

    total_rows: int = Field(description="Total number of data rows in the CSV")
    rows: list[PreviewRowResponse] = Field(
        default_factory=list,
        description="Per-row preview results",
    )
    summary: PreviewSummaryResponse = Field(
        description="Summary statistics",
    )


__all__ = [
    "BulkUploadPreviewResponse",
    "PreviewRowResponse",
    "PreviewSummaryResponse",
]
