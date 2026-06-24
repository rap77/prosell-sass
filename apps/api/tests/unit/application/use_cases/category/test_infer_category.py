"""Unit tests for InferCategoryUseCase (T3).

The use case orchestrates:
1. ``category_repository.get_active_roots(tenant_id)`` → candidate set
2. ``CategoryInferrer.score(title, attributes, candidates)`` → raw scores
3. Apply ``SINGLE_SUGGESTION_THRESHOLD`` to pick the global best as
   the suggestion (H1 fix: cap must NOT hide the best from being
   considered).
4. Cap alternatives at ``MAX_ALTERNATIVES`` (display cap only).
5. Round scores to ``SCORE_DISPLAY_DECIMALS`` for display.

The inferrer is injected as a dependency so tests can control scores
without having to construct categories that produce specific scores
from the real heuristic.
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.category.infer_category import (
    MAX_ALTERNATIVES,
    SCORE_DISPLAY_DECIMALS,
    SINGLE_SUGGESTION_THRESHOLD,
    InferCategoryUseCase,
)
from prosell.domain.entities.category import Category
from prosell.domain.services.category_inferrer import CategoryInferrer


def _category(name: str) -> Category:
    return Category(
        id=uuid4(),
        tenant_id=None,
        name=name,
        slug=name.lower().replace(" ", "-"),
        parent_id=None,
        level=0,
        is_active=True,
    )


def _inferrer_with_scores(scores_by_name: dict[str, float]) -> MagicMock:
    """Mock CategoryInferrer that returns specific (Category, score) pairs
    in the SAME ORDER as the input candidates (inferrer is supposed to
    sort DESC; we don't re-sort in the use case)."""

    mock = MagicMock(spec=CategoryInferrer)

    def fake_score(title, attributes, candidates):  # noqa: ARG001
        # Mirrors real inferrer's stable sort. Mock returns scores from
        # the test's score map, ignoring title/attributes (which the use
        # case would normally pass through to the real scorer).
        return sorted(
            [(c, scores_by_name[c.name]) for c in candidates],
            key=lambda pair: pair[1],
            reverse=True,
        )

    mock.score = fake_score
    return mock


def _use_case(
    candidates: list[Category],
    scores_by_name: dict[str, float],
) -> InferCategoryUseCase:
    mock_repo = AsyncMock()
    mock_repo.get_active_roots = AsyncMock(return_value=candidates)
    return InferCategoryUseCase(
        category_repository=mock_repo,
        inferrer=_inferrer_with_scores(scores_by_name),
    )


# --- Original tests (5) ---


async def test_single_suggestion_when_exactly_one_crosses_threshold() -> None:
    """One candidate above threshold → that one is the suggestion."""
    cats = [_category("Vehicles"), _category("Real Estate")]
    use_case = _use_case(cats, {"Vehicles": 0.85, "Real Estate": 0.10})

    response = await use_case.execute(
        title="Honda Civic 2020",
        attributes={"make": "Honda", "model": "Civic"},
        tenant_id=uuid4(),
    )

    assert response.suggestion is not None
    assert response.suggestion.name == "Vehicles"
    assert response.suggestion.score == pytest.approx(0.85)
    assert len(response.alternatives) == 2
    assert response.alternatives[0].name == "Vehicles"
    assert response.alternatives[1].name == "Real Estate"


async def test_suggestion_is_global_best_when_multiple_above_threshold() -> None:
    """H1 fix supersedes the 'exactly 1 above threshold' rule.

    When 2+ candidates are above threshold, the global best (highest
    score) IS the suggestion. The cap-5 must not hide it. This test
    replaces the first-pass ``test_no_suggestion_when_two_competitors_above_threshold``
    which was incorrect per H1.
    """
    cats = [_category("A"), _category("B")]
    use_case = _use_case(cats, {"A": 0.80, "B": 0.70})

    response = await use_case.execute(title="X", attributes={}, tenant_id=uuid4())

    assert response.suggestion is not None
    assert response.suggestion.name == "A"  # global best
    assert response.suggestion.score == pytest.approx(0.80)
    assert len(response.alternatives) == 2


async def test_no_suggestion_when_none_crosses_threshold() -> None:
    """No candidate above threshold → no suggestion, but alternatives
    is still populated (caller can still browse)."""
    cats = [_category("A"), _category("B")]
    use_case = _use_case(cats, {"A": 0.30, "B": 0.20})

    response = await use_case.execute(title="X", attributes={}, tenant_id=uuid4())

    assert response.suggestion is None
    assert len(response.alternatives) == 2
    assert response.alternatives[0].name == "A"  # higher score first
    assert response.alternatives[1].name == "B"


async def test_empty_response_when_no_active_roots() -> None:
    """No candidates → empty response, no repo call to inferrer."""
    mock_repo = AsyncMock()
    mock_repo.get_active_roots = AsyncMock(return_value=[])
    mock_inferrer = MagicMock(spec=CategoryInferrer)
    use_case = InferCategoryUseCase(category_repository=mock_repo, inferrer=mock_inferrer)

    response = await use_case.execute(title="X", attributes={}, tenant_id=uuid4())

    assert response.suggestion is None
    assert response.alternatives == []
    mock_inferrer.score.assert_not_called()


async def test_empty_response_for_whitespace_only_title_and_empty_attributes() -> None:
    """I-2: degenerate input (whitespace-only title + empty attrs) → empty.

    The scorer's tokenizer drops whitespace to no tokens, so S1=0. With
    no attributes, S2 and S3 are also 0. The use case must return
    ``{suggestion: None, alternatives: []}`` — NOT N rows of score 0.0.
    The integration test ``test_infer_returns_empty_for_whitespace_only_title``
    pins this at the API boundary; this unit test pins it at the use case
    so the contract doesn't depend on a running DB.
    """
    cats = [_category("Vehicles"), _category("Real Estate")]
    use_case = _use_case(cats, {"Vehicles": 0.0, "Real Estate": 0.0})

    # Sanity: without the guard, the inferrer would score every candidate
    # at 0.0 (all signals 0) and the use case would return them all.
    # The guard short-circuits BEFORE the inferrer is called.
    response = await use_case.execute(title="   ", attributes={}, tenant_id=uuid4())

    assert response.suggestion is None
    assert response.alternatives == []


async def test_non_whitespace_title_with_empty_attributes_returns_zero_scored_alts() -> None:
    """Counter-test: empty attributes but a real title → inferrer is
    called and may return zero-scored alternatives. Only whitespace-only
    title (M1) collapses to empty.
    """
    cats = [_category("Vehicles"), _category("Real Estate")]
    use_case = _use_case(cats, {"Vehicles": 0.0, "Real Estate": 0.0})

    response = await use_case.execute(title="Real text", attributes={}, tenant_id=uuid4())

    # No suggestion (all scores below threshold) but alternatives IS
    # populated (caller can still browse).
    assert response.suggestion is None
    assert len(response.alternatives) == 2


# --- H1 fix tests (2) ---


async def test_caps_alternatives_at_max_five_with_global_best_suggestion() -> None:
    """8 candidates all above threshold. Alternatives capped at 5.
    The global best (highest score) is the suggestion, even when many
    others are above threshold. H1 — the cap must not hide the best.
    """
    cats = [_category(f"Cat{i}") for i in range(8)]
    scores = {f"Cat{i}": 0.6 + i * 0.01 for i in range(8)}  # 0.60..0.67
    use_case = _use_case(cats, scores)

    response = await use_case.execute(title="X", attributes={}, tenant_id=uuid4())

    assert response.suggestion is not None
    assert response.suggestion.name == "Cat7"  # global best
    assert response.suggestion.score == pytest.approx(0.67)
    assert len(response.alternatives) == 5
    # The suggestion is also in alternatives (so the form can render it
    # in the dropdown with the rest)
    assert any(a.name == "Cat7" for a in response.alternatives)


async def test_suggestion_finds_global_best_even_beyond_top5_alternatives() -> None:
    """H1 specific: 6 candidates at 0.55 + 1 at 0.95. The 0.95 is the
    global best → IS the suggestion. Alternatives is capped at 5 and
    naturally includes the suggestion (top 5 by score)."""
    cats = [_category(f"Low{i}") for i in range(6)] + [_category("HiddenGem")]
    scores = {f"Low{i}": 0.55 for i in range(6)}
    scores["HiddenGem"] = 0.95
    use_case = _use_case(cats, scores)

    response = await use_case.execute(title="X", attributes={}, tenant_id=uuid4())

    assert response.suggestion is not None
    assert response.suggestion.name == "HiddenGem"
    assert response.suggestion.score == pytest.approx(0.95)
    assert len(response.alternatives) == 5
    assert any(a.name == "HiddenGem" for a in response.alternatives)


# --- Display formatting tests (2) ---


async def test_score_in_response_rounded_to_two_decimals() -> None:
    """0.87653 raw → 0.88 in the response (display value)."""
    cats = [_category("Vehicles")]
    use_case = _use_case(cats, {"Vehicles": 0.87653})

    response = await use_case.execute(title="X", attributes={}, tenant_id=uuid4())

    assert response.suggestion is not None
    assert response.suggestion.score == pytest.approx(0.88)
    # Verify precision: should be 2 decimals, not 5
    assert response.suggestion.score == round(0.87653, SCORE_DISPLAY_DECIMALS)


async def test_threshold_uses_raw_not_rounded_score() -> None:
    """Raw 0.504 rounds to 0.50 in the response, but the threshold check
    uses the RAW score. So 0.504 DOES cross 0.5 → suggestion exists."""
    cats = [_category("Vehicles")]
    use_case = _use_case(cats, {"Vehicles": 0.504})

    response = await use_case.execute(title="X", attributes={}, tenant_id=uuid4())

    assert response.suggestion is not None  # raw 0.504 >= 0.5
    assert response.suggestion.score == pytest.approx(0.50)  # rounded for display


# --- Tenant scoping (1) ---


async def test_tenant_id_none_passes_through_to_repo() -> None:
    """SUPER_ADMIN scenario: tenant_id=None, repo returns GLOBAL templates."""
    cats = [_category("Vehicles")]
    mock_repo = AsyncMock()
    mock_repo.get_active_roots = AsyncMock(return_value=cats)
    use_case = InferCategoryUseCase(
        category_repository=mock_repo,
        inferrer=_inferrer_with_scores({"Vehicles": 0.85}),
    )

    response = await use_case.execute(title="X", attributes={}, tenant_id=None)

    mock_repo.get_active_roots.assert_awaited_once_with(None)
    assert response.suggestion is not None
    assert response.suggestion.name == "Vehicles"


# --- Constants contract (pins the spec's locked values) ---


def test_threshold_constant_is_0_5() -> None:
    assert SINGLE_SUGGESTION_THRESHOLD == 0.5


def test_max_alternatives_constant_is_5() -> None:
    assert MAX_ALTERNATIVES == 5


def test_score_display_decimals_constant_is_2() -> None:
    assert SCORE_DISPLAY_DECIMALS == 2
