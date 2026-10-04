"""Characterization tests for normalize_nhtsa_value — backend decomposition
Stage 2.3. Worst single function in the entire backend by complexity (F=63,
radon), with ZERO existing test coverage before this change. Pins current
behavior for every field_type's dict-hit path and fallback branches, so a
future Strategy-dispatch refactor (the plan's Stage 2.3 (a)/(b), out of scope
for this pass) has a safety net.

Note: the inline comment at the dict-lookup site claims the lookup is
"case-insensitive para NHTSA", but `NHTSA_TO_FACEBOOK.get(cleaned)` never
lowercases/uppercases `cleaned` first — the lookup is actually
case-SENSITIVE. In practice this is low-risk (the real NHTSA VPIC API always
returns uppercase Make values, matching the dict's keys), but the comment is
misleading and the exact-casing requirement is pinned explicitly below
rather than silently "fixed" into real case-insensitivity, which would be a
behavior change beyond this pass's scope.
"""

import pytest

from prosell.infrastructure.services.nhtsa_normalizer import normalize_nhtsa_value


class TestEmptyInput:
    def test_none_returns_none(self):
        assert normalize_nhtsa_value(None, "make") is None

    def test_empty_string_returns_none(self):
        assert normalize_nhtsa_value("", "make") is None

    def test_whitespace_only_returns_none(self):
        assert normalize_nhtsa_value("   ", "make") is None


class TestDictHits:
    """Spot-check exact-match dict lookups across every category in
    NHTSA_TO_FACEBOOK, not an exhaustive sweep of all 129 entries."""

    @pytest.mark.parametrize(
        ("raw", "field_type", "expected"),
        [
            ("CHEVROLET", "make", "Chevrolet"),
            ("BMW", "make", "BMW"),
            ("MERCEDES-BENZ", "make", "Mercedes-Benz"),
            ("Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)", "body_type", "SUV"),
            ("Sedan/Saloon", "body_type", "Sedán"),
            ("Pickup", "body_type", "Camioneta"),
            ("Front-Wheel Drive", "drivetrain", "FWD"),
            ("All-Wheel Drive", "drivetrain", "AWD"),
            ("Automatic", "transmission", "Transmisión automática"),
            ("Manual", "transmission", "Transmisión manual"),
            ("Gasoline", "fuel_type", "Gasolina"),
            ("Diesel", "fuel_type", "Diésel"),
            ("BEV (Battery Electric Vehicle)", "electrification", "BEV"),
            ("Short Wheel Base", "wheelbase_type", "Corta"),
            ("Crew Cab", "cab_type", "Doble cabina"),
        ],
    )
    def test_exact_dict_match(self, raw, field_type, expected):
        assert normalize_nhtsa_value(raw, field_type) == expected

    def test_leading_trailing_whitespace_is_stripped_before_lookup(self):
        assert normalize_nhtsa_value("  CHEVROLET  ", "make") == "Chevrolet"

    def test_dict_lookup_is_case_sensitive_despite_the_misleading_comment(self):
        """Regression guard for the finding in this file's module docstring:
        lowercase input never matches the dict's uppercase MAKE keys, so it
        falls through to the "make" fallback branch (return cleaned as-is)."""
        assert normalize_nhtsa_value("chevrolet", "make") == "chevrolet"
        assert normalize_nhtsa_value("CHEVROLET", "make") == "Chevrolet"


class TestMakeFallback:
    def test_unknown_make_returns_the_cleaned_value_unchanged(self):
        assert normalize_nhtsa_value("Some New Brand", "make") == "Some New Brand"


class TestBodyTypeFallback:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("Crossover SUV thing", "SUV"),
            ("sport utility special", "SUV"),
            ("Family sedan", "Sedán"),
            ("Heavy pickup", "Camioneta"),
            ("Box truck", "Camioneta"),
            ("Sports coupe", "Coupé"),
            ("3-door hatchback", "Hatchback"),
            ("convertible special", "Convertible"),
            ("cabriolet edition", "Convertible"),
            ("station wagon", "Familiar"),
            ("country estate", "Familiar"),
            ("family minivan", "Miniván"),
            ("mpv model", "Miniván"),
        ],
    )
    def test_keyword_match(self, raw, expected):
        assert normalize_nhtsa_value(raw, "body_type") == expected

    def test_unrecognized_body_type_defaults_to_otro(self):
        assert normalize_nhtsa_value("Spaceship", "body_type") == "Otro"


class TestDrivetrainFallback:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("front wheel special", "FWD"),
            ("fwd-ish", "FWD"),
            ("rear drive", "RWD"),
            ("rwd setup", "RWD"),
            ("all terrain", "AWD"),
            ("awd system", "AWD"),
            ("four by four", "4WD"),
            ("4wd pack", "4WD"),
            ("4x4 edition", "4WD"),
        ],
    )
    def test_keyword_match(self, raw, expected):
        assert normalize_nhtsa_value(raw, "drivetrain") == expected

    def test_unrecognized_drivetrain_returns_cleaned_uppercased(self):
        assert normalize_nhtsa_value("mystery", "drivetrain") == "MYSTERY"


class TestTransmissionFallback:
    def test_manual_keyword_matches(self):
        assert normalize_nhtsa_value("5-speed manual special", "transmission") == (
            "Transmisión manual"
        )

    def test_anything_else_defaults_to_automatica(self):
        assert normalize_nhtsa_value("Some Weird Gearbox", "transmission") == (
            "Transmisión automática"
        )


class TestFuelTypeFallback:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("gasoline special", "Gasolina"),
            ("premium gas", "Gasolina"),
            ("diesel power", "Diésel"),
            ("electric drive", "Eléctrico"),
            ("hybrid power", "Híbrido"),
            ("plug option", "Híbrido eléctrico enchufable"),
            ("flex option", "Flexible"),
        ],
    )
    def test_keyword_match(self, raw, expected):
        assert normalize_nhtsa_value(raw, "fuel_type") == expected

    def test_unrecognized_fuel_type_defaults_to_gasolina(self):
        """Note the asymmetry with other branches: this one's catch-all is
        NOT a neutral "Otro" — it's "Gasolina", the most common fuel type."""
        assert normalize_nhtsa_value("Mystery Fuel", "fuel_type") == "Gasolina"


class TestElectrificationFallback:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("bev special", "BEV"),
            ("battery electric special", "BEV"),
            ("phev special", "PHEV"),
            ("plug-in hybrid special", "PHEV"),
            ("mild hybrid special", "Híbrido ligero"),
            ("hybrid special", "Híbrido"),
            ("hev special", "Híbrido"),
        ],
    )
    def test_keyword_match(self, raw, expected):
        assert normalize_nhtsa_value(raw, "electrification") == expected

    def test_unrecognized_electrification_defaults_to_ninguno(self):
        assert normalize_nhtsa_value("Mystery", "electrification") == "Ninguno"


class TestBooleanFallback:
    @pytest.mark.parametrize("raw", ["yes", "Y", "TRUE", "1", "y"])
    def test_truthy_values_map_to_true_string(self, raw):
        assert normalize_nhtsa_value(raw, "boolean") == "true"

    @pytest.mark.parametrize("raw", ["no", "N", "false", "0", "whatever"])
    def test_everything_else_maps_to_false_string(self, raw):
        assert normalize_nhtsa_value(raw, "boolean") == "false"


class TestWheelbaseTypeFallback:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("short special", "Corta"),
            ("swb edition", "Corta"),
            ("long special", "Larga"),
            ("lwb edition", "Larga"),
            ("extended edition", "Larga"),
        ],
    )
    def test_keyword_match(self, raw, expected):
        assert normalize_nhtsa_value(raw, "wheelbase_type") == expected

    def test_unrecognized_defaults_to_estandar(self):
        assert normalize_nhtsa_value("mystery", "wheelbase_type") == "Estándar"


class TestBedTypeFallback:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [("short bed special", "Corta"), ("long bed special", "Larga")],
    )
    def test_keyword_match(self, raw, expected):
        assert normalize_nhtsa_value(raw, "bed_type") == expected

    def test_unrecognized_defaults_to_estandar(self):
        assert normalize_nhtsa_value("mystery", "bed_type") == "Estándar"


class TestCabTypeFallback:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("crew special", "Doble cabina"),
            ("double special", "Doble cabina"),
            ("quad special", "Doble cabina"),
            ("mega special", "Doble cabina"),
            ("extended special", "Extendida"),
            ("super special", "Extendida"),
            ("king special", "Extendida"),
            ("access special", "Extendida"),
        ],
    )
    def test_keyword_match(self, raw, expected):
        assert normalize_nhtsa_value(raw, "cab_type") == expected

    def test_unrecognized_defaults_to_regular(self):
        assert normalize_nhtsa_value("mystery", "cab_type") == "Regular"


class TestUnhandledFieldType:
    """field_type values matching no elif branch fall through to the bare
    bottom default: return cleaned, untouched — not even uppercased."""

    def test_unknown_field_type_returns_cleaned_value_as_is(self):
        assert normalize_nhtsa_value("Some Value", "some_unknown_field_type") == "Some Value"
