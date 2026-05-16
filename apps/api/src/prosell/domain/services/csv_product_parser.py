"""CSV Product Parser service for bulk product upload.

This service parses CSV files containing product data and validates
the content according to business rules.

Required columns: vin, title, price, category_id
Optional columns: description, condition, currency, location_city, location_state, location_zip,
attributes
"""

import csv
from dataclasses import dataclass
from io import StringIO
from typing import TYPE_CHECKING
from uuid import UUID

from prosell.domain.exceptions.product_exceptions import InvalidVINError
from prosell.domain.value_objects.product_condition import ProductCondition

if TYPE_CHECKING:
    from prosell.application.dto.product.create import CreateProductRequest


@dataclass
class ParsedProductRow:
    """Represents a successfully parsed product row from CSV."""

    row_number: int
    vin: str
    title: str
    price_cents: int
    category_id: UUID
    description: str | None = None
    condition: str = "used"  # Default to "used"
    currency: str = "USD"  # Default to "USD"
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None
    attributes: dict[str, object] | None = None

    def __post_init__(self):
        """Initialize attributes dict if None."""
        if self.attributes is None:
            self.attributes = {}

    def to_create_product_request(
        self,
        tenant_id: UUID,
        organization_id: UUID,
    ) -> "CreateProductRequest":
        """
        Convert ParsedProductRow to CreateProductRequest DTO.

        Args:
            tenant_id: Tenant ID for the product
            organization_id: Organization ID for the product

        Returns:
            CreateProductRequest DTO ready for use case
        """
        # Import here to avoid circular dependency
        from prosell.application.dto.product.create import CreateProductRequest

        # Merge VIN into attributes (attributes is guaranteed to be dict after __post_init__)
        current_attributes: dict[str, object] = self.attributes or {}
        attributes_with_vin: dict[str, object] = {**current_attributes, "vin": self.vin}

        # Map condition string to ProductCondition enum
        condition_enum = ProductCondition(self.condition)

        return CreateProductRequest(
            title=self.title,
            price_cents=self.price_cents,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=self.category_id,
            description=self.description,
            condition=condition_enum,
            currency=self.currency,
            location_city=self.location_city,
            location_state=self.location_state,
            location_zip=self.location_zip,
            attributes=attributes_with_vin,
        )


@dataclass
class CSVParseResult:
    """Result of CSV parsing operation."""

    total_rows: int
    products: list[ParsedProductRow]
    failed_count: int
    errors: list[dict[str, str | int]]


class CSVParseError(Exception):
    """Raised when CSV parsing fails at the file level."""

    pass


class CSVProductParser:
    """
    Service for parsing CSV files containing product data.

    Features:
    - Validates required columns
    - Validates VIN format
    - Detects duplicate VINs within CSV
    - Converts price from dollars to cents
    - Continues parsing after row errors (partial failure handling)
    - Enforces row limits
    """

    def __init__(
        self,
        required_columns: set[str] | None = None,
        max_rows: int = 1000,
    ) -> None:
        """
        Initialize CSV parser.

        Args:
            required_columns: Set of required column names (default: vin, title, price, category_id)
            max_rows: Maximum number of data rows allowed (excluding header)
        """
        self.required_columns = required_columns or {"vin", "title", "price", "category_id"}
        self.max_rows = max_rows

    async def parse_csv(
        self,
        csv_content: str,
        tenant_id: UUID,  # noqa: ARG002
        organization_id: UUID,  # noqa: ARG002
    ) -> CSVParseResult:
        """
        Parse CSV content and extract product data.

        Args:
            csv_content: CSV file content as string
            tenant_id: Tenant ID for all products
            organization_id: Organization ID for all products

        Returns:
            CSVParseResult with parsed products and any errors

        Raises:
            CSVParseError: If CSV file structure is invalid
        """
        csv_file = StringIO(csv_content)

        # Validate columns first
        column_errors = self._validate_columns(csv_file)
        if column_errors:
            raise CSVParseError(f"CSV validation failed: {'; '.join(column_errors)}")

        # Reset file pointer for reading
        csv_file.seek(0)

        # Parse CSV
        reader = csv.DictReader(csv_file)
        rows = list(reader)

        # Check row limit
        if len(rows) > self.max_rows:
            raise CSVParseError(
                f"Too many rows: {len(rows)} exceeds maximum of {self.max_rows}"
            )

        # Track seen VINs for duplicate detection
        seen_vins: set[str] = set()

        products: list[ParsedProductRow] = []
        errors: list[dict[str, str | int]] = []

        for idx, row in enumerate(rows, start=2):  # Start at 2 (1 is header)
            try:
                # Validate and parse row
                product = self._parse_row(
                    row=row,
                    row_number=idx,
                    seen_vins=seen_vins,
                )
                if product:
                    products.append(product)
                    seen_vins.add(product.vin)

            except (InvalidVINError, ValueError, KeyError) as e:
                error_dict: dict[str, str | int] = {
                    "row_number": idx,
                    "vin": row.get("vin", "N/A"),
                    "error": str(e),
                }
                errors.append(error_dict)

        return CSVParseResult(
            total_rows=len(rows),
            products=products,
            failed_count=len(errors),
            errors=errors,
        )

    def _validate_columns(self, csv_file: StringIO) -> list[str]:
        """
        Validate that required columns are present.

        Args:
            csv_file: CSV file object

        Returns:
            List of error messages (empty if valid)
        """
        # Read header row
        reader = csv.DictReader(csv_file)
        if reader.fieldnames is None:
            return ["Empty CSV file"]

        present_columns = set(reader.fieldnames)
        missing_columns = self.required_columns - present_columns

        errors: list[str] = []
        if missing_columns:
            errors.append(f"Missing required columns: {', '.join(sorted(missing_columns))}")

        return errors

    def _parse_row(
        self,
        row: dict[str, str],
        row_number: int,
        seen_vins: set[str],
    ) -> ParsedProductRow:
        """
        Parse a single CSV row into ParsedProductRow.

        Args:
            row: Dictionary of column values
            row_number: Row number for error reporting
            seen_vins: Set of VINs seen so far (for duplicate detection)

        Returns:
            ParsedProductRow

        Raises:
            InvalidVINError: If VIN is invalid
            ValueError: If price is invalid
            KeyError: If required field is missing
        """
        # Extract and validate VIN
        vin = row["vin"].strip()
        if not self._is_valid_vin_format(vin):
            raise InvalidVINError(vin, "Invalid VIN format")

        # Check for duplicate VIN
        if vin in seen_vins:
            raise ValueError(f"Duplicate VIN in CSV: {vin}")

        # Extract required fields
        title = row["title"].strip()
        price_str = row["price"].strip()
        category_id_str = row["category_id"].strip()

        # Validate and convert price
        try:
            price_dollars = float(price_str)
            if price_dollars < 0:
                raise ValueError("Price cannot be negative")
            # Round to nearest cent to avoid floating point precision issues
            price_cents = round(price_dollars * 100)
        except ValueError as e:
            raise ValueError(f"Invalid price format: {price_str}") from e

        # Validate category_id UUID
        try:
            category_id = UUID(category_id_str)
        except ValueError as e:
            raise ValueError(f"Invalid category_id UUID: {category_id_str}") from e

        # Extract optional fields
        description = row.get("description", "").strip() or None
        condition = row.get("condition", "used").strip() or "used"
        currency = row.get("currency", "USD").strip() or "USD"
        location_city = row.get("location_city", "").strip() or None
        location_state = row.get("location_state", "").strip() or None
        location_zip = row.get("location_zip", "").strip() or None

        # Parse attributes JSON if present
        attributes: dict[str, object] = {}
        attributes_str = row.get("attributes", "").strip()
        if attributes_str:
            import json
            try:
                attributes = json.loads(attributes_str)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid attributes JSON: {e}") from e

        return ParsedProductRow(
            row_number=row_number,
            vin=vin,
            title=title,
            price_cents=price_cents,
            category_id=category_id,
            description=description,
            condition=condition,
            currency=currency,
            location_city=location_city,
            location_state=location_state,
            location_zip=location_zip,
            attributes=attributes,
        )

    def _is_valid_vin_format(self, vin: str) -> bool:
        """
        Validate VIN format.

        VIN must be exactly 17 characters and contain only valid characters
        (excluding I, O, Q to avoid confusion with numbers).

        Args:
            vin: Vehicle Identification Number to validate

        Returns:
            True if VIN format is valid, False otherwise
        """
        if not vin or len(vin) != 17:
            return False

        # Check for invalid characters (I, O, Q)
        invalid_chars = {"I", "O", "Q"}
        if any(char in invalid_chars for char in vin.upper()):
            return False

        # Check for alphanumeric characters only
        return vin.upper().isalnum()
