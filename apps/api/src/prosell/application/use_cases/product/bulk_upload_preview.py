"""Bulk upload preview use case — dry-run analysis of CSV before import."""

import csv
import logging
from dataclasses import dataclass
from io import StringIO
from typing import Any

from prosell.application.dto.product.bulk_upload import (
    PreviewRowResponse,
    PreviewSummaryResponse,
)
from prosell.domain.services.csv_field_mapper import CSVFieldMapper, MappedCSVRow

logger = logging.getLogger(__name__)

# Columns in the client CSV that have no mapping to ProSell fields
UNMAPPED_COLUMNS = frozenset({"id", "type", "option"})


@dataclass
class PreviewUseCaseResult:
    """Result produced by the preview use case."""

    total_rows: int
    rows: list[PreviewRowResponse]
    summary: PreviewSummaryResponse


class BulkUploadPreviewUseCase:
    """Dry-run analysis of a client-format CSV file.

    This use case:
    - Reads the CSV (semicolon-delimited, 23 columns)
    - Maps each row using CSVFieldMapper
    - Returns per-row analysis WITHOUT modifying the database
    - Collects summary statistics
    """

    def __init__(self) -> None:
        """Initialize the preview use case."""
        self._required_fields = {"VIN", "price", "title"}

    async def execute(self, csv_content: str) -> PreviewUseCaseResult:
        """Analyze CSV content and produce a preview report.

        Args:
            csv_content: Raw CSV string (semicolon-delimited)

        Returns:
            PreviewUseCaseResult with per-row analysis
        """
        rows: list[PreviewRowResponse] = []
        importable_count = 0
        error_count = 0
        images_count = 0

        csv_file = StringIO(csv_content)
        reader = csv.DictReader(csv_file, delimiter=";")

        for row_dict in reader:
            try:
                preview_row = self._analyze_row(row_dict)
                rows.append(preview_row)

                if preview_row.importable:
                    importable_count += 1
                else:
                    error_count += 1

                images_count += len(preview_row.images_found)

            except Exception as e:
                logger.warning("Preview row analysis failed: %s", e)
                error_count += 1
                rows.append(
                    PreviewRowResponse(
                        row_number=0,
                        vin="",
                        title="",
                        importable=False,
                        errors=[str(e)],
                    )
                )

        total = len(rows)
        summary = PreviewSummaryResponse(
            importable_count=importable_count,
            error_count=error_count,
            images_count=images_count,
        )

        return PreviewUseCaseResult(total_rows=total, rows=rows, summary=summary)

    def _analyze_row(self, row: dict[str, str]) -> PreviewRowResponse:
        """Analyze a single CSV row.

        Args:
            row: Dictionary of column values

        Returns:
            PreviewRowResponse for this row
        """
        row_number = int(row.get("row_number", 0)) if "row_number" in row else 1

        # Map the row using CSVFieldMapper
        mapped: MappedCSVRow = CSVFieldMapper.map_row(row, row_number)

        # Determine mapped fields (everything that has a value)
        mapped_fields: dict[str, Any] = {}
        missing_fields: list[str] = []
        errors: list[str] = []

        # Check required fields
        if not mapped.vin:
            missing_fields.append("VIN")
            errors.append("VIN is required and missing or empty")
        else:
            mapped_fields["attributes.vin"] = mapped.vin

        if mapped.price_cents is not None and mapped.price_cents > 0:
            mapped_fields["price_cents"] = mapped.price_cents
        else:
            missing_fields.append("price")
            errors.append("price is required and must be greater than 0")

        if mapped.cod_dealer:
            mapped_fields["title"] = mapped.cod_dealer

        # Optional fields with values
        if mapped.location_city:
            mapped_fields["location_city"] = mapped.location_city
        if mapped.location_state:
            mapped_fields["location_state"] = mapped.location_state
        if mapped.year is not None:
            mapped_fields["attributes.year"] = mapped.year
        if mapped.make:
            mapped_fields["attributes.make"] = mapped.make
        if mapped.model:
            mapped_fields["attributes.model"] = mapped.model
        if mapped.mileage is not None:
            mapped_fields["attributes.mileage"] = mapped.mileage
            mapped_fields["attributes.mileage_unit"] = mapped.mileage_unit
        if mapped.body_style:
            mapped_fields["attributes.body_type"] = mapped.body_style
        if mapped.exterior_color:
            mapped_fields["attributes.exterior_color"] = mapped.exterior_color
        if mapped.interior_color:
            mapped_fields["attributes.interior_color"] = mapped.interior_color
        if mapped.title_status:
            mapped_fields["attributes.title_status"] = mapped.title_status
        if mapped.title_state:
            mapped_fields["attributes.title_state"] = mapped.title_state
        if mapped.fuel_type:
            mapped_fields["attributes.fuel_type"] = mapped.fuel_type
        if mapped.transmission:
            mapped_fields["attributes.transmission"] = mapped.transmission
        if mapped.description:
            mapped_fields["description"] = mapped.description
        if mapped.facebook_groups:
            mapped_fields["attributes.facebook_groups"] = mapped.facebook_groups
        if mapped.label:
            mapped_fields["attributes.label"] = mapped.label
        if mapped.publicado:
            mapped_fields["attributes.publicado"] = mapped.publicado

        # Collect unmapped columns (CSV columns that have no ProSell mapping)
        unmapped_csv_columns = [
            col for col in UNMAPPED_COLUMNS if col in row and row[col] and row[col].strip()
        ]

        # Images found (from path field)
        images_found: list[str] = []
        if mapped.image_path:
            images_found.append(mapped.image_path)

        importable = len(missing_fields) == 0 and len(errors) == 0

        return PreviewRowResponse(
            row_number=mapped.row_number,
            vin=mapped.vin or "",
            title=mapped.cod_dealer or "",
            importable=importable,
            mapped_fields=mapped_fields,
            missing_fields=missing_fields,
            unmapped_csv_columns=unmapped_csv_columns,
            images_found=images_found,
            errors=errors,
        )
