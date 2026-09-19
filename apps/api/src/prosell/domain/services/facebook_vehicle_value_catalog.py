"""Canonical Facebook Marketplace vehicle-attribute catalog.

u1-vehicle-catalog-api, FR1/BR1.1/BR1.4 — reconciles the ALREADY-normalized
output of `nhtsa_normalizer.NHTSA_TO_FACEBOOK` against the canonical set of
values Facebook Marketplace accepts for each vehicle attribute field. This
closes the silent catalog mismatch documented as finding #87
(`code-quality-assessment.md`): before this service existed, nothing
verified that a VIN-decode's normalized output actually matched an
`option` configured on the vehicle category's `attribute_schema`.

Pure domain service — no external dependencies, no persistence (same mold
as `category_translation.py`). The catalog itself is a static, in-code
lookup table.

`field_key` uses the attribute_schema/VIN-decode vocabulary — the same
names `nhtsa_normalizer.py`, `Category.attribute_schema` and
`vehicle_router.py`'s `DecodedVehicle` already use (`make`, `body_type`,
`drivetrain`, ...) — NOT the `FacebookFieldKey` enum from
`apps/web/src/lib/i18n/facebook-values/index.ts` (a broader, non-vehicle
vocabulary with different names for overlapping concepts, e.g.
`body_style` vs `body_type`, `brand` vs `make`). Translating between the
two vocabularies is Functional Design of U2's responsibility, not this
service's.

Values are stored in Spanish (display labels), matching the Excel data39
sheet the client uses to publish. When multi-language support lands, the
canonical values will need a paired English mirror — until then Spanish is
authoritative.

Every `accepted_raw_aliases` entry below lists tokens the upstream
`nhtsa_normalizer` may produce — including its legacy snake_case English
output, kept so the migration of pre-existing products still resolves
without orphaning them. New writes use the Spanish canonical_value
directly. Reconciliation exists to catch the case `nhtsa_normalizer.py`'s
FALLBACK branch (an unrecognized raw NHTSA value with no dict entry)
produces a token that is NOT in this canonical set — that is exactly the
"no match" case BR1.2 surfaces via `unmatched_fields`, rather than
silently trusting an unvetted fallback guess.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CanonicalFieldOption:
    """One canonical value Facebook Marketplace accepts for a vehicle field.

    `accepted_raw_aliases` lists already-normalized tokens — the OUTPUT of
    `nhtsa_normalizer.normalize_nhtsa_value()` — that reconcile to this
    `canonical_value`. Includes both the current Spanish canonical_value
    and any legacy snake_case English aliases produced by an older version
    of `nhtsa_normalizer.NHTSA_TO_FACEBOOK`.
    """

    field_key: str
    canonical_value: str
    accepted_raw_aliases: list[str] = field(default_factory=list)


def _identity_options(field_key: str, canonical_values: list[str]) -> list[CanonicalFieldOption]:
    """Build one option per value, aliased to itself (see module docstring)."""
    return [
        CanonicalFieldOption(
            field_key=field_key, canonical_value=value, accepted_raw_aliases=[value]
        )
        for value in canonical_values
    ]


# Vocabulary and values verified character-by-character against the
# Excel data39 sheet the client uses to publish (Spanish display labels).
# The 9 field_key names match Domain Design's confirmed list exactly (no
# more, no less) — reconfirmed against vehicle_router.py's DecodedVehicle
# fields and nhtsa_normalizer.py's field_type branches.
FACEBOOK_VEHICLE_VALUE_CATALOG: dict[str, list[CanonicalFieldOption]] = {
    "make": [
        CanonicalFieldOption("make", "Acura", ["Acura", "acura"]),
        CanonicalFieldOption("make", "Alfa Romeo", ["Alfa Romeo", "alfa_romeo"]),
        CanonicalFieldOption("make", "Aston Martin", ["Aston Martin", "aston_martin"]),
        CanonicalFieldOption("make", "Audi", ["Audi", "audi"]),
        CanonicalFieldOption("make", "BMW", ["BMW", "bmw"]),
        CanonicalFieldOption("make", "Bentley", ["Bentley", "bentley"]),
        CanonicalFieldOption("make", "Buick", ["Buick", "buick"]),
        CanonicalFieldOption("make", "CODA", ["CODA", "coda"]),
        CanonicalFieldOption("make", "Cadillac", ["Cadillac", "cadillac"]),
        CanonicalFieldOption("make", "Chevrolet", ["Chevrolet", "chevrolet"]),
        CanonicalFieldOption("make", "Chrysler", ["Chrysler", "chrysler"]),
        CanonicalFieldOption("make", "Daewoo", ["Daewoo", "daewoo"]),
        CanonicalFieldOption("make", "Daihatsu", ["Daihatsu", "daihatsu"]),
        CanonicalFieldOption("make", "Dodge", ["Dodge", "dodge"]),
        CanonicalFieldOption("make", "Eagle", ["Eagle", "eagle"]),
        CanonicalFieldOption("make", "Ferrari", ["Ferrari", "ferrari"]),
        CanonicalFieldOption("make", "Fiat", ["Fiat", "fiat"]),
        CanonicalFieldOption("make", "Fisker", ["Fisker", "fisker"]),
        CanonicalFieldOption("make", "Ford", ["Ford", "ford"]),
        CanonicalFieldOption("make", "Freightliner", ["Freightliner", "freightliner"]),
        CanonicalFieldOption("make", "GMC", ["GMC", "gmc"]),
        CanonicalFieldOption("make", "Genesis", ["Genesis", "genesis"]),
        CanonicalFieldOption("make", "Geo", ["Geo", "geo"]),
        CanonicalFieldOption("make", "Honda", ["Honda", "honda"]),
        CanonicalFieldOption("make", "Hummer", ["Hummer", "hummer"]),
        CanonicalFieldOption("make", "Hyundai", ["Hyundai", "hyundai"]),
        CanonicalFieldOption("make", "Infiniti", ["Infiniti", "infiniti"]),
        CanonicalFieldOption("make", "Isuzu", ["Isuzu", "isuzu"]),
        CanonicalFieldOption("make", "Jaguar", ["Jaguar", "jaguar"]),
        CanonicalFieldOption("make", "Jeep", ["Jeep", "jeep"]),
        CanonicalFieldOption("make", "Kia", ["Kia", "kia"]),
        CanonicalFieldOption("make", "Lamborghini", ["Lamborghini", "lamborghini"]),
        CanonicalFieldOption("make", "Land Rover", ["Land Rover", "land_rover"]),
        CanonicalFieldOption("make", "Lexus", ["Lexus", "lexus"]),
        CanonicalFieldOption("make", "Lincoln", ["Lincoln", "lincoln"]),
        CanonicalFieldOption("make", "Lotus", ["Lotus", "lotus"]),
        CanonicalFieldOption("make", "Lucid", ["Lucid", "lucid"]),
        CanonicalFieldOption("make", "MINI", ["MINI", "mini"]),
        CanonicalFieldOption("make", "Maserati", ["Maserati", "maserati"]),
        CanonicalFieldOption("make", "Maybach", ["Maybach", "maybach"]),
        CanonicalFieldOption("make", "Mazda", ["Mazda", "mazda"]),
        CanonicalFieldOption("make", "Mclaren", ["Mclaren", "mclaren"]),
        CanonicalFieldOption("make", "Mercedes-Benz", ["Mercedes-Benz", "mercedes"]),
        CanonicalFieldOption("make", "Mercury", ["Mercury", "mercury"]),
        CanonicalFieldOption("make", "Mitsubishi", ["Mitsubishi", "mitsubishi"]),
        CanonicalFieldOption("make", "Nissan", ["Nissan", "nissan"]),
        CanonicalFieldOption("make", "Oldsmobile", ["Oldsmobile", "oldsmobile"]),
        CanonicalFieldOption("make", "Panoz", ["Panoz", "panoz"]),
        CanonicalFieldOption("make", "Plymouth", ["Plymouth", "plymouth"]),
        CanonicalFieldOption("make", "Polestar", ["Polestar", "polestar"]),
        CanonicalFieldOption("make", "Pontiac", ["Pontiac", "pontiac"]),
        CanonicalFieldOption("make", "Porsche", ["Porsche", "porsche"]),
        CanonicalFieldOption("make", "Ram", ["Ram", "ram"]),
        CanonicalFieldOption("make", "Rivian", ["Rivian", "rivian"]),
        CanonicalFieldOption("make", "Rolls-Royce", ["Rolls-Royce", "rolls_royce"]),
        CanonicalFieldOption("make", "SRT", ["SRT", "srt"]),
        CanonicalFieldOption("make", "Saab", ["Saab", "saab"]),
        CanonicalFieldOption("make", "Saturn", ["Saturn", "saturn"]),
        CanonicalFieldOption("make", "Scion", ["Scion", "scion"]),
        CanonicalFieldOption("make", "Smart", ["Smart", "smart"]),
        CanonicalFieldOption("make", "Subaru", ["Subaru", "subaru"]),
        CanonicalFieldOption("make", "Suzuki", ["Suzuki", "suzuki"]),
        CanonicalFieldOption("make", "Tesla", ["Tesla", "tesla"]),
        CanonicalFieldOption("make", "Toyota", ["Toyota", "toyota"]),
        CanonicalFieldOption("make", "Volkswagen", ["Volkswagen", "volkswagen"]),
        CanonicalFieldOption("make", "Volvo", ["Volvo", "volvo"]),
    ],
    "fuel_type": [
        CanonicalFieldOption("fuel_type", "Gasolina", ["Gasolina", "gasoline"]),
        CanonicalFieldOption("fuel_type", "Diésel", ["Diésel", "diesel"]),
        CanonicalFieldOption("fuel_type", "Eléctrico", ["Eléctrico", "electric"]),
        CanonicalFieldOption("fuel_type", "Híbrido", ["Híbrido", "hybrid"]),
        CanonicalFieldOption(
            "fuel_type",
            "Híbrido eléctrico enchufable",
            ["Híbrido eléctrico enchufable", "plug_in", "Híbrido eléctrico"],
        ),
        CanonicalFieldOption("fuel_type", "Flexible", ["Flexible", "flex"]),
        CanonicalFieldOption("fuel_type", "Otro", ["Otro", "other"]),
    ],
    "transmission": [
        CanonicalFieldOption(
            "transmission",
            "Transmisión automática",
            ["Transmisión automática", "automatic"],
        ),
        CanonicalFieldOption(
            "transmission",
            "Transmisión manual",
            ["Transmisión manual", "manual"],
        ),
    ],
    "body_type": [
        CanonicalFieldOption("body_type", "SUV", ["SUV", "suv"]),
        CanonicalFieldOption("body_type", "Sedán", ["Sedán", "sedan"]),
        CanonicalFieldOption("body_type", "Camioneta", ["Camioneta", "pickup"]),
        CanonicalFieldOption("body_type", "Coupé", ["Coupé", "coupe"]),
        CanonicalFieldOption("body_type", "Hatchback", ["Hatchback", "hatchback"]),
        CanonicalFieldOption("body_type", "Convertible", ["Convertible", "convertible"]),
        CanonicalFieldOption("body_type", "Familiar", ["Familiar", "wagon"]),
        CanonicalFieldOption("body_type", "Miniván", ["Miniván", "minivan"]),
        CanonicalFieldOption("body_type", "Auto pequeño", ["Auto pequeño"]),
        CanonicalFieldOption("body_type", "Otro", ["Otro"]),
    ],
    "drivetrain": [
        CanonicalFieldOption("drivetrain", "FWD", ["FWD"]),
        CanonicalFieldOption("drivetrain", "RWD", ["RWD"]),
        CanonicalFieldOption("drivetrain", "AWD", ["AWD"]),
        CanonicalFieldOption("drivetrain", "4WD", ["4WD"]),
    ],
    "wheelbase_type": [
        CanonicalFieldOption("wheelbase_type", "Corta", ["short", "Corta"]),
        CanonicalFieldOption("wheelbase_type", "Estándar", ["standard", "Estándar"]),
        CanonicalFieldOption("wheelbase_type", "Larga", ["long", "Larga"]),
    ],
    "bed_type": [
        CanonicalFieldOption("bed_type", "Corta", ["short", "Corta"]),
        CanonicalFieldOption("bed_type", "Estándar", ["standard", "Estándar"]),
        CanonicalFieldOption("bed_type", "Larga", ["long", "Larga"]),
    ],
    "cab_type": [
        CanonicalFieldOption("cab_type", "Regular", ["regular", "Regular"]),
        CanonicalFieldOption("cab_type", "Extendida", ["extended", "Extendida"]),
        CanonicalFieldOption("cab_type", "Doble cabina", ["crew", "Doble cabina"]),
    ],
    "electrification_level": [
        CanonicalFieldOption("electrification_level", "BEV", ["bev", "BEV"]),
        CanonicalFieldOption("electrification_level", "PHEV", ["phev", "PHEV"]),
        CanonicalFieldOption("electrification_level", "Híbrido", ["hybrid", "Híbrido"]),
        CanonicalFieldOption(
            "electrification_level",
            "Híbrido ligero",
            ["mild_hybrid", "Mild Hybrid", "Híbrido ligero"],
        ),
        CanonicalFieldOption("electrification_level", "Ninguno", ["none", "Ninguno"]),
    ],
}


def reconcile(field_key: str, raw_value: str | None) -> str | None:
    """BR1.1 — reconcile an already-normalized NHTSA value against the
    canonical catalog for `field_key`.

    Returns the exact `canonical_value` on match. Returns `None` both when
    the field has an applicable catalog but no entry matches (BR1.2 CASE 2)
    and when the field has no catalog at all — callers distinguish those
    two cases via `get_options()` (BR1.2 CASE 3 vs. CASE 2/BR1.4).
    """
    if raw_value is None:
        return None
    options = FACEBOOK_VEHICLE_VALUE_CATALOG.get(field_key)
    if not options:
        return None
    for option in options:
        if raw_value in option.accepted_raw_aliases:
            return option.canonical_value
    return None


def get_options(field_key: str) -> list[str] | None:
    """BR1.4 — the full list of canonical values for `field_key`.

    Returns `None` when the field has no catalog at all (0 entries) — the
    signal BR1.2 CASE 3 (decode-VIN passthrough) and BR1.4's 404
    (options endpoint) both key off.
    """
    options = FACEBOOK_VEHICLE_VALUE_CATALOG.get(field_key)
    if not options:
        return None
    return [option.canonical_value for option in options]
