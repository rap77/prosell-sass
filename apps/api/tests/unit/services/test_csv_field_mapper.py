"""Unit tests for CSVFieldMapper — maps client CSV columns to ParsedProductRow fields."""

import pytest

from prosell.domain.services.csv_field_mapper import CSVFieldMapper


class TestLocationParsing:
    """Tests for location string parsing."""

    def test_parses_city_and_state_from_full_string(self):
        """Parse 'Orlando florida' into city='Orlando', state='FL'."""
        result = CSVFieldMapper.parse_location("Orlando florida")

        assert result.city == "Orlando"
        assert result.state == "FL"

    def test_parses_miami_florida(self):
        """Parse 'Miami florida' into city='Miami', state='FL'."""
        result = CSVFieldMapper.parse_location("Miami florida")

        assert result.city == "Miami"
        assert result.state == "FL"

    def test_parses_city_only_when_no_state(self):
        """Parse 'Orlando' (no state) returns city only."""
        result = CSVFieldMapper.parse_location("Orlando")

        assert result.city == "Orlando"
        assert result.state is None

    def test_strips_whitespace(self):
        """Whitespace is stripped from city and state."""
        result = CSVFieldMapper.parse_location("  Orlando florida  ")

        assert result.city == "Orlando"
        assert result.state == "FL"


class TestTitleStatusParsing:
    """Tests for clean_title field parsing."""

    def test_parses_clean_title_1_as_clean(self):
        """'1' maps to title_status='clean'."""
        result = CSVFieldMapper.parse_title_status("1")

        assert result.status == "clean"

    def test_parses_clean_title_0_as_rebuilt(self):
        """'0' maps to title_status='rebuilt'."""
        result = CSVFieldMapper.parse_title_status("0")

        assert result.status == "rebuilt"

    def test_parses_empty_as_none(self):
        """Empty string maps to title_status=None."""
        result = CSVFieldMapper.parse_title_status("")

        assert result.status is None

    def test_parses_none_as_none(self):
        """None maps to title_status=None."""
        result = CSVFieldMapper.parse_title_status(None)

        assert result.status is None


class TestFacebookGroupsParsing:
    """Tests for facebook_groups field parsing."""

    def test_parses_comma_separated_groups(self):
        """Comma-separated '1,2,3' parses into list."""
        result = CSVFieldMapper.parse_facebook_groups("1,2,3")

        assert result.groups == ["1", "2", "3"]

    def test_parses_single_group(self):
        """Single value '1' parses into single-item list."""
        result = CSVFieldMapper.parse_facebook_groups("1")

        assert result.groups == ["1"]

    def test_parses_empty_string_as_none(self):
        """Empty string returns None."""
        result = CSVFieldMapper.parse_facebook_groups("")

        assert result.groups is None

    def test_parses_none_as_none(self):
        """None returns None."""
        result = CSVFieldMapper.parse_facebook_groups(None)

        assert result.groups is None


class TestPublicadoParsing:
    """Tests for publicado boolean field parsing."""

    def test_parses_1_as_true(self):
        """'1' maps to True."""
        assert CSVFieldMapper.parse_publicado("1") is True

    def test_parses_0_as_false(self):
        """'0' maps to False."""
        assert CSVFieldMapper.parse_publicado("0") is False

    def test_parses_empty_as_false(self):
        """Empty string maps to False."""
        assert CSVFieldMapper.parse_publicado("") is False

    def test_parses_none_as_false(self):
        """None maps to False."""
        assert CSVFieldMapper.parse_publicado(None) is False


class TestMileageParsing:
    """Tests for mileage field parsing."""

    def test_parses_integer_mileage(self):
        """Integer mileage is parsed as float."""
        result = CSVFieldMapper.parse_mileage("70000")

        assert result.mileage == 70000.0
        assert result.unit == "miles"

    def test_parses_float_mileage(self):
        """Float mileage is parsed correctly."""
        result = CSVFieldMapper.parse_mileage("32500.5")

        assert result.mileage == 32500.5
        assert result.unit == "miles"

    def test_parses_empty_as_none(self):
        """Empty string returns None."""
        result = CSVFieldMapper.parse_mileage("")

        assert result.mileage is None

    def test_parses_none_as_none(self):
        """None returns None."""
        result = CSVFieldMapper.parse_mileage(None)

        assert result.mileage is None


class TestYearParsing:
    """Tests for year field parsing."""

    def test_parses_valid_year(self):
        """Valid year integer is parsed."""
        result = CSVFieldMapper.parse_year("2020")

        assert result.year == 2020

    def test_parses_empty_as_none(self):
        """Empty string returns None."""
        result = CSVFieldMapper.parse_year("")

        assert result.year is None

    def test_parses_none_as_none(self):
        """None returns None."""
        result = CSVFieldMapper.parse_year(None)

        assert result.year is None


class TestCSVFieldMapperMapRow:
    """Tests for CSVFieldMapper.map_row — maps a full CSV row dict to field values."""

    def test_maps_full_client_csv_row(self):
        """Full row with all client CSV columns maps correctly."""
        row = {
            "id": "527",
            "title": "DJ",
            "price": "17800",
            "category": "Vehiculos",
            "type": "Auto/camioneta",
            "location": "Orlando florida",
            "year": "2020",
            "make": "Ford",
            "model": "Explorer",
            "mileage": "70000",
            "body_style": "SUV",
            "exterior_color": "Gris",
            "interior_color": "Negro",
            "clean_title": "0",
            "state": "Muy bueno",
            "fuel_type": "Gasolina",
            "transmission": "Transmisión automática",
            "option": "make your appointment",
            "description": "FORD EXPLORER XLT",
            "path": (
                "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/MF/2020-EXPLORER-XLT-70K-GRIS-MF"
            ),
            "groups": "1,2,3",
            "label": "01/01/25",
            "publicado": "1",
            "VIN": "1FMSK7DH7LGA77418",
        }

        result = CSVFieldMapper.map_row(row, row_number=2)

        assert result.cod_dealer == "DJ"
        assert result.price_cents == 1780000
        assert result.location_city == "Orlando"
        assert result.location_state == "FL"
        assert result.year == 2020
        assert result.make == "Ford"
        assert result.model == "Explorer"
        assert result.mileage == 70000.0
        assert result.mileage_unit == "miles"
        assert result.body_style == "SUV"
        assert result.exterior_color == "Gris"
        assert result.interior_color == "Negro"
        assert result.title_status == "rebuilt"
        assert result.title_state == "Muy bueno"
        assert result.fuel_type == "Gasolina"
        assert result.transmission == "Transmisión automática"
        assert result.description == "FORD EXPLORER XLT"
        expected_image_path = (
            "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/MF/2020-EXPLORER-XLT-70K-GRIS-MF"
        )
        assert result.image_path == expected_image_path
        assert result.facebook_groups == ["1", "2", "3"]
        assert result.label == "01/01/25"
        assert result.publicado is True
        assert result.vin == "1FMSK7DH7LGA77418"

    def test_maps_minimal_row(self):
        """Row with only basic fields maps with defaults."""
        row = {
            "title": "DJ",
            "price": "17800",
            "location": "Orlando",
            "VIN": "1FMSK7DH7LGA77418",
        }

        result = CSVFieldMapper.map_row(row, row_number=2)

        assert result.cod_dealer == "DJ"
        assert result.price_cents == 1780000
        assert result.location_city == "Orlando"
        assert result.location_state is None
        assert result.year is None
        assert result.title_status is None
        assert result.publicado is False
        assert result.facebook_groups is None
        assert result.image_path is None

    def test_maps_publicado_empty_as_false(self):
        """publicado field empty maps to False."""
        row = {
            "title": "DJ",
            "price": "5000",
            "VIN": "1FMSK7DH7LGA77418",
            "publicado": "",
        }

        result = CSVFieldMapper.map_row(row, row_number=2)

        assert result.publicado is False

    def test_price_empty_raises_value_error(self):
        """Empty price raises ValueError — not silently defaults to 0."""
        row = {
            "title": "DJ",
            "price": "",
            "VIN": "1FMSK7DH7LGA77418",
        }

        with pytest.raises(ValueError, match="price is required"):
            CSVFieldMapper.map_row(row, row_number=1)

    def test_price_invalid_raises_value_error(self):
        """Invalid price string raises ValueError."""
        row = {
            "title": "DJ",
            "price": "not-a-number",
            "VIN": "1FMSK7DH7LGA77418",
        }

        with pytest.raises(ValueError, match="invalid price value"):
            CSVFieldMapper.map_row(row, row_number=1)

    def test_description_truncated_at_500_chars(self):
        """description field truncated at 500 chars with warning."""
        long_desc = "A" * 600
        row = {
            "title": "DJ",
            "price": "5000",
            "VIN": "1FMSK7DH7LGA77418",
            "description": long_desc,
        }

        result = CSVFieldMapper.map_row(row, row_number=1)

        assert result.description is not None
        assert len(result.description) == 500
        assert result.description == "A" * 500

    def test_text_fields_truncated_at_100_chars(self):
        """Short text fields (make, model, etc.) truncated at 100 chars."""
        long_value = "B" * 150
        row = {
            "title": "DJ",
            "price": "5000",
            "VIN": "1FMSK7DH7LGA77418",
            "make": long_value,
            "model": long_value,
        }

        result = CSVFieldMapper.map_row(row, row_number=1)

        assert result.make is not None
        assert result.model is not None
        assert len(result.make) == 100
        assert len(result.model) == 100

    def test_image_path_rejects_path_traversal(self):
        """image_path with '..' is rejected and set to None."""
        row = {
            "title": "DJ",
            "price": "5000",
            "VIN": "1FMSK7DH7LGA77418",
            "path": "../../../etc/passwd",
        }

        result = CSVFieldMapper.map_row(row, row_number=1)

        assert result.image_path is None

    def test_image_path_valid_passthrough(self):
        """Valid image_path passes through unchanged."""
        row = {
            "title": "DJ",
            "price": "5000",
            "VIN": "1FMSK7DH7LGA77418",
            "path": "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/MF/2020-EXPLORER",
        }

        result = CSVFieldMapper.map_row(row, row_number=1)

        expected_path = "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/MF/2020-EXPLORER"
        assert result.image_path == expected_path
