"""POST /api/v1/categories/infer — category auto-inference endpoint (T4).

Thin adapter: takes the request, delegates to ``InferCategoryUseCase``,
returns the typed response. NO request body is logged (H3 privacy
rule: ``title`` and ``attributes`` may contain PII or competitor
product details).
"""

from fastapi import APIRouter, Depends, Request

from prosell.application.dto.category.inference import (
    CategoryInferenceRequest,
    CategoryInferenceResponse,
)
from prosell.application.use_cases.category.infer_category import (
    InferCategoryUseCase,
)
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_infer_category_use_case,
)
from prosell.infrastructure.api.middleware import smart_rate_limit

router = APIRouter(prefix="/categories", tags=["categories"])


@router.post("/infer", response_model=CategoryInferenceResponse)
@smart_rate_limit("api")
async def infer_category(
    request: Request,  # noqa: ARG001 — required by slowapi rate-limit introspection
    request_body: CategoryInferenceRequest,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    use_case: InferCategoryUseCase = Depends(get_infer_category_use_case),
) -> CategoryInferenceResponse:
    """Suggest a category for a new product based on title + attributes.

    Returns ``{suggestion, alternatives}``. The suggestion is the
    single best match above the threshold; alternatives are the top
    5 by score. NEVER auto-applies — the form UI shows the suggestion
    as a hint, the seller must click to confirm.

    Privacy (H3): this endpoint does NOT log the request body
    (``title`` / ``attributes`` may contain PII or competitive
    product details). The use case logs only status, latency, and
    user id.
    """
    # tenant_id is sourced from the JWT (never the request body — IDOR
    # prevention, project convention). SUPER_ADMIN has tenant_id=None,
    # which is allowed by InferCategoryUseCase (returns GLOBAL templates).
    return await use_case.execute(
        title=request_body.title,
        attributes=request_body.attributes,
        tenant_id=current_user.tenant_id,
    )
