"""Unit tests for the Category presentation contract field."""

from uuid import uuid4

from prosell.domain.entities.category import Category


def test_category_defaults_presentation_to_none():
    cat = Category.create(name="Vehicles", slug="vehicles", tenant_id=uuid4())
    assert cat.presentation is None


def test_category_accepts_presentation_contract():
    cat = Category.create(
        name="Vehicles",
        slug="vehicles",
        tenant_id=uuid4(),
        presentation={
            "title_template": "{year} {make} {model}",
            "subtitle_template": "{trim}",
            "card_fields": ["price", "status"],
        },
    )
    assert cat.presentation is not None
    assert cat.presentation["title_template"] == "{year} {make} {model}"
