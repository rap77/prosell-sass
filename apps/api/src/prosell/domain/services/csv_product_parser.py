"""Schema-aware CSV Product Parser.

Validates CSV rows against a category's attribute_schema fetched from the
repository. Universal columns (title, price, category_id) are always required.
All other CSV columns go into the product's `attributes` dict and are
validated (type + required) against the schema.
"""

import csv
from dataclasses import dataclass, field
from io import StringIO
from typing import TYPE_CHECKING
from uuid import UUID

if TYPE_CHECKING:
    from prosell.domain.repositories.category_repository import AbstractCategoryRepository

UNIVERSAL_COLUMNS = {"title", "price", "category_id"}
KNOWN_PRODUCT_COLUMNS = {
    "description",
    "condition",
    "currency",
    "location_city",
    "location_state",
    "location_zip",
}
ALL_KNOWN_COLUMNS = UNIVERSAL_COLUMNS | KNOWN_PRODUCT_COLUMNS


@dataclass
class CSVRowError:
    """Per-row parse/validation error."""

    row_number: int
    column: str | None  # e.g. "attributes.vin", "price", or None (row-level)
    message: str
    raw_row: dict[str, str]


@dataclass
class ParsedProductRow:
    """A successfully parsed product row from CSV."""

    row_number: int
    title: str
    price_cents: int
    category_id: UUID
    description: str | None = None
    condition: str = "used"
    currency: str = "USD"
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None
    attributes: dict[str, object] = field(default_factory=dict)


@dataclass
class CSVParseResult:
    """Result of CSV parsing operation."""

    total_rows: int
    products: list[ParsedProductRow]
    failed_count: int
    errors: list[CSVRowError]


class CSVParseError(Exception):
    """Raised for file-level failures: bad structure, multi-category, unknown category."""

    pass


class CSVProductParser:
    """Schema-aware CSV parser for bulk product upload.

    Fetches the category's attribute_schema from the repository (one query
    per unique category_id in the file) and validates every non-universal
    column against it. The file must contain exactly one unique category_id.
    """

    def __init__(
        self,
        category_repository: "AbstractCategoryRepository",
        max_rows: int = 5000,
    ) -> None:
        self._category_repository = category_repository
        self.max_rows = max_rows

    async def parse_csv(
        self,
        csv_content: str,
        tenant_id: UUID,
        organization_id: UUID,  # noqa: ARG002 — kept for interface compat
    ) -> CSVParseResult:
        csv_file = StringIO(csv_content)

        column_errors = self._validate_columns(csv_file)
        if column_errors:
            raise CSVParseError(f"CSV validation failed: {'; '.join(column_errors)}")

        csv_file.seek(0)
        reader = csv.DictReader(csv_file)
        rows = list(reader)

        if len(rows) > self.max_rows:
            raise CSVParseError(f"Too many rows: {len(rows)} exceeds maximum of {self.max_rows}")

        # Collect unique category_ids from the CSV (ignore empty)
        category_id_strs: set[str] = set()
        for row in rows:
            cid = (row.get("category_id") or "").strip()
            if cid:
                category_id_strs.add(cid)

        if len(category_id_strs) > 1:
            raise CSVParseError(
                f"CSV contains multiple categories: {', '.join(sorted(category_id_strs))}. "
                "Split into separate CSVs, one per category."
            )

        # Load schema for the single category
        schemas: dict[UUID, dict] = {}
        for cid_str in category_id_strs:
            try:
                cid = UUID(cid_str)
            except ValueError as exc:
                raise CSVParseError(f"Invalid category_id UUID: {cid_str!r}") from exc

            category = await self._category_repository.get_by_id_or_global(cid, tenant_id)
            if not category:
                raise CSVParseError(f"Unknown category_id: {cid_str!r}")
            schemas[cid] = category.attribute_schema or {}

        products: list[ParsedProductRow] = []
        all_errors: list[CSVRowError] = []

        for idx, row in enumerate(rows, start=2):
            cid_str = (row.get("category_id") or "").strip()
            try:
                cid = UUID(cid_str)
            except (ValueError, AttributeError):
                all_errors.append(
                    CSVRowError(
                        row_number=idx,
                        column="category_id",
                        message=f"Invalid category_id UUID: {cid_str!r}",
                        raw_row={k: (v or "") for k, v in row.items()},
                    )
                )
                continue

            schema = schemas.get(cid, {})
            product, row_errors = self._parse_row(row=row, row_number=idx, schema=schema)
            if row_errors:
                all_errors.extend(row_errors)
            elif product:
                products.append(product)

        return CSVParseResult(
            total_rows=len(rows),
            products=products,
            failed_count=len(all_errors),
            errors=all_errors,
        )

    def _validate_columns(self, csv_file: StringIO) -> list[str]:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames is None:
            return ["Empty CSV file"]
        present = set(reader.fieldnames)
        missing = UNIVERSAL_COLUMNS - present
        return [f"Missing required columns: {', '.join(sorted(missing))}"] if missing else []

    def _parse_row(
        self,
        row: dict[str, str | None],
        row_number: int,
        schema: dict,
    ) -> tuple["ParsedProductRow | None", list[CSVRowError]]:
        errors: list[CSVRowError] = []
        raw = {k: (v or "") for k, v in row.items()}

        # Universal fields
        title = (row.get("title") or "").strip()
        if not title:
            errors.append(
                CSVRowError(
                    row_number=row_number,
                    column="title",
                    message="title is required and cannot be empty",
                    raw_row=raw,
                )
            )

        price_str = (row.get("price") or "").strip()
        price_cents = 0
        try:
            price_dollars = float(price_str)
            if price_dollars < 0:
                raise ValueError("Price cannot be negative")
            price_cents = round(price_dollars * 100)
        except (ValueError, TypeError):
            errors.append(
                CSVRowError(
                    row_number=row_number,
                    column="price",
                    message=f"Invalid price: {price_str!r}",
                    raw_row=raw,
                )
            )

        category_id_str = (row.get("category_id") or "").strip()
        category_id: UUID | None = None
        try:
            category_id = UUID(category_id_str)
        except (ValueError, AttributeError):
            errors.append(
                CSVRowError(
                    row_number=row_number,
                    column="category_id",
                    message=f"Invalid category_id UUID: {category_id_str!r}",
                    raw_row=raw,
                )
            )

        if errors:
            return None, errors

        # Attribute columns (non-universal, non-known-product)
        attributes: dict[str, object] = {}
        for col_name, col_value in row.items():
            if col_name in ALL_KNOWN_COLUMNS:
                continue
            value_str = (col_value or "").strip()
            if not value_str:
                continue
            if col_name in schema:
                field_type = str(schema[col_name].get("type", "string"))
                try:
                    attributes[col_name] = self._coerce_value(col_name, value_str, field_type)
                except ValueError as e:
                    errors.append(
                        CSVRowError(
                            row_number=row_number,
                            column=f"attributes.{col_name}",
                            message=str(e),
                            raw_row=raw,
                        )
                    )
            else:
                attributes[col_name] = value_str

        # Required schema fields check
        for field_name, field_def in schema.items():
            if field_def.get("required", False) and field_name not in attributes:
                errors.append(
                    CSVRowError(
                        row_number=row_number,
                        column=f"attributes.{field_name}",
                        message=f"Required attribute '{field_name}' is missing",
                        raw_row=raw,
                    )
                )

        if errors:
            return None, errors

        assert category_id is not None  # guaranteed by early return above
        return (
            ParsedProductRow(
                row_number=row_number,
                title=title,
                price_cents=price_cents,
                category_id=category_id,
                description=(row.get("description") or "").strip() or None,
                condition=(row.get("condition") or "used").strip() or "used",
                currency=(row.get("currency") or "USD").strip() or "USD",
                location_city=(row.get("location_city") or "").strip() or None,
                location_state=(row.get("location_state") or "").strip() or None,
                location_zip=(row.get("location_zip") or "").strip() or None,
                attributes=attributes,
            ),
            [],
        )

    @staticmethod
    def _coerce_value(col_name: str, value: str, field_type: str) -> object:
        """Coerce a CSV string to the schema-declared type. Raises ValueError on failure."""
        if field_type == "number":
            try:
                return float(value)
            except (ValueError, TypeError) as exc:
                raise ValueError(f"Column '{col_name}' must be a number, got: {value!r}") from exc
        if field_type == "boolean":
            if value.lower() in ("true", "1", "yes"):
                return True
            if value.lower() in ("false", "0", "no"):
                return False
            raise ValueError(
                f"Column '{col_name}' must be boolean (true/false/1/0/yes/no), got: {value!r}"
            )
        return value  # string, array, object, or unknown → keep as string
