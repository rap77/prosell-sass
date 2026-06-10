"""Unit tests for the presentation resolver (pure domain service).

resolve_presentation(own, ancestors_nearest_first) — own wins, else first
non-None ancestor walking from nearest to farthest.

filter_fields(attribute_schema) — extract the filterable fields, in declared
order, with their filter_type. Non-filterable fields are omitted.
"""

from prosell.domain.services.presentation_resolver import (
    filter_fields,
    resolve_presentation,
)


def test_resolve_presentation_prefers_own():
    own = {"title_template": "{a}"}
    assert resolve_presentation(own, [None, {"title_template": "{b}"}]) == own


def test_resolve_presentation_inherits_nearest_ancestor():
    # ancestors ordered nearest-first; first non-None wins
    assert resolve_presentation(None, [None, {"title_template": "{b}"}]) == {
        "title_template": "{b}"
    }


def test_resolve_presentation_none_when_no_source():
    assert resolve_presentation(None, [None, None]) is None


def test_resolve_presentation_own_wins_over_all_ancestors():
    own = {"title_template": "{a}"}
    assert resolve_presentation(own, [{"title_template": "{b}"}, {"title_template": "{c}"}]) == own


def test_filter_fields_extracts_filterable_only():
    schema = {
        "make": {"type": "string", "filterable": True, "filter_type": "select"},
        "year": {"type": "number", "filterable": True, "filter_type": "range"},
        "mileage": {"type": "number"},
    }
    out = filter_fields(schema)
    assert out == [
        {"field": "make", "filter_type": "select"},
        {"field": "year", "filter_type": "range"},
    ]


def test_filter_fields_defaults_filter_type_to_text():
    schema = {"color": {"type": "string", "filterable": True}}
    assert filter_fields(schema) == [{"field": "color", "filter_type": "text"}]


def test_filter_fields_empty_schema_returns_empty_list():
    assert filter_fields({}) == []


def test_filter_fields_preserves_declaration_order():
    # Dict iteration order in CPython 3.7+ is insertion order; verify the
    # resolver doesn't accidentally reorder.
    schema = {
        "z": {"filterable": True, "filter_type": "select"},
        "a": {"filterable": True, "filter_type": "select"},
        "m": {"filterable": True, "filter_type": "select"},
    }
    out = filter_fields(schema)
    assert [d["field"] for d in out] == ["z", "a", "m"]
