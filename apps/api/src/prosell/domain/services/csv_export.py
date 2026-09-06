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


# The 24 exact columns of the client-format CSV (u1-catalog-export-api,
# FR1.3/BR1.3) — structurally identical to docs/data39.csv: same header,
# same order, ';' separator. Unlike `build_export_headers()` above (the
# FEAT-1 generic export, whose column set is derived per-category from
# `attribute_schema`), this header is a fixed constant — the whole point
# of this format is byte-for-byte compatibility with an external tool.
CLIENT_FORMAT_COLUMNS: tuple[str, ...] = (
    "id",
    "cod_dealer",
    "price",
    "category",
    "type",
    "location",
    "year",
    "make",
    "model",
    "mileage",
    "body_style",
    "exterior_color",
    "interior_color",
    "clean_title",
    "state",
    "fuel_type",
    "transmission",
    "option",
    "description",
    "path",
    "groups",
    "label",
    "publicado",
    "VIN",
)

# Columns sourced directly from `attributes` (same key as the column
# name) — every column except the ones this function derives explicitly
# from a dedicated product field (id, cod_dealer, price, description) or
# hardcodes as a business rule (option, publicado). `exterior_color` is
# the FR2.3/BR2.3 regression-fix key: it must read `attributes["exterior_color"]`,
# never a legacy `attrs.get("color")`.
_CLIENT_FORMAT_ATTRIBUTE_COLUMNS: frozenset[str] = frozenset(
    {
        "category",
        "type",
        "location",
        "year",
        "make",
        "model",
        "mileage",
        "body_style",
        "exterior_color",
        "interior_color",
        "clean_title",
        "state",
        "fuel_type",
        "transmission",
        "path",
        "groups",
        "label",
        "VIN",
    }
)


def build_organization_code_segment(org_code: object | None) -> str:
    """Sanitized organization-code path segment for the export ZIP (BR2.2).

    Falls back to the literal placeholder "sin-codigo" when the
    organization has no code (`Organization.code` is `str | None`,
    1-5 characters) — never an empty path segment.
    """
    return _slug_part(org_code) or "sin-codigo"


def build_client_format_row(
    *,
    product_id: object,
    org_code: object | None,
    price_cents: int,
    description: str | None,
    attributes: Mapping[str, object],
) -> list[str]:
    """Build one row of the client-format CSV (u1-catalog-export-api).

    Column values not covered by a dedicated product field come directly
    from `attributes` under the same column name (BR1.3 "mapeo directo de
    atributos"). `option` is always empty — the original value isn't
    persisted in the product model (FR1.4, BR1.4). `publicado` is always
    "1" — this function is only ever called for `published` products
    (BR1.1), which is exactly what the sample client CSV encodes with a
    literal "1" in that column.
    """
    values: dict[str, object | None] = {
        "id": product_id,
        "cod_dealer": org_code,
        "price": f"{price_cents / 100:.2f}",
        "description": description,
        "option": "",
        "publicado": "1",
    }
    for column in _CLIENT_FORMAT_ATTRIBUTE_COLUMNS:
        values[column] = attributes.get(column)

    return [
        "" if values.get(column) is None else str(values[column])
        for column in CLIENT_FORMAT_COLUMNS
    ]


def build_vehicle_zip_folder_name(
    *,
    year: object | None,
    make: object | None,
    model: object | None,
    mileage: object | None,
    color: object | None,
    org_code: object | None,
) -> str:
    """Full two-level ZIP folder path for one vehicle's images (BR2.1, BR2.2).

    Pattern: `{org_segment}/{year}-{make}-{model}-{mileage_k}-{color}-{org_segment}/`
    — reuses `build_image_folder_name()` for the inner segment (no
    duplicated sanitization logic, FR2.4) and prepends the sanitized
    organization-code segment as its own top-level ZIP directory.
    """
    org_segment = build_organization_code_segment(org_code)
    inner_name = build_image_folder_name(
        year=year,
        make=make,
        model=model,
        mileage=mileage,
        color=color,
        org_code=org_code,
    )
    return f"{org_segment}/{inner_name}/"


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
