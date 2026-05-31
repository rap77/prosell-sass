"""Bulk upload DTOs for preview and with-images endpoints."""

from uuid import UUID

from pydantic import BaseModel, Field


class PreviewRowResponse(BaseModel):
    """Response DTO for a single row in the preview."""

    row_number: int = Field(description="Row number in the CSV (1-indexed, header is row 1)")
    vin: str = Field(description="VIN extracted from the row")
    title: str = Field(description="Title/cod_dealer from the row")
    importable: bool = Field(description="Whether this row can be imported")
    mapped_fields: dict[str, str | int | float | bool | list] = Field(
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


class VehicleImportRowResponse(BaseModel):
    """Response DTO for a single vehicle import row."""

    row_number: int = Field(description="Row number in the CSV")
    vin: str = Field(description="VIN of the imported vehicle")
    product_id: UUID | None = Field(description="UUID of the created/updated product")
    images_uploaded: int = Field(description="Number of images uploaded")
    status: str = Field(description="Status: imported, updated, or failed")
    errors: list[str] = Field(default_factory=list, description="Error messages if failed")


class BulkUploadVehiclesResponse(BaseModel):
    """Response DTO for the bulk upload with-images endpoint."""

    total_rows: int = Field(description="Total number of data rows in the CSV")
    imported_count: int = Field(description="Number of newly imported vehicles")
    updated_count: int = Field(description="Number of updated vehicles")
    failed_count: int = Field(description="Number of failed rows")
    results: list[VehicleImportRowResponse] = Field(
        default_factory=list,
        description="Per-row results",
    )


__all__ = [
    "BulkUploadPreviewResponse",
    "BulkUploadVehiclesResponse",
    "PreviewRowResponse",
    "PreviewSummaryResponse",
    "VehicleImportRowResponse",
]
