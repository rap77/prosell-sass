"""FEAT-1: catalog CSV export (FR8.1, FR8.2, FR8.4, FR8.5)."""

from prosell.domain.services.csv_export import (
    build_export_headers,
    build_export_row,
    build_image_folder_name,
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
