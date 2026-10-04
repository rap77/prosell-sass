"""Shared declarative table of vehicle-attribute fields read off a MappedCSVRow.

Backend decomposition Stage 3.3 / 1.3: `bulk_upload_vehicles.py`'s
`_build_attributes` and `bulk_upload_preview.py`'s `_analyze_row` independently
iterated the same ~14 vehicle fields off the same `MappedCSVRow` — one building
the persisted `Product.attributes` dict, the other building the preview's
`mapped_fields` dict — with zero shared code. That duplication had already
silently diverged: the preview only showed `attributes.publicado` when truthy,
while the import's `is not None` check is vacuously always true (`publicado` is
a plain `bool`, never `None`) — so the import always persists `publicado`
(True or False) while the preview hid it for every row that didn't explicitly
set it `True`. Decided with the team: both sides now always include it, since
that's what the import actually persists.

VIN, stock_number, cod_org/title, price_cents, description, location_city, and
location_state stay OUT of this table on purpose — they're either top-level DTO
fields (not part of `attributes`), derived values with no 1:1 CSV field
(`stock_number`), or carry caller-specific control flow beyond simple presence
(VIN drives a required-field error in the preview).
"""

from collections.abc import Callable
from dataclasses import dataclass

from prosell.domain.services.csv_field_mapper import MappedCSVRow

VehicleAttributeValue = str | int | float | bool | list[str]


@dataclass(frozen=True)
class VehicleAttributeField:
    """One row of the table: which `MappedCSVRow` field, under what
    `attributes` key, and when it's considered present."""

    source_attr: str
    attr_key: str
    is_present: Callable[[MappedCSVRow], bool]
    value: Callable[[MappedCSVRow], VehicleAttributeValue] | None = None

    def extract(self, row: MappedCSVRow) -> VehicleAttributeValue:
        if self.value is not None:
            return self.value(row)
        return getattr(row, self.source_attr)


def _truthy(attr: str) -> Callable[[MappedCSVRow], bool]:
    return lambda row: bool(getattr(row, attr))


def _not_none(attr: str) -> Callable[[MappedCSVRow], bool]:
    return lambda row: getattr(row, attr) is not None


def _always_present(_row: MappedCSVRow) -> bool:
    return True


VEHICLE_ATTRIBUTE_FIELDS: tuple[VehicleAttributeField, ...] = (
    VehicleAttributeField("year", "year", _not_none("year")),
    VehicleAttributeField("make", "make", _truthy("make")),
    VehicleAttributeField("model", "model", _truthy("model")),
    VehicleAttributeField("mileage", "mileage", _not_none("mileage")),
    VehicleAttributeField(
        "mileage_unit",
        "mileage_unit",
        _not_none("mileage"),
        value=lambda row: row.mileage_unit,
    ),
    VehicleAttributeField("body_style", "body_type", _truthy("body_style")),
    VehicleAttributeField("exterior_color", "exterior_color", _truthy("exterior_color")),
    VehicleAttributeField("interior_color", "interior_color", _truthy("interior_color")),
    VehicleAttributeField("clean_title", "clean_title", _not_none("clean_title")),
    VehicleAttributeField("vehicle_condition", "vehicle_condition", _truthy("vehicle_condition")),
    VehicleAttributeField("fuel_type", "fuel_type", _truthy("fuel_type")),
    VehicleAttributeField("transmission", "transmission", _truthy("transmission")),
    VehicleAttributeField("facebook_groups", "facebook_groups", _truthy("facebook_groups")),
    VehicleAttributeField("label", "label", _truthy("label")),
    # publicado is a plain bool (never None) — always persisted/previewed,
    # True or False. See module docstring for the divergence this fixed.
    VehicleAttributeField("publicado", "publicado", _always_present),
)


def extract_vehicle_attributes(row: MappedCSVRow) -> dict[str, VehicleAttributeValue]:
    """Build the persisted-attributes shape: bare keys (e.g. `"body_type"`)."""
    return {
        field.attr_key: field.extract(row)
        for field in VEHICLE_ATTRIBUTE_FIELDS
        if field.is_present(row)
    }


def extract_vehicle_attribute_preview_fields(
    row: MappedCSVRow,
) -> dict[str, VehicleAttributeValue]:
    """Build the preview shape: `attributes.`-prefixed keys (e.g.
    `"attributes.body_type"`), otherwise identical to `extract_vehicle_attributes`."""
    return {
        f"attributes.{field.attr_key}": field.extract(row)
        for field in VEHICLE_ATTRIBUTE_FIELDS
        if field.is_present(row)
    }
