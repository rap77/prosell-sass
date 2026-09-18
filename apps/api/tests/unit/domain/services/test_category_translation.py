"""Dedicated tests for `category_translation.py` / `CATEGORY_TRANSLATION_TABLE`.

team-practices.md piso #4 (hallazgo #88, code-quality-assessment.md):
`CATEGORY_TRANSLATION_TABLE` previously had a single hardcoded entry with
no test of its own — only indirect coverage through
`tests/unit/services/test_csv_export.py`. This file makes that coverage
explicit and adds table-shape/data-integrity assertions the indirect tests
never exercised.
"""

import dataclasses

import pytest

from prosell.domain.services.category_translation import (
    CATEGORY_TRANSLATION_TABLE,
    CategoryTranslationEntry,
    resolve_client_category_type,
)


def test_resolve_client_category_type_vehiculos_y_transporte() -> None:
    # Verified character-by-character against docs/data39.csv (BR1.3) —
    # "camioneta" is lowercase in the real client CSV, not "Camioneta".
    result = resolve_client_category_type("vehiculos-y-transporte")
    assert result == ("Vehiculos", "Auto/camioneta")


def test_resolve_client_category_type_unknown_slug_returns_none() -> None:
    # BR1.7 — no translation entry -> None, caller excludes the product
    # from the export rather than emitting an incorrect/empty value.
    assert resolve_client_category_type("bienes-raices") is None
    assert resolve_client_category_type("") is None
    assert resolve_client_category_type("not-a-real-vertical") is None


def test_category_translation_table_indexed_by_slug_not_uuid() -> None:
    # The module docstring's own rationale: the vertical's `id` is
    # generated at insert time by seed_vehicles_vertical() (no fixed UUID
    # to hardcode) — only its `slug` is stable/deterministic.
    assert set(CATEGORY_TRANSLATION_TABLE.keys()) == {"vehiculos-y-transporte"}
    for key in CATEGORY_TRANSLATION_TABLE:
        assert isinstance(key, str)


def test_category_translation_entry_is_frozen() -> None:
    entry = CATEGORY_TRANSLATION_TABLE["vehiculos-y-transporte"]
    assert isinstance(entry, CategoryTranslationEntry)
    assert entry.client_category == "Vehiculos"
    assert entry.client_type == "Auto/camioneta"

    with pytest.raises(dataclasses.FrozenInstanceError):
        entry.client_category = "Mutated"  # type: ignore[misc]


def test_resolve_client_category_type_returns_a_plain_tuple() -> None:
    result = resolve_client_category_type("vehiculos-y-transporte")
    assert isinstance(result, tuple)
    assert len(result) == 2
