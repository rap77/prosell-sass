"""Unit tests for the CategoryInferrer domain service (T1).

Pure-domain service. No I/O. Triple-signal scorer:
- S1 (weight 0.35): title token overlap with category vocab
- S2 (weight 0.40): provided attribute name match with category field_config
- S3 (weight 0.25): per-attribute schema validation against category.attribute_schema

Final = 0.35 * S1 + 0.40 * S2 + 0.25 * S3. Capped at [0, 1].

The threshold check (>= 0.5 → single suggestion) lives in the use case (T3),
not here. This service returns raw floats only, sorted DESC.
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.category import Category
from prosell.domain.services.category_inferrer import (
    STOPWORDS,
    CategoryInferrer,
)


def _root_category(
    name: str,
    *,
    field_names: list[str] | None = None,
    required_attrs: dict[str, dict[str, object]] | None = None,
    description: str | None = None,
) -> Category:
    return Category(
        id=uuid4(),
        tenant_id=None,
        name=name,
        slug=name.lower().replace(" ", "-"),
        parent_id=None,
        level=0,
        is_active=True,
        description=description,
        field_config=[
            {"field_name": fn, "field_label": fn, "field_type": "string"}
            for fn in (field_names or [])
        ],
        attribute_schema=required_attrs or {},
    )


# --- Original 6 tests (per spec D3) ---


def test_empty_title_and_attributes_returns_empty_list() -> None:
    # Edge case: degenerate input, no crash, no random winner
    inferrer = CategoryInferrer()
    result = inferrer.score("", {}, candidates=[_root_category("Vehicles")])
    assert result == []


def test_stopwords_dropped_from_title_tokens() -> None:
    # "el auto rojo" should tokenize to {"auto", "rojo"}; S1 vs "vehicles" = 0
    vehicles = _root_category("Vehicles", field_names=["model"])
    inferrer = CategoryInferrer()
    score = inferrer.score("el auto rojo", {}, [vehicles])[0][1]
    # S1=0 (no overlap with "vehicles"), S2=0, S3=0 (no attrs) → 0
    assert score == pytest.approx(0.0)


def test_title_only_no_attribute_match_returns_raw_score_below_threshold() -> None:
    # Single signal alone is below the 0.5 threshold by design -- the
    # threshold check lives in the USE CASE, not the scorer. This test
    # verifies the scorer's raw output, NOT threshold behavior.
    vehicles = _root_category("Vehicles")
    inferrer = CategoryInferrer()
    result = inferrer.score("Vehicles Honda", {}, [vehicles])
    assert len(result) == 1
    # 0.35 * S1 where S1 = min(1.0, 1/2) = 0.5 → 0.175
    assert result[0][1] == pytest.approx(0.35 * 0.5)
    # Explicit: this is BELOW the 0.5 threshold. The use case will not pick
    # this as the single suggestion. Tested at the use case level (T3).


def test_title_plus_matching_attribute_names_returns_raw_score() -> None:
    # S1: 0 ("honda civic" ∩ "vehicles" = ∅)
    # S2: 2/2 attribute names match field_config → 1.0
    # S3: 0 schema constraints → 0
    # Final = 0.40
    vehicles = _root_category("Vehicles", field_names=["make", "model"])
    inferrer = CategoryInferrer()
    score = inferrer.score(
        "Honda Civic",
        {"make": "Honda", "model": "Civic"},
        [vehicles],
    )[0][1]
    assert score == pytest.approx(0.40)


def test_value_schema_fit_adds_signal() -> None:
    # S1: 0
    # S2: 0 (no field_name "bedrooms" in field_config, only in attribute_schema)
    # S3: 1/2 = 0.5
    # Final = 0.25 * 0.5 = 0.125
    real_estate = _root_category(
        "Real Estate",
        required_attrs={
            "bedrooms": {"type": "number", "required": True},
        },
    )
    inferrer = CategoryInferrer()
    score = inferrer.score(
        "Departamento",
        {"bedrooms": 2, "area": 50},  # bedrooms fits, area doesn't
        [real_estate],
    )[0][1]
    assert score == pytest.approx(0.125)


def test_two_competitors_sorted_descending_by_raw_score() -> None:
    vehicles = _root_category("Vehicles", field_names=["make", "model", "year"])
    real_estate = _root_category("Real Estate", field_names=["bedrooms", "area"])
    inferrer = CategoryInferrer()
    result = inferrer.score(
        "Honda Civic 2020",
        {"make": "Honda", "model": "Civic", "year": 2020},
        [real_estate, vehicles],  # deliberately unsorted input
    )
    assert result[0][0].name == "Vehicles"
    assert result[1][0].name == "Real Estate"
    assert result[0][1] > result[1][1]


# --- First-pass additions (3 tests) ---


def test_three_competitors_sort_stable_on_score() -> None:
    # Cap-on-5 is a USE CASE concern (T3), but the scorer's sort must be
    # stable: ties on score break by input order. Verified here.
    a = _root_category("AAA", field_names=["x"])
    b = _root_category("BBB", field_names=["x"])  # identical to a's score
    c = _root_category("CCC", field_names=["x"])
    inferrer = CategoryInferrer()
    # Title + attribute that match ALL three equally
    result = inferrer.score("foo", {"x": 1}, [c, a, b])
    # All three get the same score. Stable sort preserves input order.
    assert [cat.name for cat, _ in result] == ["CCC", "AAA", "BBB"]


def test_empty_attribute_schema_returns_zero_for_s3() -> None:
    # When attribute_schema is empty, validate_attributes short-circuits.
    # Per spec D3, S3 must contribute 0 (no fits to count), not undefined.
    vehicles = _root_category("Vehicles", field_names=["make"])  # empty attribute_schema
    inferrer = CategoryInferrer()
    score = inferrer.score("foo", {"make": "Honda"}, [vehicles])[0][1]
    # S1: 0
    # S2: 1/1 = 1.0 (make matches field_config)
    # S3: 0 (empty schema → no fits)
    # Final = 0.40
    assert score == pytest.approx(0.40)


def test_category_with_none_description_tokenizes_safely() -> None:
    # D3: vocab is name + description (when non-null) + field_config.
    # None description must not crash tokenization.
    vehicles = _root_category("Vehicles", description=None, field_names=["make"])
    inferrer = CategoryInferrer()
    # Should not raise
    result = inferrer.score("foo bar", {"make": "Honda"}, [vehicles])
    assert len(result) == 1
    # Just check it returns a finite float; exact value isn't the point.
    assert 0.0 <= result[0][1] <= 1.0


# --- Second-pass additions (4 tests: H1/M1/M2/edge) ---


def test_non_none_description_contributes_to_s1_vocab() -> None:
    # M2: when description is non-null, its tokens add to the category vocab
    vehicles_no_desc = _root_category("Vehicles", description=None, field_names=[])
    vehicles_with_desc = _root_category("Vehicles", description="cars trucks suv", field_names=[])
    inferrer = CategoryInferrer()
    # Title with "cars" in it
    no_desc_score = inferrer.score("cars", {}, [vehicles_no_desc])[0][1]
    with_desc_score = inferrer.score("cars", {}, [vehicles_with_desc])[0][1]
    assert with_desc_score > no_desc_score  # description contributed


def test_whitespace_only_title_tokenizes_to_empty() -> None:
    # M1: " " or "   " -- Pydantic min_length=1 accepts these. The scorer
    # tokenizer must drop whitespace-only inputs to no tokens, so S1 = 0.
    # S2 still fires if attribute names match.
    vehicles = _root_category("Vehicles", field_names=["make"])
    inferrer = CategoryInferrer()
    result = inferrer.score("   ", {"make": "Honda"}, [vehicles])
    # S1: 0 tokens after whitespace strip → 0
    # S2: 1/1 = 1.0 (make matches)
    # S3: 0
    # Final = 0.40 (only S2 fires)
    assert result[0][1] == pytest.approx(0.40)


def test_tiny_title_with_one_char() -> None:
    # Edge: "a" -- 1 char, passes min_length=1, tokenized to "a" (≥ 2 chars filter drops it)
    vehicles = _root_category("Vehicles", field_names=["make"])
    inferrer = CategoryInferrer()
    result = inferrer.score("a", {"make": "Honda"}, [vehicles])
    # S1: "a" filtered (length 1) → 0
    # S2: 1.0
    # S3: 0
    assert result[0][1] == pytest.approx(0.40)


def test_stopwords_constant_contains_expected_entries() -> None:
    # Pin the STOPWORDS contract: the spec's locked list is the source of
    # truth. Drift here means silent scorer changes. Imported symbol check
    # + spot-check a few entries.
    assert isinstance(STOPWORDS, tuple)
    assert "el" in STOPWORDS
    assert "the" in STOPWORDS
    assert "for" in STOPWORDS
    # And no duplicates
    assert len(STOPWORDS) == len(set(STOPWORDS))
