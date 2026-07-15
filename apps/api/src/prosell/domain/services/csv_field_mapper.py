"""CSV Field Mapper — maps client CSV columns to ParsedProductRow fields.

This module handles all field-level conversions from the client CSV format
(23 columns, semicolon-separated) to the internal ProSell model fields.

Conversions include:
- Location parsing: "Orlando florida" -> city="Orlando", state="FL"
- Title status: "1" -> "clean", "0" -> "rebuilt"
- Facebook groups: "1,2,3" -> ["1", "2", "3"]
- Mileage: str -> float (miles)
- Year: str -> int
- Publicado: "1"/""/None -> bool
"""

import logging
from dataclasses import dataclass
from typing import Literal

from prosell.domain.base import ValueObject

logger = logging.getLogger(__name__)

# =============================================================================
# INPUT VALIDATION CONSTANTS
# =============================================================================

MAX_SHORT_TEXT_LENGTH = 100
MAX_LONG_TEXT_LENGTH = 500


def _truncate(value: str | None, max_length: int, field_name: str, row_number: int) -> str | None:
    """Truncate text field to max_length and log warning."""
    if value is None:
        return None
    assert isinstance(value, str), f"expected str, got {type(value)}"
    if len(value) > max_length:
        logger.warning(
            "Row %d: %s exceeded max length %d (%d chars) — truncating",
            row_number,
            field_name,
            max_length,
            len(value),
        )
        return value[:max_length]
    return value


def _sanitize_path(value: str | None, field_name: str, row_number: int) -> str | None:
    """Sanitize path field: reject path traversal attempts and empty strings."""
    if value is None:
        return None
    if not value:
        return None
    if ".." in value:
        logger.warning(
            "Row %d: %s contains path traversal '..' — rejecting",
            row_number,
            field_name,
        )
        return None
    return value


# =============================================================================
# RESULT VALUE OBJECTS
# =============================================================================


class LocationParseResult(ValueObject):
    """Result of parsing a location string."""

    city: str | None
    state: str | None


class TitleStatusResult(ValueObject):
    """Result of parsing a clean_title field."""

    status: Literal["clean", "rebuilt"] | None


class FacebookGroupsResult(ValueObject):
    """Result of parsing a facebook_groups field."""

    groups: list[str] | None


class MileageParseResult(ValueObject):
    """Result of parsing a mileage field."""

    mileage: float | None
    unit: Literal["miles", "km"] = "miles"


class YearParseResult(ValueObject):
    """Result of parsing a year field."""

    year: int | None


@dataclass
class MappedCSVRow:
    """Result of mapping a full CSV row.

    All fields from the client CSV mapped to internal field names and types.
    """

    # Required fields first (no defaults)
    row_number: int
    vin: str
    cod_organization: str
    price_cents: int

    # Optional fields (all with defaults to satisfy Python ordering)
    location_city: str | None = None
    location_state: str | None = None
    year: int | None = None
    make: str | None = None
    model: str | None = None
    mileage: float | None = None
    mileage_unit: Literal["miles", "km"] = "miles"
    body_style: str | None = None
    exterior_color: str | None = None
    interior_color: str | None = None
    title_status: Literal["clean", "rebuilt"] | None = None
    title_state: str | None = None
    fuel_type: str | None = None
    transmission: str | None = None
    description: str | None = None
    image_path: str | None = None
    facebook_groups: list[str] | None = None
    label: str | None = None
    publicado: bool = False


# =============================================================================
# STATE MAPPING (known state strings -> title_state values)
# =============================================================================

_STATE_ABBREV_TO_CODE: dict[str, str] = {
    "fl": "FL",
    "florida": "FL",
    "or": "OR",
    "oregon": "OR",
}


# =============================================================================
# CSV FIELD MAPPER
# =============================================================================


class CSVFieldMapper:
    """Static methods for mapping client CSV columns to internal fields."""

    @staticmethod
    def parse_location(location: str | None) -> LocationParseResult:
        """Parse location string into city and state.

        Args:
            location: Location string like "Orlando florida" or "Orlando"

        Returns:
            LocationParseResult with city and state
        """
        if not location:
            return LocationParseResult(city=None, state=None)

        location = location.strip()
        parts = location.rsplit(" ", 1)

        if len(parts) == 2:
            city, state_str = parts
            state_str_lower = state_str.lower()
            state = _STATE_ABBREV_TO_CODE.get(state_str_lower, state_str)
            return LocationParseResult(city=city.strip(), state=state)
        else:
            return LocationParseResult(city=location, state=None)

    @staticmethod
    def parse_title_status(clean_title: str | None) -> TitleStatusResult:
        """Parse clean_title field.

        Args:
            clean_title: "1"=clean, "0"=rebuilt, ""=None

        Returns:
            TitleStatusResult with status
        """
        if not clean_title:
            return TitleStatusResult(status=None)

        stripped = clean_title.strip()
        if stripped == "1":
            return TitleStatusResult(status="clean")
        elif stripped == "0":
            return TitleStatusResult(status="rebuilt")
        return TitleStatusResult(status=None)

    @staticmethod
    def parse_facebook_groups(groups: str | None) -> FacebookGroupsResult:
        """Parse facebook_groups field.

        Args:
            groups: Comma-separated group IDs like "1,2,3"

        Returns:
            FacebookGroupsResult with list of groups or None
        """
        if not groups:
            return FacebookGroupsResult(groups=None)

        groups = groups.strip()
        if not groups:
            return FacebookGroupsResult(groups=None)

        return FacebookGroupsResult(groups=[g.strip() for g in groups.split(",") if g.strip()])

    @staticmethod
    def parse_publicado(publicado: str | None) -> bool:
        """Parse publicado boolean field.

        Args:
            publicado: "1"=True, "0"/""/None=False

        Returns:
            bool
        """
        if not publicado:
            return False
        return publicado.strip() == "1"

    @staticmethod
    def parse_mileage(mileage: str | None) -> MileageParseResult:
        """Parse mileage field.

        Args:
            mileage: Mileage as string (e.g., "70000")

        Returns:
            MileageParseResult with float value and unit
        """
        if not mileage:
            return MileageParseResult(mileage=None)

        mileage = mileage.strip()
        if not mileage:
            return MileageParseResult(mileage=None)

        try:
            return MileageParseResult(mileage=float(mileage), unit="miles")
        except ValueError:
            return MileageParseResult(mileage=None)

    @staticmethod
    def parse_year(year: str | None) -> YearParseResult:
        """Parse year field.

        Args:
            year: Year as string (e.g., "2020")

        Returns:
            YearParseResult with int value or None
        """
        if not year:
            return YearParseResult(year=None)

        year = year.strip()
        if not year:
            return YearParseResult(year=None)

        try:
            return YearParseResult(year=int(year))
        except ValueError:
            return YearParseResult(year=None)

    @staticmethod
    def map_row(row: dict[str, str], row_number: int) -> MappedCSVRow:
        """Map a full client CSV row dict to MappedCSVRow.

        Args:
            row: Dictionary of column values from client CSV
            row_number: Row number for error reporting

        Returns:
            MappedCSVRow with all fields mapped
        """
        # Parse individual fields
        location = CSVFieldMapper.parse_location(row.get("location"))
        title_status = CSVFieldMapper.parse_title_status(row.get("clean_title"))
        facebook_groups = CSVFieldMapper.parse_facebook_groups(row.get("groups"))
        mileage_result = CSVFieldMapper.parse_mileage(row.get("mileage"))
        year_result = CSVFieldMapper.parse_year(row.get("year"))

        # Parse price — fail fast on invalid price (0 cents is invalid product)
        price_str = row.get("price", "").strip()
        if not price_str:
            raise ValueError(f"Row {row_number}: price is required, got empty value")
        try:
            price_cents = round(float(price_str) * 100)
        except ValueError:
            raise ValueError(f"Row {row_number}: invalid price value {price_str!r}") from None

        return MappedCSVRow(
            row_number=row_number,
            vin=row.get("VIN", "").strip(),
            cod_organization=_truncate(
                row.get("title", "").strip(), MAX_SHORT_TEXT_LENGTH, "cod_organization", row_number
            )
            or "",
            price_cents=price_cents,
            location_city=location.city,
            location_state=location.state,
            year=year_result.year,
            make=_truncate(row.get("make", "").strip(), MAX_SHORT_TEXT_LENGTH, "make", row_number),
            model=_truncate(
                row.get("model", "").strip(), MAX_SHORT_TEXT_LENGTH, "model", row_number
            ),
            mileage=mileage_result.mileage,
            mileage_unit=mileage_result.unit,
            body_style=_truncate(
                row.get("body_style", "").strip(), MAX_SHORT_TEXT_LENGTH, "body_style", row_number
            ),
            exterior_color=_truncate(
                row.get("exterior_color", "").strip(),
                MAX_SHORT_TEXT_LENGTH,
                "exterior_color",
                row_number,
            ),
            interior_color=_truncate(
                row.get("interior_color", "").strip(),
                MAX_SHORT_TEXT_LENGTH,
                "interior_color",
                row_number,
            ),
            title_status=title_status.status,
            title_state=_truncate(
                row.get("state", "").strip(), MAX_SHORT_TEXT_LENGTH, "title_state", row_number
            ),
            fuel_type=_truncate(
                row.get("fuel_type", "").strip(), MAX_SHORT_TEXT_LENGTH, "fuel_type", row_number
            ),
            transmission=_truncate(
                row.get("transmission", "").strip(),
                MAX_SHORT_TEXT_LENGTH,
                "transmission",
                row_number,
            ),
            description=_truncate(
                row.get("description", "").strip(), MAX_LONG_TEXT_LENGTH, "description", row_number
            ),
            image_path=_sanitize_path(row.get("path", "").strip(), "image_path", row_number),
            facebook_groups=facebook_groups.groups,
            label=_truncate(
                row.get("label", "").strip(), MAX_SHORT_TEXT_LENGTH, "label", row_number
            ),
            publicado=CSVFieldMapper.parse_publicado(row.get("publicado")),
        )
