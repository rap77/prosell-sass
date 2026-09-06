"""FEAT-1: catalog CSV export (FR8.1, FR8.2, FR8.4, FR8.5).

Also covers u1-catalog-export-api (client-format CSV + image ZIP export):
BR1.3/BR1.4 (`build_client_format_row`), BR2.1/BR2.2/BR2.4
(`build_organization_code_segment`, `build_vehicle_zip_folder_name`), and
the BR2.3 regression fix (color read from `exterior_color`, never a
legacy `color` key) as it manifests through `build_image_folder_name()`
with the real attribute key.
"""

from prosell.domain.services.csv_export import (
    CLIENT_FORMAT_COLUMNS,
    build_client_format_row,
    build_export_headers,
    build_export_row,
    build_image_folder_name,
    build_organization_code_segment,
    build_vehicle_zip_folder_name,
)
from prosell.domain.services.csv_product_parser import (
    ALL_KNOWN_COLUMNS,
    UNIVERSAL_COLUMNS_ORDERED,
)


def test_build_image_folder_name_matches_intent_pattern() -> None:
    # FR8.4 — {AÑO}-{MARCA}-{MODELO}-{MILLAS_EN_K}K-{COLOR}-{CÓDIGO_ORG}
    name = build_image_folder_name(
        year=2017,
        make="Chevrolet",
        model="Spark",
        mileage=128000,
        color="Blanco",
        org_code="DK",
    )
    assert name == "2017-CHEVROLET-SPARK-128K-BLANCO-DK"


def test_build_image_folder_name_drops_missing_parts() -> None:
    name = build_image_folder_name(
        year=2017, make=None, model="Spark", mileage=None, color="Blanco", org_code="DK"
    )
    assert name == "2017-SPARK-BLANCO-DK"


def test_export_headers_match_import_template_order() -> None:
    # FR8.1/FR8.2 — export and the existing import template must derive their
    # column order from the same UNIVERSAL_COLUMNS_ORDERED source of truth.
    schema_keys = ["make", "model", "year", "custom_attr"]
    extra_cols = [
        "description",
        "condition",
        "currency",
        "location_city",
        "location_state",
        "location_zip",
    ]
    template_headers = (
        list(UNIVERSAL_COLUMNS_ORDERED)
        + extra_cols
        + [k for k in schema_keys if k not in ALL_KNOWN_COLUMNS]
    )
    export_headers = build_export_headers(schema_keys, ALL_KNOWN_COLUMNS)

    # Export headers = template headers (same order, same source) + the one
    # extra image-folder column FR8.5 requires.
    assert export_headers[: len(template_headers)] == template_headers
    assert export_headers[-1] == "image_folder_path"


def test_export_row_includes_image_folder_path_column() -> None:
    # FR8.5
    headers = build_export_headers(["make"], ALL_KNOWN_COLUMNS)
    row = build_export_row(
        headers=headers,
        title="2017 Chevrolet Spark",
        price_cents=500000,
        category_id="cat-1",
        description=None,
        condition="used",
        currency="USD",
        location_city=None,
        location_state=None,
        location_zip=None,
        attributes={"make": "Chevrolet"},
        image_folder_path="2017-CHEVROLET-SPARK-128K-BLANCO-DK",
    )
    assert row[headers.index("image_folder_path")] == "2017-CHEVROLET-SPARK-128K-BLANCO-DK"
    assert row[headers.index("title")] == "2017 Chevrolet Spark"


# ── u1-catalog-export-api: BR2.3 regression — real attribute key ────────────


def test_build_image_folder_name_uses_real_exterior_color_key() -> None:
    """FR2.3/BR2.3 — the color segment must come from `exterior_color`
    (the real attribute key on a vehicle product), never a legacy `color`
    key that doesn't exist on the product model. `build_image_folder_name()`
    itself is a pure function of whatever `color` it's given — the actual
    regression lived at the `export_catalog_csv()` call site (fixed in
    `product_router.py`), so this test pins the function's contract for
    the real key so a future caller can't silently regress it back to a
    "color" lookup that would just return None (see the wrong-key case
    below).
    """
    attrs = {"year": 2020, "make": "Ford", "model": "Explorer", "mileage": 70000}
    name = build_image_folder_name(
        year=attrs["year"],
        make=attrs["make"],
        model=attrs["model"],
        mileage=attrs["mileage"],
        color=attrs.get("exterior_color", "Gris"),  # real key present on the product
        org_code="MF",
    )
    assert "GRIS" in name.split("-")


def test_build_image_folder_name_wrong_color_key_drops_segment() -> None:
    """Sanity check for the regression: looking up the WRONG key (`color`,
    which doesn't exist on the product model) silently drops the color
    segment instead of raising — exactly the "silent failure" symptom
    FR2.3 fixes at the call site.
    """
    attrs = {"exterior_color": "Gris"}
    name = build_image_folder_name(
        year=2020,
        make="Ford",
        model="Explorer",
        mileage=70000,
        color=attrs.get("color"),  # wrong key — always None on a real product
        org_code="MF",
    )
    assert "GRIS" not in name


# ── u1-catalog-export-api: BR1.3/BR1.4 client-format CSV row ────────────────


def test_client_format_columns_match_data39_header() -> None:
    # FR1.3/BR1.3 — header and order identical to docs/data39.csv
    assert CLIENT_FORMAT_COLUMNS == (
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


def test_build_client_format_row_option_always_empty() -> None:
    # FR1.4/BR1.4 — option is always exported empty
    row = build_client_format_row(
        product_id="527",
        org_code="MF",
        price_cents=1780000,
        description="Some description",
        attributes={"exterior_color": "Gris"},
    )
    assert row[CLIENT_FORMAT_COLUMNS.index("option")] == ""


def test_build_client_format_row_description_populated() -> None:
    # FR1.4/BR1.4 — description carries the product's saved value
    row = build_client_format_row(
        product_id="527",
        org_code="MF",
        price_cents=1780000,
        description="make your appointment",
        attributes={},
    )
    assert row[CLIENT_FORMAT_COLUMNS.index("description")] == "make your appointment"


def test_build_client_format_row_exterior_color_from_attributes() -> None:
    # BR2.3 — the exterior_color column reads the real attribute key
    row = build_client_format_row(
        product_id="527",
        org_code="MF",
        price_cents=1780000,
        description=None,
        attributes={"exterior_color": "Gris"},
    )
    assert row[CLIENT_FORMAT_COLUMNS.index("exterior_color")] == "Gris"


def test_build_client_format_row_publicado_always_one() -> None:
    row = build_client_format_row(
        product_id="527",
        org_code="MF",
        price_cents=1780000,
        description=None,
        attributes={},
    )
    assert row[CLIENT_FORMAT_COLUMNS.index("publicado")] == "1"


def test_build_client_format_row_missing_attribute_renders_empty() -> None:
    row = build_client_format_row(
        product_id="527",
        org_code="MF",
        price_cents=1780000,
        description=None,
        attributes={},
    )
    assert row[CLIENT_FORMAT_COLUMNS.index("VIN")] == ""


# ── u1-catalog-export-api: BR2.2 Organization.code edge cases ───────────────


def test_build_organization_code_segment_one_char() -> None:
    assert build_organization_code_segment("M") == "M"


def test_build_organization_code_segment_five_chars() -> None:
    assert build_organization_code_segment("MFDLR") == "MFDLR"


def test_build_organization_code_segment_none_falls_back_to_placeholder() -> None:
    # stories.md AC1.1.8 — literal placeholder, not an empty segment
    assert build_organization_code_segment(None) == "sin-codigo"


# ── u1-catalog-export-api: BR2.1/BR2.2 ZIP folder path ───────────────────────


def test_build_vehicle_zip_folder_name_full_pattern() -> None:
    name = build_vehicle_zip_folder_name(
        year=2020, make="Ford", model="Explorer", mileage=70000, color="Gris", org_code="MF"
    )
    assert name == "MF/2020-FORD-EXPLORER-70K-GRIS-MF/"


def test_build_vehicle_zip_folder_name_uses_placeholder_for_missing_org_code() -> None:
    name = build_vehicle_zip_folder_name(
        year=2020, make="Ford", model="Explorer", mileage=70000, color="Gris", org_code=None
    )
    assert name == "sin-codigo/2020-FORD-EXPLORER-70K-GRIS/"
