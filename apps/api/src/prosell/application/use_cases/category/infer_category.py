"""Category auto-inference use case (T3).

Orchestrates: candidates from the repository → scored by the pure
``CategoryInferrer`` domain service → suggestion + alternatives for the
API response.

The threshold check and the alternatives cap live HERE (not in the
domain service) because they're policy choices, not scoring concerns:

- ``SINGLE_SUGGESTION_THRESHOLD`` (0.5): the global best is the
  suggestion if its raw score is at or above this value. Per H1 fix,
  the cap on alternatives must NOT hide the global best from being
  considered for the suggestion.
- ``MAX_ALTERNATIVES`` (5): display cap on the alternatives list.
- ``SCORE_DISPLAY_DECIMALS`` (2): the response shows the score rounded
  to 2 decimals (UX choice — the threshold check uses the RAW score).
"""

from uuid import UUID

from prosell.application.dto.category.inference import (
    CategoryInferenceItem,
    CategoryInferenceResponse,
)
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.services.category_inferrer import CategoryInferrer

# Locked with user (spec D3): suggest-only, never auto-apply.
SINGLE_SUGGESTION_THRESHOLD = 0.5
# Locked with user (spec D3.1, after H1 fix): display cap only.
MAX_ALTERNATIVES = 5
# Locked with user (spec D7): display precision for the score.
SCORE_DISPLAY_DECIMALS = 2


class InferCategoryUseCase:
    """Suggests a single category for a new product, plus alternatives.

    The caller (form UI) shows the suggestion as a "Sugerido" hint but
    NEVER auto-applies it. The seller must click to confirm.
    """

    def __init__(
        self,
        category_repository: AbstractCategoryRepository,
        inferrer: CategoryInferrer | None = None,
    ) -> None:
        self.category_repository = category_repository
        # Default to the real scorer; tests inject a mock for control.
        self.inferrer = inferrer if inferrer is not None else CategoryInferrer()

    async def execute(
        self,
        title: str,
        attributes: dict[str, object],
        tenant_id: UUID | None,
    ) -> CategoryInferenceResponse:
        """Run the inference pipeline and return a typed response DTO.

        Args:
            title: Product title (post-trim, Pydantic validates non-empty).
            attributes: Product attributes (may be empty).
            tenant_id: Caller's tenant UUID, or None for SUPER_ADMIN
                (GLOBAL templates only).

        Returns:
            ``CategoryInferenceResponse`` with optional suggestion and
            a sorted alternatives list (capped at MAX_ALTERNATIVES).
        """
        candidates = await self.category_repository.get_active_roots(tenant_id)
        if not candidates:
            return CategoryInferenceResponse(suggestion=None, alternatives=[])

        # M1 (I-2 fix): degenerate input — whitespace-only title AND no
        # attributes — collapses to empty result. Pydantic ``min_length=1``
        # accepts ``" "`` (one space), and the scorer's tokenizer drops
        # whitespace to no tokens. Without this guard, the form would
        # flash noise (N rows of score 0.0) on every backspace in the
        # title field. The integration test
        # ``test_infer_returns_empty_for_whitespace_only_title`` pins this
        # at the API boundary; the unit test ``test_empty_response_for_
        # whitespace_only_title_and_empty_attributes`` pins it here so
        # the contract doesn't depend on a running DB.
        if not title.strip() and not attributes:
            return CategoryInferenceResponse(suggestion=None, alternatives=[])

        # Scorer returns [] when there's no signal (title="" AND attrs={}).
        scored = self.inferrer.score(title, attributes, candidates)
        if not scored:
            return CategoryInferenceResponse(suggestion=None, alternatives=[])

        # H1 fix: suggestion is the global best (no cap on search). If the
        # top score is below the threshold, no suggestion.
        suggestion_item: CategoryInferenceItem | None = None
        top_cat, top_raw = scored[0]
        if top_raw >= SINGLE_SUGGESTION_THRESHOLD:
            suggestion_item = CategoryInferenceItem(
                category_id=top_cat.id,
                name=top_cat.name,
                score=round(top_raw, SCORE_DISPLAY_DECIMALS),
            )

        # Alternatives = top MAX_ALTERNATIVES by raw score. The suggestion
        # is naturally included (it's the global best → first element).
        alternatives = [
            CategoryInferenceItem(
                category_id=cat.id,
                name=cat.name,
                score=round(raw_score, SCORE_DISPLAY_DECIMALS),
            )
            for cat, raw_score in scored[:MAX_ALTERNATIVES]
        ]

        return CategoryInferenceResponse(
            suggestion=suggestion_item,
            alternatives=alternatives,
        )
