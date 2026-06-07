"""Unit tests for the {field} template composer (pure domain service)."""

from prosell.domain.services.template_composer import (
    compose_from_template,
    resolve_title,
)


def test_all_fields_present():
    out = compose_from_template(
        "{year} {make} {model}",
        {"year": 2020, "make": "Honda", "model": "Civic"},
    )
    assert out == "2020 Honda Civic"


def test_missing_field_drops_its_separator():
    # No double space, no dangling separator when a field is absent.
    out = compose_from_template(
        "{year} {make} {model}",
        {"year": 2020, "make": "Honda"},
    )
    assert out == "2020 Honda"


def test_literals_between_fields_are_preserved():
    out = compose_from_template(
        "{tipo} en {barrio}",
        {"tipo": "Departamento", "barrio": "Palermo"},
    )
    assert out == "Departamento en Palermo"


def test_missing_field_drops_adjacent_literal():
    # The " en " literal belongs to the {barrio} segment and is dropped with it.
    out = compose_from_template("{tipo} en {barrio}", {"tipo": "Departamento"})
    assert out == "Departamento"


def test_unknown_placeholder_is_dropped():
    out = compose_from_template("{make} {bogus}", {"make": "Honda"})
    assert out == "Honda"


def test_empty_attributes_yields_empty_string():
    assert compose_from_template("{year} {make}", {}) == ""


def test_empty_string_value_is_treated_as_missing():
    out = compose_from_template(
        "{year} {make} {model}",
        {"year": 2020, "make": "Honda", "model": ""},
    )
    assert out == "2020 Honda"


def test_literal_only_template():
    assert compose_from_template("Producto", {"x": 1}) == "Producto"


# ─── resolve_title ────────────────────────────────────────────────────


def test_resolve_title_uses_template_when_present():
    out = resolve_title(
        {"title_template": "{year} {make}"},
        {"year": 2020, "make": "Honda"},
        fallback="ignored",
    )
    assert out == "2020 Honda"


def test_resolve_title_falls_back_without_template():
    out = resolve_title(None, {"year": 2020}, fallback="My Title")
    assert out == "My Title"


def test_resolve_title_falls_back_when_template_composes_empty():
    # Template present but no matching attributes → empty compose → fallback.
    out = resolve_title(
        {"title_template": "{make}"}, {}, fallback="My Title"
    )
    assert out == "My Title"


def test_resolve_title_fallback_can_be_none():
    assert resolve_title({}, {"x": 1}, fallback=None) is None
