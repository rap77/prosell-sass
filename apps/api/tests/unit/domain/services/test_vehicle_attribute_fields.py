"""Tests for the shared vehicle-attribute field table — backend decomposition
Stage 3.3 / 1.3.

Covers the real finding this extraction fixes: bulk_upload_vehicles.py's
_build_attributes and bulk_upload_preview.py's _analyze_row independently
iterated the same ~14 vehicle fields with zero shared code, and had already
silently diverged on `publicado` (import always persists it via a vacuous
`is not None` check — `publicado` is a plain `bool`, never `None` — while the
preview only showed it when truthy). Decided: both sides now always include
`publicado`, matching what the import actually persists.
"""

from prosell.domain.services.csv_field_mapper import MappedCSVRow
from prosell.domain.services.vehicle_attribute_fields import (
    extract_vehicle_attribute_preview_fields,
    extract_vehicle_attributes,
)


def _make_row(**overrides) -> MappedCSVRow:
    defaults: dict = {
        "row_number": 1,
        "vin": "1HGCM82633A123456",
        "cod_organization": "ORG1",
        "price_cents": 1_000_000,
    }
    defaults.update(overrides)
    return MappedCSVRow(**defaults)


class TestExtractVehicleAttributes:
    """The import-side shape: bare keys."""

    def test_empty_row_has_no_optional_fields_except_publicado(self):
        row = _make_row()

        attributes = extract_vehicle_attributes(row)

        assert attributes == {"publicado": False}

    def test_year_present_when_not_none(self):
        row = _make_row(year=2020)
        assert extract_vehicle_attributes(row)["year"] == 2020

    def test_year_absent_when_none(self):
        row = _make_row(year=None)
        assert "year" not in extract_vehicle_attributes(row)

    def test_make_present_when_truthy(self):
        row = _make_row(make="Toyota")
        assert extract_vehicle_attributes(row)["make"] == "Toyota"

    def test_make_absent_when_empty_string(self):
        row = _make_row(make="")
        assert "make" not in extract_vehicle_attributes(row)

    def test_mileage_includes_companion_mileage_unit(self):
        row = _make_row(mileage=12_345.0, mileage_unit="km")

        attributes = extract_vehicle_attributes(row)

        assert attributes["mileage"] == 12_345.0
        assert attributes["mileage_unit"] == "km"

    def test_mileage_unit_absent_when_mileage_is_none(self):
        row = _make_row(mileage=None)
        attributes = extract_vehicle_attributes(row)
        assert "mileage" not in attributes
        assert "mileage_unit" not in attributes

    def test_body_style_maps_to_body_type_key(self):
        row = _make_row(body_style="SUV")
        attributes = extract_vehicle_attributes(row)
        assert attributes["body_type"] == "SUV"
        assert "body_style" not in attributes

    def test_clean_title_present_when_explicitly_false(self):
        """is not None, not truthy — False must still be included."""
        row = _make_row(clean_title=False)
        assert extract_vehicle_attributes(row)["clean_title"] is False

    def test_clean_title_absent_when_none(self):
        row = _make_row(clean_title=None)
        assert "clean_title" not in extract_vehicle_attributes(row)

    def test_publicado_always_present_even_when_false(self):
        """Regression guard for the fixed divergence: publicado is a plain
        bool (never None), so it is always persisted — True or False."""
        row = _make_row(publicado=False)
        assert extract_vehicle_attributes(row)["publicado"] is False

    def test_publicado_present_when_true(self):
        row = _make_row(publicado=True)
        assert extract_vehicle_attributes(row)["publicado"] is True

    def test_facebook_groups_present_when_non_empty(self):
        row = _make_row(facebook_groups=["group-a", "group-b"])
        assert extract_vehicle_attributes(row)["facebook_groups"] == ["group-a", "group-b"]

    def test_facebook_groups_absent_when_empty_list(self):
        row = _make_row(facebook_groups=[])
        assert "facebook_groups" not in extract_vehicle_attributes(row)

    def test_all_fields_present(self):
        row = _make_row(
            year=2020,
            make="Toyota",
            model="Camry",
            mileage=50_000.0,
            mileage_unit="miles",
            body_style="Sedan",
            exterior_color="Red",
            interior_color="Black",
            clean_title=True,
            vehicle_condition="used",
            fuel_type="gasoline",
            transmission="automatic",
            facebook_groups=["group-a"],
            label="Featured",
            publicado=True,
        )

        attributes = extract_vehicle_attributes(row)

        assert attributes == {
            "year": 2020,
            "make": "Toyota",
            "model": "Camry",
            "mileage": 50_000.0,
            "mileage_unit": "miles",
            "body_type": "Sedan",
            "exterior_color": "Red",
            "interior_color": "Black",
            "clean_title": True,
            "vehicle_condition": "used",
            "fuel_type": "gasoline",
            "transmission": "automatic",
            "facebook_groups": ["group-a"],
            "label": "Featured",
            "publicado": True,
        }

    def test_never_includes_vin_stock_number_or_cod_org(self):
        """VIN/stock_number/cod_org stay out of this table on purpose — they
        have caller-specific handling (required-field errors, derived
        values, top-level DTO fields) that doesn't fit a simple presence
        table."""
        row = _make_row(vin="1HGCM82633A123456", cod_organization="ORG1")

        attributes = extract_vehicle_attributes(row)

        assert "vin" not in attributes
        assert "stock_number" not in attributes
        assert "cod_org" not in attributes


class TestExtractVehicleAttributePreviewFields:
    """The preview-side shape: `attributes.<key>`-prefixed, otherwise identical."""

    def test_namespaces_every_key_with_attributes_prefix(self):
        row = _make_row(make="Toyota", body_style="SUV")

        preview_fields = extract_vehicle_attribute_preview_fields(row)

        assert preview_fields["attributes.make"] == "Toyota"
        assert preview_fields["attributes.body_type"] == "SUV"

    def test_publicado_always_present_matching_the_import_side(self):
        """The fixed divergence: the preview used to hide this unless True."""
        row = _make_row(publicado=False)
        assert extract_vehicle_attribute_preview_fields(row)["attributes.publicado"] is False


class TestImportAndPreviewAgreeFieldForField:
    """Direct regression guard for the finding itself: for every field this
    table covers, the import side and the preview side must agree on
    presence and value (modulo the `attributes.` key prefix) — no consumer
    can silently diverge from the other again."""

    def test_agree_on_a_fully_populated_row(self):
        row = _make_row(
            year=2020,
            make="Toyota",
            model="Camry",
            mileage=50_000.0,
            body_style="Sedan",
            exterior_color="Red",
            interior_color="Black",
            clean_title=True,
            vehicle_condition="used",
            fuel_type="gasoline",
            transmission="automatic",
            facebook_groups=["group-a"],
            label="Featured",
            publicado=True,
        )

        attributes = extract_vehicle_attributes(row)
        preview_fields = extract_vehicle_attribute_preview_fields(row)

        assert len(attributes) == len(preview_fields)
        for key, value in attributes.items():
            assert preview_fields[f"attributes.{key}"] == value

    def test_agree_on_a_mostly_empty_row(self):
        row = _make_row()

        attributes = extract_vehicle_attributes(row)
        preview_fields = extract_vehicle_attribute_preview_fields(row)

        assert len(attributes) == len(preview_fields)
        for key, value in attributes.items():
            assert preview_fields[f"attributes.{key}"] == value
