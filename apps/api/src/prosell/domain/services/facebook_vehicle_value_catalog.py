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

Every `accepted_raw_aliases` entry below is copied character-for-character
from a value `NHTSA_TO_FACEBOOK` (`nhtsa_normalizer.py`) actually emits for
that field — verified 2026-09-17 against the dict's 9 field-type sections.
The catalog only needs a single alias per canonical value because
`NHTSA_TO_FACEBOOK` already collapses every raw NHTSA input variant to one
normalized token before this service ever sees it (e.g. both `"Truck"` and
`"Pickup"` normalize to `"pickup"` upstream). Reconciliation exists to
catch the case `nhtsa_normalizer.py`'s FALLBACK branch (an unrecognized raw
NHTSA value with no dict entry) produces a token that is NOT in this
canonical set — that is exactly the "no match" case BR1.2 surfaces via
`unmatched_fields`, rather than silently trusting an unvetted fallback
guess.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CanonicalFieldOption:
    """One canonical value Facebook Marketplace accepts for a vehicle field.

    `accepted_raw_aliases` lists already-normalized tokens — the OUTPUT of
    `nhtsa_normalizer.normalize_nhtsa_value()` — that reconcile to this
    `canonical_value`, never raw NHTSA API strings.
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


# Vocabulary and values verified character-by-character against
# nhtsa_normalizer.NHTSA_TO_FACEBOOK (2026-09-17) — see module docstring.
# The 9 field_key names match Domain Design's confirmed list exactly (no
# more, no less) — reconfirmed against vehicle_router.py's DecodedVehicle
# fields and nhtsa_normalizer.py's field_type branches.
FACEBOOK_VEHICLE_VALUE_CATALOG: dict[str, list[CanonicalFieldOption]] = {
    "make": _identity_options(
        "make",
        [
            "acura",
            "alfa_romeo",
            "aston_martin",
            "audi",
            "bmw",
            "bentley",
            "buick",
            "cadillac",
            "chevrolet",
            "chrysler",
            "dodge",
            "ferrari",
            "fiat",
            "ford",
            "gmc",
            "genesis",
            "honda",
            "hummer",
            "hyundai",
            "infiniti",
            "jaguar",
            "jeep",
            "kia",
            "land_rover",
            "lexus",
            "lincoln",
            "lucid",
            "mini",
            "maserati",
            "mazda",
            "mercedes",
            "mitsubishi",
            "nissan",
            "polestar",
            "pontiac",
            "porsche",
            "ram",
            "rivian",
            "rolls_royce",
            "subaru",
            "tesla",
            "toyota",
            "volkswagen",
            "volvo",
        ],
    ),
    "fuel_type": _identity_options(
        "fuel_type",
        ["gasoline", "diesel", "electric", "hybrid", "plug_in", "flex", "other"],
    ),
    "transmission": _identity_options("transmission", ["automatic", "manual"]),
    "body_type": _identity_options(
        "body_type",
        ["suv", "sedan", "pickup", "coupe", "hatchback", "convertible", "wagon", "minivan"],
    ),
    "drivetrain": _identity_options("drivetrain", ["FWD", "RWD", "AWD", "4WD"]),
    "wheelbase_type": _identity_options("wheelbase_type", ["short", "standard", "long"]),
    "bed_type": _identity_options("bed_type", ["short", "standard", "long"]),
    "cab_type": _identity_options("cab_type", ["regular", "extended", "crew"]),
    "electrification_level": _identity_options(
        "electrification_level",
        ["bev", "phev", "hybrid", "mild_hybrid", "none"],
    ),
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
