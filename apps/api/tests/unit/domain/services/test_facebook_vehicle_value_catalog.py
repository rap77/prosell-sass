"""u1-vehicle-catalog-api — FacebookVehicleValueCatalog (FR1, BR1.1, BR1.4).

Piso de test #1 de team-practices.md: reconciliación cruzada valor-por-valor
entre `nhtsa_normalizer.NHTSA_TO_FACEBOOK` y `FACEBOOK_VEHICLE_VALUE_CATALOG`.
"""

from prosell.domain.services.facebook_vehicle_value_catalog import (
    FACEBOOK_VEHICLE_VALUE_CATALOG,
    get_options,
    reconcile,
)
from prosell.infrastructure.services.nhtsa_normalizer import NHTSA_TO_FACEBOOK

# Section boundaries copied from nhtsa_normalizer.py's own comments (exact
# raw-NHTSA-key ranges), so we can group NHTSA_TO_FACEBOOK's flat dict by
# field_key for the cross-reconciliation test below without re-deriving
# field_type dispatch logic.
_MAKE_KEYS = {
    "ACURA",
    "ALFA ROMEO",
    "ASTON MARTIN",
    "AUDI",
    "BMW",
    "BENTLEY",
    "BUICK",
    "CADILLAC",
    "CHEVROLET",
    "CHRYSLER",
    "DODGE",
    "FERRARI",
    "FIAT",
    "FORD",
    "GMC",
    "GENESIS",
    "HONDA",
    "HUMMER",
    "HYUNDAI",
    "INFINITI",
    "JAGUAR",
    "JEEP",
    "KIA",
    "LAND ROVER",
    "LEXUS",
    "LINCOLN",
    "LUCID",
    "MINI",
    "MASERATI",
    "MAZDA",
    "MERCEDES-BENZ",
    "MITSUBISHI",
    "NISSAN",
    "POLESTAR",
    "PONTIAC",
    "PORSCHE",
    "RAM",
    "RIVIAN",
    "ROLLS-ROYCE",
    "SUBARU",
    "TESLA",
    "TOYOTA",
    "VOLKSWAGEN",
    "VOLVO",
}
_BODY_TYPE_KEYS = {
    "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)",
    "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV) (MPV)",
    "Sedan/Saloon",
    "Pickup",
    "Coupe",
    "Hatchback/Liftback/Notchback",
    "Convertible/Cabriolet/Roadster",
    "Wagon/Estate",
    "Minivan",
    "Multipurpose Passenger Vehicle (MPV)",
    "Truck",
}
_DRIVETRAIN_KEYS = {
    "Front-Wheel Drive",
    "Rear-Wheel Drive",
    "All-Wheel Drive",
    "Four-Wheel Drive",
    "4-Wheel Drive",
}
_TRANSMISSION_KEYS = {
    "Automatic",
    "Manual",
    "Continuously Variable Transmission (CVT)",
    "CVT",
    "Dual Clutch",
    "Automated Manual",
    "Automatic Transmission",
    "Manual Transmission",
}
_FUEL_TYPE_KEYS = {
    "Gasoline",
    "Diesel",
    "Electric",
    "Hybrid",
    "Plug-in Hybrid",
    "Flex Fuel",
    "Natural Gas",
    "Propane",
}
_ELECTRIFICATION_KEYS = {
    "BEV (Battery Electric Vehicle)",
    "Battery Electric Vehicle (BEV)",
    "PHEV (Plug-in Hybrid Electric Vehicle)",
    "Plug-in Hybrid Electric Vehicle (PHEV)",
    "HEV (Hybrid Electric Vehicle)",
    "Hybrid Electric Vehicle (HEV)",
    "Mild Hybrid",
    "Strong HEV",
    "ICE",
}
_WHEELBASE_TYPE_KEYS = {
    "Short Wheel Base",
    "SWB",
    "Standard Wheel Base",
    "Long Wheel Base",
    "LWB",
    "Extended Wheel Base",
}
_BED_TYPE_KEYS = {"Short Bed", "Standard Bed", "Regular Bed", "Long Bed"}
_CAB_TYPE_KEYS = {
    "Regular Cab",
    "Standard Cab",
    "Extended Cab",
    "SuperCab",
    "King Cab",
    "Access Cab",
    "Crew Cab",
    "Double Cab",
    "Quad Cab",
    "SuperCrew",
    "Mega Cab",
}

_FIELD_KEY_TO_NHTSA_KEYS: dict[str, set[str]] = {
    "make": _MAKE_KEYS,
    "body_type": _BODY_TYPE_KEYS,
    "drivetrain": _DRIVETRAIN_KEYS,
    "transmission": _TRANSMISSION_KEYS,
    "fuel_type": _FUEL_TYPE_KEYS,
    "electrification_level": _ELECTRIFICATION_KEYS,
    "wheelbase_type": _WHEELBASE_TYPE_KEYS,
    "bed_type": _BED_TYPE_KEYS,
    "cab_type": _CAB_TYPE_KEYS,
}


def test_all_nhtsa_to_facebook_keys_are_classified_exactly_once() -> None:
    """Sanity check on the test's own section maps above (not the catalog):
    every NHTSA_TO_FACEBOOK key belongs to exactly one field section, so the
    cross-reconciliation test below has complete, non-overlapping coverage.
    """
    all_classified: list[str] = []
    for keys in _FIELD_KEY_TO_NHTSA_KEYS.values():
        all_classified.extend(keys)
    assert len(all_classified) == len(set(all_classified)), "a raw key is double-classified"
    assert set(all_classified) == set(NHTSA_TO_FACEBOOK.keys())


def test_cross_reconciliation_every_nhtsa_to_facebook_value_is_in_the_catalog() -> None:
    """Piso #1 — para cada field_key, todo valor que emite
    NHTSA_TO_FACEBOOK debe calzar EXACTO con una entrada del catálogo
    canónico para ese mismo campo (no alcanza con "algún valor").
    """
    mismatches: list[tuple[str, str]] = []
    for field_key, nhtsa_keys in _FIELD_KEY_TO_NHTSA_KEYS.items():
        for nhtsa_key in nhtsa_keys:
            normalized_value = NHTSA_TO_FACEBOOK[nhtsa_key]
            if reconcile(field_key, normalized_value) != normalized_value:
                mismatches.append((field_key, normalized_value))

    assert mismatches == [], (
        f"{len(mismatches)} NHTSA_TO_FACEBOOK value(s) do not reconcile "
        f"exactly against FACEBOOK_VEHICLE_VALUE_CATALOG: {mismatches}"
    )


def test_reconcile_known_value_returns_exact_canonical_value() -> None:
    # AC1.1.1 — body_type "suv" reconciles to the exact canonical value.
    assert reconcile("body_type", "suv") == "suv"
    assert reconcile("drivetrain", "FWD") == "FWD"


def test_reconcile_unknown_value_with_applicable_catalog_returns_none() -> None:
    # BR1.2 CASE 2 — a value with no entry in an applicable catalog.
    assert reconcile("body_type", "spaceship") is None
    assert reconcile("make", "some_unrecognized_make") is None


def test_reconcile_none_input_returns_none() -> None:
    assert reconcile("body_type", None) is None


def test_reconcile_field_key_without_catalog_returns_none() -> None:
    # BR1.2 CASE 3 signal source — a field_key with 0 entries.
    assert reconcile("year", "2020") is None


def test_get_options_known_field_key_returns_full_list() -> None:
    options = get_options("transmission")
    assert options == ["automatic", "manual"]


def test_get_options_unknown_field_key_returns_none() -> None:
    # BR1.4 / BR1.2 CASE 3 — 0 entries signal.
    assert get_options("year") is None
    assert get_options("engine_type") is None  # never a real field_key (see entities.md)


def test_catalog_covers_exactly_the_nine_confirmed_field_keys() -> None:
    assert set(FACEBOOK_VEHICLE_VALUE_CATALOG.keys()) == {
        "make",
        "fuel_type",
        "transmission",
        "body_type",
        "drivetrain",
        "wheelbase_type",
        "bed_type",
        "cab_type",
        "electrification_level",
    }


def test_no_duplicate_alias_within_the_same_field_key() -> None:
    """entities.md entity_constraints (Minor #5) — a raw alias must not
    appear in accepted_raw_aliases of more than one entry of the same
    field_key.
    """
    for field_key, options in FACEBOOK_VEHICLE_VALUE_CATALOG.items():
        seen: set[str] = set()
        for option in options:
            for alias in option.accepted_raw_aliases:
                assert alias not in seen, (
                    f"duplicate alias {alias!r} within field_key {field_key!r}"
                )
                seen.add(alias)


def test_no_duplicate_canonical_value_within_the_same_field_key() -> None:
    """entities.md entity_constraints — (field_key, canonical_value) unique."""
    for field_key, options in FACEBOOK_VEHICLE_VALUE_CATALOG.items():
        canonical_values = [option.canonical_value for option in options]
        assert len(canonical_values) == len(set(canonical_values)), (
            f"duplicate canonical_value within field_key {field_key!r}"
        )
