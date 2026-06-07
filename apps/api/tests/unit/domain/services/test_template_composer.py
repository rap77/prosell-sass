"""Unit tests for the {field} template composer (pure domain service)."""

from prosell.domain.services.template_composer import compose_from_template


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
