"""Category router."""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.category import (
    CategoryListResponse,
    CategoryResponse,
    CreateCategoryRequest,
)
from prosell.application.use_cases.category.create_category import CreateCategoryUseCase
from prosell.application.use_cases.category.list_categories import ListCategoriesUseCase
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.infrastructure.api.dependencies import get_async_session, get_current_auth_user
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)

router = APIRouter(prefix="/categories", tags=["categories"])


async def get_category_repository(session: AsyncSession) -> AbstractCategoryRepository:
    """Get category repository instance."""
    return SqlAlchemyCategoryRepository(session)


@router.get("", response_model=CategoryListResponse)
async def list_categories(
    parent_id: UUID | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_auth_user),
    db: AsyncSession = Depends(get_async_session),
) -> CategoryListResponse:
    """
    List categories with optional filters.

    - **parent_id**: Filter by parent category (None = root only)
    - **is_active**: Filter by active status
    - **skip**: Pagination offset
    - **limit**: Max records per page
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyCategoryRepository(db)
    use_case = ListCategoriesUseCase(repo)

    return await use_case.execute(
        tenant_id=tenant_id,
        parent_id=parent_id,
        is_active=is_active,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    request: CreateCategoryRequest,
    _current_user=Depends(get_current_auth_user),
    db: AsyncSession = Depends(get_async_session),
) -> CategoryResponse:
    """
    Create a new category.

    Only users with MASTER role can create categories.
    """
    repo = SqlAlchemyCategoryRepository(db)
    use_case = CreateCategoryUseCase(repo)

    return await use_case.execute(request)


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: UUID,
    current_user=Depends(get_current_auth_user),
    db: AsyncSession = Depends(get_async_session),
) -> CategoryResponse:
    """Get a category by ID."""
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyCategoryRepository(db)
    category = await repo.get_by_id(category_id, tenant_id)

    if not category:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Category not found")

    return CategoryResponse.from_entity(category)


@router.get("/{category_id}/fields", response_model=dict)
async def get_category_fields(
    category_id: UUID,
    current_user=Depends(get_current_auth_user),
    db: AsyncSession = Depends(get_async_session),
) -> dict:
    """Get field configuration for a category."""
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyCategoryRepository(db)
    category = await repo.get_by_id(category_id, tenant_id)

    if not category:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Category not found")

    return {"fields": category.field_config}
