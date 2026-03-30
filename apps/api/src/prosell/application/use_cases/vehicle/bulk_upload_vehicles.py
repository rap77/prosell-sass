"""Bulk upload vehicles from CSV use case."""

import csv
import io
from uuid import UUID

from prosell.application.dto.vehicle.bulk_upload import (
    BulkUploadError,
    BulkUploadResponse,
    VehicleCSVRow,
)
from prosell.domain.entities.product import Product
from prosell.domain.entities.vehicle import Vehicle
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.repositories.vehicle_repository import AbstractVehicleRepository


class BulkUploadVehiclesUseCase:
    """
    Bulk upload vehicles from CSV.

    CSV format:
    vin,year,make,model,trim,mileage,price,condition,exterior_color,interior_color,
    transmission,fuel_type,body_style,drivetrain,engine,cylinders,description

    Process:
    1. Parse CSV rows
    2. Validate each row
    3. Create Product for each valid vehicle
    4. Create Vehicle entity
    5. Bulk insert to database
    6. Return summary with errors

    All-or-nothing: If any row fails validation, no vehicles are created.
    """

    def __init__(
        self,
        vehicle_repo: AbstractVehicleRepository,
        product_repo: AbstractProductRepository,
    ) -> None:
        """
        Initialize use case.

        Args:
            vehicle_repo: Vehicle repository
            product_repo: Product repository
        """
        self.vehicle_repo = vehicle_repo
        self.product_repo = product_repo

    async def execute(
        self,
        csv_content: str,
        tenant_id: UUID,
        default_organization_id: UUID,
    ) -> BulkUploadResponse:
        """
        Execute bulk upload from CSV content.

        Args:
            csv_content: Raw CSV file content as string
            tenant_id: Tenant ID for products
            default_organization_id: Default organization ID for products

        Returns:
            BulkUploadResponse with created count and errors

        Raises:
            ValueError: If CSV format is invalid
        """
        # Parse CSV
        rows = self._parse_csv(csv_content)

        # Validate all rows first (fail fast)
        validated_vehicles: list[tuple[VehicleCSVRow, dict]] = []
        errors: list[BulkUploadError] = []

        for row_number, row_dict in rows:
            try:
                # Validate and parse row
                csv_row = VehicleCSVRow(**row_dict)

                # Check for duplicate VINs in the batch
                if any(v[0].vin == csv_row.vin for v in validated_vehicles):
                    errors.append(
                        BulkUploadError(
                            row_number=row_number,
                            vin=csv_row.vin,
                            error="Duplicate VIN in CSV",
                            field="vin",
                        )
                    )
                    continue

                # Check if VIN already exists in database
                existing_vehicle = await self.vehicle_repo.get_by_vin(csv_row.vin)
                if existing_vehicle:
                    errors.append(
                        BulkUploadError(
                            row_number=row_number,
                            vin=csv_row.vin,
                            error="VIN already exists in database",
                            field="vin",
                        )
                    )
                    continue

                # Validate VIN checksum
                try:
                    Vehicle.create(
                        product_id=UUID("00000000-0000-0000-0000-000000000000"),  # temp
                        vin=csv_row.vin,
                    )
                except ValueError as e:
                    errors.append(
                        BulkUploadError(
                            row_number=row_number,
                            vin=csv_row.vin,
                            error=str(e),
                            field="vin",
                        )
                    )
                    continue

                validated_vehicles.append((csv_row, row_dict))

            except ValueError as e:
                # Extract field name from error message if possible
                error_msg = str(e)
                field = None
                if "vin" in error_msg.lower():
                    field = "vin"
                elif "year" in error_msg.lower():
                    field = "year"
                elif "mileage" in error_msg.lower():
                    field = "mileage"
                elif "price" in error_msg.lower():
                    field = "price"

                # Get VIN from row for error reporting
                vin = row_dict.get("vin", "UNKNOWN")

                errors.append(
                    BulkUploadError(
                        row_number=row_number,
                        vin=vin,
                        error=error_msg,
                        field=field,
                    )
                )

        # If there are any validation errors, fail entirely
        if errors:
            return BulkUploadResponse(
                total_rows=len(rows),
                created_count=0,
                failed_count=len(errors),
                errors=errors,
            )

        # All rows validated - create products and vehicles
        created_vehicles: list[Vehicle] = []

        for csv_row, _row_dict in validated_vehicles:
            # Create product
            product = Product.create(
                tenant_id=tenant_id,
                organization_id=default_organization_id,
                title=f"{csv_row.year or ''} {csv_row.make or ''} {csv_row.model or ''}".strip()
                or "Vehicle",
                description=csv_row.description or "",
            )

            created_product = await self.product_repo.create(product)

            # Create vehicle
            vehicle_data = {
                "vin": csv_row.vin,
                "year": csv_row.year,
                "make": csv_row.make,
                "model": csv_row.model,
                "trim": csv_row.trim,
                "mileage": csv_row.mileage,
                "exterior_color": csv_row.exterior_color,
                "interior_color": csv_row.interior_color,
                "transmission": csv_row.transmission,
                "fuel_type": csv_row.fuel_type,
                "body_type": csv_row.body_style,
                "drivetrain": csv_row.drivetrain,
                "engine": csv_row.engine,
            }

            vehicle = Vehicle.create(
                product_id=created_product.id,
                **vehicle_data,
            )

            created_vehicle = await self.vehicle_repo.create(vehicle)
            created_vehicles.append(created_vehicle)

        return BulkUploadResponse(
            total_rows=len(rows),
            created_count=len(created_vehicles),
            failed_count=0,
            errors=[],
        )

    def _parse_csv(self, csv_content: str) -> list[tuple[int, dict]]:
        """
        Parse CSV content into list of (row_number, row_dict).

        Args:
            csv_content: Raw CSV string

        Returns:
            List of (row_number, row_dict) tuples

        Raises:
            ValueError: If CSV format is invalid
        """
        try:
            # Use DictReader to parse CSV
            csv_file = io.StringIO(csv_content)
            reader = csv.DictReader(csv_file)

            # Validate required columns
            if not reader.fieldnames:
                raise ValueError("CSV has no columns")

            required_columns = {"vin"}
            missing_columns = required_columns - set(reader.fieldnames or [])
            if missing_columns:
                raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

            # Parse rows
            rows: list[tuple[int, dict]] = []
            for row_number, row_dict in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                if row_dict:  # Skip empty rows
                    rows.append((row_number, row_dict))

            if not rows:
                raise ValueError("CSV has no data rows")

            return rows

        except csv.Error as e:
            raise ValueError(f"Invalid CSV format: {e}") from None
