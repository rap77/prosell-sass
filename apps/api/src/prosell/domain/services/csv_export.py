"""Catalog CSV export — FEAT-1.

Mirrors the column set/order of the bulk-upload CSV template
(`csv_product_parser.UNIVERSAL_COLUMNS_ORDERED` + the same extra product
columns) so a seller can round-trip export → edit → re-import. Adds one
column with the relative path to each product's image folder.
"""

import re
from collections.abc import Mapping

# Same "extra" product-level columns the import template exposes —
# duplicated here (not imported) because the router already keeps this list
# beside the template endpoint; kept identical intentionally.
EXTRA_PRODUCT_COLUMNS: tuple[str, ...] = (
    "description",
    "condition",
    "currency",
    "location_city",
    "location_state",
    "location_zip",
)

IMAGE_FOLDER_COLUMN = "image_folder_path"

_SLUG_RE = re.compile(r"[^A-Z0-9]+")


def _slug_part(value: object | None) -> str | None:
    """Uppercase a value and collapse anything non-alphanumeric to `-`."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    slug = _SLUG_RE.sub("-", text.upper()).strip("-")
    return slug or None


def build_image_folder_name(
    *,
    year: object | None,
    make: object | None,
    model: object | None,
    mileage: object | None,
    color: object | None,
    org_code: object | None,
) -> str:
    """Build the image folder name for one product (FR8.4).

    Pattern: {AÑO}-{MARCA}-{MODELO}-{MILLAS_EN_K}K-{COLOR}-{CÓDIGO_ORG},
    uppercase, hyphen-separated (e.g. "2017-CHEVROLET-SPARK-128K-BLANCO-DK").
    A part with no value is dropped rather than leaving a stray "--".

    Note: the intent's own worked example ("2017-SPARK-128K-BLANCO-DK") omits
    the MARCA segment the stated pattern includes — implemented per the
    literal pattern (more information preserved); flagged for confirmation.
    """
    miles_k: str | None = None
    if isinstance(mileage, int | float):
        miles_k = f"{int(mileage) // 1000}K"

    parts = [
        _slug_part(year),
        _slug_part(make),
        _slug_part(model),
        miles_k,
        _slug_part(color),
        _slug_part(org_code),
    ]
    return "-".join(p for p in parts if p)


def build_export_headers(schema_keys: list[str], known_columns: frozenset[str]) -> list[str]:
    """Column order for the export CSV — universal + extra + category
    attributes (same rule as the import template) + the image folder column.
    """
    from prosell.domain.services.csv_product_parser import UNIVERSAL_COLUMNS_ORDERED

    return (
        list(UNIVERSAL_COLUMNS_ORDERED)
        + list(EXTRA_PRODUCT_COLUMNS)
        + [k for k in schema_keys if k not in known_columns]
        + [IMAGE_FOLDER_COLUMN]
    )


def build_export_row(
    *,
    headers: list[str],
    title: str,
    price_cents: int,
    category_id: object,
    description: str | None,
    condition: str,
    currency: str,
    location_city: str | None,
    location_state: str | None,
    location_zip: str | None,
    attributes: Mapping[str, object],
    image_folder_path: str,
) -> list[str]:
    """Render one product as a CSV row matching `headers`' column order."""
    universal_and_extra: dict[str, object | None] = {
        "title": title,
        "price": price_cents / 100,
        "category_id": str(category_id),
        "description": description,
        "condition": condition,
        "currency": currency,
        "location_city": location_city,
        "location_state": location_state,
        "location_zip": location_zip,
        IMAGE_FOLDER_COLUMN: image_folder_path,
    }
    row: list[str] = []
    for header in headers:
        if header in universal_and_extra:
            value = universal_and_extra[header]
        else:
            value = attributes.get(header)
        row.append("" if value is None else str(value))
    return row
