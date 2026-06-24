"""Category auto-inference DTOs (T3).

The endpoint takes a ``CategoryInferenceRequest`` (title + attributes)
and returns a ``CategoryInferenceResponse`` with a single suggestion
(global best above threshold) and a capped alternatives list (top 5
by score, including the suggestion so the form can render it in the
dropdown with the rest).
"""

from uuid import UUID

from pydantic import BaseModel, Field


class CategoryInferenceRequest(BaseModel):
    """Request body for ``POST /api/v1/categories/infer``."""

    title: str = Field(..., min_length=1, max_length=255)
    # default_factory makes `attributes` optional in the request body —
    # both missing and explicit `{}` are accepted (Pydantic project pattern).
    attributes: dict[str, object] = Field(default_factory=dict)


class CategoryInferenceItem(BaseModel):
    """A single (category_id, name, score) tuple in the response."""

    category_id: UUID
    name: str
    # Display value: rounded to SCORE_DISPLAY_DECIMALS by the use case.
    score: float = Field(..., ge=0.0, le=1.0)


class CategoryInferenceResponse(BaseModel):
    """Response body for the inference endpoint."""

    suggestion: CategoryInferenceItem | None
    # max_length enforces the cap-5 server-side; the use case already
    # truncates but the constraint prevents accidental drift.
    alternatives: list[CategoryInferenceItem] = Field(..., max_length=5)
