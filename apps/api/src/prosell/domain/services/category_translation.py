"""Category-to-client-vocabulary translation (u1-cross-org-export-api, FR7.5).

Maps a category tree's ROOT VERTICAL (e.g. "Vehiculos y Transporte") to the
2-column flat vocabulary (`category`/`type`) the external client-format CSV
expects (BR1.3). This module is a pure domain service — it never resolves a
`category_id` itself; the caller (application layer) walks the category
tree up to its root ancestor via `CategoryRepository.get_by_id_cross_tenant()`
and passes this module only the resolved vertical's `slug`.

Keyed by `slug`, not by the vertical's `id` (UUID): the "Vehiculos y
Transporte" vertical is seeded by `seed_vehicles_vertical()`
(`infrastructure/database/seed_categories.py`) with an `id` generated at
insert time — there is no fixed/deterministic UUID to hardcode here. Its
`slug` ("vehiculos-y-transporte") IS fixed and deterministic
(`VEHICLES_VERTICAL["slug"]`), so it's the only stable, hardcodable key.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CategoryTranslationEntry:
    """One row of the static category-vertical -> client-vocabulary table."""

    client_category: str
    client_type: str


# Verified character-by-character against docs/data39.csv — "camioneta" is
# lowercase (client CSV uses "Auto/camioneta", not "Auto/Camioneta").
CATEGORY_TRANSLATION_TABLE: dict[str, CategoryTranslationEntry] = {
    "vehiculos-y-transporte": CategoryTranslationEntry(
        client_category="Vehiculos",
        client_type="Auto/camioneta",
    ),
}


def resolve_client_category_type(vertical_slug: str) -> tuple[str, str] | None:
    """Resolve a root vertical's slug to the client's (category, type) pair.

    Returns `None` when the vertical has no translation entry (BR1.7) — the
    caller excludes the product from the export in that case, rather than
    emitting an empty/incorrect value.
    """
    entry = CATEGORY_TRANSLATION_TABLE.get(vertical_slug)
    if entry is None:
        return None
    return (entry.client_category, entry.client_type)
