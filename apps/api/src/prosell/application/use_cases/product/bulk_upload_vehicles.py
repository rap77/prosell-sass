"""Bulk upload vehicles use case — CSV import with image association and VIN-based upsert.

This use case:
- Parses client-format CSV (semicolon-delimited, 23 columns) using CSVFieldMapper
- Associates images from ZIP file using CSVImageMapper
- Upserts products by VIN (update if exists, create if not)
- tenant_id comes from JWT context, never from CSV

For the upsert strategy, products are matched by VIN:
- If a product with the same VIN exists, it is updated
- If no product with that VIN exists, a new one is created
"""

import csv
import logging
from dataclasses import asdict, dataclass
from io import StringIO
from typing import Any
from uuid import UUID

from prosell.application.dto.product.create import CreateProductRequest
from prosell.domain.entities.product import Product
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.csv_field_mapper import CSVFieldMapper, MappedCSVRow
from prosell.domain.services.csv_image_mapper import CSVImageMapper, ImageMappingResult
from prosell.domain.value_objects.product_condition import ProductCondition

logger = logging.getLogger(__name__)


@dataclass
class VehicleImportRowResult:
    """Result for a single vehicle import row."""

    row_number: int
    vin: str
    product_id: UUID | None
    images_uploaded: int
    status: str  # "imported" | "updated" | "failed"
    errors: list[str]


@dataclass
class BulkUploadVehiclesResult:
    """Result of bulk vehicle upload operation."""

    total_rows: int
    imported_count: int
    updated_count: int
    failed_count: int
    results: list[VehicleImportRowResult]


class BulkUploadVehiclesUseCase:
    """
    Use case for bulk uploading vehicles from client-format CSV with image association.

    This use case:
    1. Parses CSV using CSVFieldMapper (semicolon-delimited, 23 columns)
    2. Maps images from ZIP using CSVImageMapper (if ZIP provided)
    3. Upserts products by VIN (update if exists, create if not)
    4. Associates images with products

    All products are created/updated within the same tenant_id from JWT context.
    """

    def __init__(
        self,
        product_repository: AbstractProductRepository,
        category_repository: AbstractCategoryRepository,
        csv_image_mapper: CSVImageMapper | None = None,
    ) -> None:
        """
        Initialize use case.

        Args:
            product_repository: Product repository for upsert operations
            category_repository: Category repository for validation
            csv_image_mapper: Image mapper for ZIP-based image association
        """
        self.product_repository = product_repository
        self.category_repository = category_repository
        self.csv_image_mapper = csv_image_mapper or CSVImageMapper()

    async def execute(
        self,
        csv_content: str,
        tenant_id: UUID,
        organization_id: UUID,
        category_id: UUID,
        zip_bytes: bytes | None = None,
    ) -> BulkUploadVehiclesResult:
        """
        Execute bulk vehicle upload from CSV.

        Args:
            csv_content: Raw CSV string (semicolon-delimited, 23 columns)
            tenant_id: Tenant ID from JWT context
            organization_id: Organization ID for the products
            category_id: Category ID for vehicles
            zip_bytes: Optional ZIP file bytes for image association

        Returns:
            BulkUploadVehiclesResult with per-row results and summary
        """
        # 1. Parse CSV rows
        parsed_rows = self._parse_csv(csv_content)

        # 2. Map images if ZIP provided
        image_mapping: ImageMappingResult | None = None
        if zip_bytes:
            rows_as_dicts = [asdict(row) for row in parsed_rows]
            image_mapping = self.csv_image_mapper.map_images(
                zip_bytes=zip_bytes,
                parsed_rows=rows_as_dicts,
                tenant_id=tenant_id,
                organization_id=organization_id,
            )

        # 3. Process each row (upsert by VIN)
        results: list[VehicleImportRowResult] = []
        imported_count = 0
        updated_count = 0
        failed_count = 0

        for mapped_row in parsed_rows:
            try:
                result = await self._upsert_vehicle(
                    mapped_row=mapped_row,
                    tenant_id=tenant_id,
                    organization_id=organization_id,
                    category_id=category_id,
                    image_mapping=image_mapping,
                )
                results.append(result)

                if result.status == "imported":
                    imported_count += 1
                elif result.status == "updated":
                    updated_count += 1
                else:
                    failed_count += 1

            except (ValueError, KeyError) as e:
                logger.error("Row %d failed: %s", mapped_row.row_number, e)
                failed_count += 1
                results.append(
                    VehicleImportRowResult(
                        row_number=mapped_row.row_number,
                        vin=mapped_row.vin or "",
                        product_id=None,
                        images_uploaded=0,
                        status="failed",
                        errors=[str(e)],
                    )
                )

        return BulkUploadVehiclesResult(
            total_rows=len(parsed_rows),
            imported_count=imported_count,
            updated_count=updated_count,
            failed_count=failed_count,
            results=results,
        )

    def _parse_csv(self, csv_content: str) -> list[MappedCSVRow]:
        """
        Parse CSV content into MappedCSVRow objects.

        Args:
            csv_content: Raw CSV string (semicolon-delimited)

        Returns:
            List of MappedCSVRow objects
        """
        rows: list[MappedCSVRow] = []
        csv_file = StringIO(csv_content)
        reader = csv.DictReader(csv_file, delimiter=";")

        for row_dict in reader:
            row_number = int(row_dict.get("row_number", 0)) if "row_number" in row_dict else 1
            try:
                mapped_row = CSVFieldMapper.map_row(row_dict, row_number)
                rows.append(mapped_row)
            except (ValueError, KeyError) as e:
                logger.warning("Failed to parse row %d: %s", row_number, e)
                # Create a minimal mapped row with error info
                rows.append(
                    MappedCSVRow(
                        row_number=row_number,
                        vin=row_dict.get("VIN", "").strip(),
                        cod_dealer=row_dict.get("title", "").strip(),
                        price_cents=0,
                    )
                )

        return rows

    async def _upsert_vehicle(
        self,
        mapped_row: MappedCSVRow,
        tenant_id: UUID,
        organization_id: UUID,
        category_id: UUID,
        image_mapping: ImageMappingResult | None,
    ) -> VehicleImportRowResult:
        """
        Upsert a single vehicle by VIN.

        Args:
            mapped_row: Parsed CSV row
            tenant_id: Tenant ID from JWT
            organization_id: Organization ID
            category_id: Category ID
            image_mapping: Image mapping result (optional)

        Returns:
            VehicleImportRowResult with the outcome
        """
        vin = mapped_row.vin
        if not vin:
            raise ValueError("VIN is required")

        # Build attributes dict from mapped row
        attributes = self._build_attributes(mapped_row)

        # Build CreateProductRequest
        request = CreateProductRequest(
            title=mapped_row.cod_dealer or f"Vehicle {vin}",
            price_cents=mapped_row.price_cents,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
            description=mapped_row.description,
            condition=ProductCondition.USED,
            attributes=attributes,
            location_city=mapped_row.location_city,
            location_state=mapped_row.location_state,
        )

        # Check if product with this VIN already exists (upsert)
        existing = await self.product_repository.get_by_vin(vin, tenant_id)

        product_id: UUID
        status: str
        images_uploaded = 0

        if existing:
            # Update existing product
            product_id = existing.id
            status = "updated"

            # Update fields
            existing.title = request.title
            existing.price_cents = request.price_cents
            existing.description = request.description
            existing.attributes = request.attributes
            existing.location_city = request.location_city
            existing.location_state = request.location_state

            # Forward image_urls from the ZIP mapping (filled in below)
            if image_mapping and vin:
                existing.image_urls = [
                    m.do_spaces_key for m in image_mapping.mapped if m.vin == vin
                ]

            await self.product_repository.update(existing)
        else:
            # Create new product
            product = Product.create(
                title=request.title,
                price_cents=request.price_cents,
                tenant_id=tenant_id,
                organization_id=organization_id,
                category_id=category_id,
                condition=request.condition,
                description=request.description,
                attributes=request.attributes,
                location_city=request.location_city,
                location_state=request.location_state,
                # Forward image_urls from the ZIP mapping (filled in below
                # — we re-derive here to keep both branches colocated).
                image_urls=(
                    [m.do_spaces_key for m in image_mapping.mapped if m.vin == vin]
                    if image_mapping and vin
                    else []
                ),
            )

            created = await self.product_repository.create(product)
            product_id = created.id
            status = "imported"

        # Associate images if mapping provided and we have images for this VIN
        if image_mapping and vin:
            vin_images = [m for m in image_mapping.mapped if m.vin == vin]
            images_uploaded = len(vin_images)

        return VehicleImportRowResult(
            row_number=mapped_row.row_number,
            vin=vin,
            product_id=product_id,
            images_uploaded=images_uploaded,
            status=status,
            errors=[],
        )

    def _build_attributes(self, mapped_row: MappedCSVRow) -> dict[str, Any]:
        """
        Build attributes dict from MappedCSVRow.

        Args:
            mapped_row: Parsed CSV row

        Returns:
            Attributes dict for CreateProductRequest
        """
        attributes: dict[str, Any] = {}

        # Core vehicle attributes
        if mapped_row.year is not None:
            attributes["year"] = mapped_row.year
        if mapped_row.make:
            attributes["make"] = mapped_row.make
        if mapped_row.model:
            attributes["model"] = mapped_row.model
        if mapped_row.mileage is not None:
            attributes["mileage"] = mapped_row.mileage
            attributes["mileage_unit"] = mapped_row.mileage_unit
        if mapped_row.body_style:
            attributes["body_type"] = mapped_row.body_style
        if mapped_row.exterior_color:
            attributes["exterior_color"] = mapped_row.exterior_color
        if mapped_row.interior_color:
            attributes["interior_color"] = mapped_row.interior_color
        if mapped_row.title_status:
            attributes["title_status"] = mapped_row.title_status
        if mapped_row.title_state:
            attributes["title_state"] = mapped_row.title_state
        if mapped_row.fuel_type:
            attributes["fuel_type"] = mapped_row.fuel_type
        if mapped_row.transmission:
            attributes["transmission"] = mapped_row.transmission

        # Facebook-specific attributes
        if mapped_row.facebook_groups:
            attributes["facebook_groups"] = mapped_row.facebook_groups
        if mapped_row.label:
            attributes["label"] = mapped_row.label
        if mapped_row.publicado is not None:
            attributes["publicado"] = mapped_row.publicado

        # Always include VIN
        if mapped_row.vin:
            attributes["vin"] = mapped_row.vin
            # Auto-generate stock_number from last 6 digits of VIN
            attributes["stock_number"] = mapped_row.vin[-6:].upper()

        return attributes
