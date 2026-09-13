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
# from a dedicated product field (id, cod_dealer, price, description),
# hardcodes as a business rule (option, publicado), or takes as an already
# -resolved explicit parameter (category, type, location, VIN, body_style,
# clean_title, state, groups, path — u1-cross-org-export-api, FR7). Those 9
# columns used to be misread straight from `attributes` under a matching key
# that doesn't exist on the product model (the FR7 bug); the caller now
# resolves each of them (from `attributes` under its REAL key, from
# dedicated `Product` fields, or via `category_translation.py`) and passes
# them in already resolved. `exterior_color` is the FR2.3/BR2.3
# regression-fix key: it must read `attributes["exterior_color"]`, never a
# legacy `attrs.get("color")`.
_CLIENT_FORMAT_ATTRIBUTE_COLUMNS: frozenset[str] = frozenset(
    {
        "year",
        "make",
        "model",
        "mileage",
        "exterior_color",
        "interior_color",
        "fuel_type",
        "transmission",
        "label",
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
    row_id: int,
    org_code: object | None,
    price_cents: int,
    description: str | None,
    attributes: Mapping[str, object],
    vin: str | None = None,
    body_style: str | None = None,
    title_status: str | None = None,
    facebook_groups: list[str] | None = None,
    facebook_groups_fallback: str = "",
    state: str | None = None,
    category: str | None = None,
    vehicle_type: str | None = None,
    location_city: str | None = None,
    location_state: str | None = None,
    path: str = "",
) -> list[str]:
    """Build one row of the client-format CSV (u1-catalog-export-api).

    `row_id` is a 1-based sequential position within the export (the
    caller assigns it, incrementing only for rows that actually make it
    into the file — BR1.7 exclusions never consume a number), matching
    the plain small integers the client's own reference CSV uses in its
    `id` column — never the product's internal database UUID.

    Most column values not covered by a dedicated product field still come
    directly from `attributes` under the same column name (BR1.3 "mapeo
    directo de atributos"). Nine columns are the FR7 exception: `category`,
    `type`, `location`, `VIN`, `body_style`, `clean_title`, `state`,
    `groups` and `path` are NOT read from `attributes` under a matching key
    (that key doesn't exist on the product model) — the caller resolves
    each one and passes it in explicitly:

    - `vin`/`body_style`/`state` — the caller reads them from `attributes`
      under their REAL key (`vin`, `body_type`, `title_state` — BR1.5,
      BR1.6, BR1.8).
    - `title_status` — the caller reads `attributes["title_status"]`; this
      function derives `clean_title` from it with the INVERSE mapping of
      `CSVFieldMapper.parse_title_status()` (BR1.1): `"clean"` -> `"1"`,
      `"rebuilt"` -> `"0"`, anything else (including `None`) -> `""`.
    - `facebook_groups`/`facebook_groups_fallback` — `groups` is
      `",".join(facebook_groups)` when non-empty, else
      `facebook_groups_fallback` (BR1.2/BR2.7).
    - `category`/`vehicle_type` (CSV column `type`) — the caller resolves
      these via `category_translation.resolve_client_category_type()`
      (BR1.3); this function never talks to a category repository.
    - `location_city`/`location_state` — dedicated `Product` fields (not
      `attributes`); combined here as `"{city} {state}".strip()` (BR1.4).
    - `path` — the caller builds it with `build_client_format_path()`
      (BR2.6) and passes the finished string.

    `option` is always empty — the original value isn't persisted in the
    product model (FR1.4, BR1.4). `publicado` is always "1" — this function
    is only ever called for `published` products (BR1.1), which is exactly
    what the sample client CSV encodes with a literal "1" in that column.
    """
    if title_status == "clean":
        clean_title = "1"
    elif title_status == "rebuilt":
        clean_title = "0"
    else:
        clean_title = ""

    groups = ",".join(facebook_groups) if facebook_groups else facebook_groups_fallback

    location = f"{location_city or ''} {location_state or ''}".strip()

    values: dict[str, object | None] = {
        "id": row_id,
        "cod_dealer": org_code,
        "price": f"{price_cents / 100:.2f}",
        "description": description,
        "option": "",
        "publicado": "1",
        "VIN": vin,
        "body_style": body_style,
        "clean_title": clean_title,
        "groups": groups,
        "state": state,
        "category": category,
        "type": vehicle_type,
        "location": location,
        "path": path,
    }
    for column in _CLIENT_FORMAT_ATTRIBUTE_COLUMNS:
        values[column] = attributes.get(column)

    return [
        "" if values.get(column) is None else str(values[column])
        for column in CLIENT_FORMAT_COLUMNS
    ]


def build_client_format_path(
    base_folder: str, org_code: str | None, product_folder_name: str
) -> str:
    """FR8.4, BR2.6 — carpeta base confirmada + código de organización del
    producto + nombre de carpeta del producto (`build_vehicle_zip_folder_name()`'s
    inner segment, not the full two-level ZIP path)."""
    return f"{base_folder}{org_code or ''}/{product_folder_name}"


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
