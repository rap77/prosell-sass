"""Category router."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.category import (
    CategoryListResponse,
    CategoryResponse,
    CreateCategoryRequest,
)
from prosell.application.dto.category.update import UpdateAttributeSchemaRequest, UpdateCategoryRequest
from prosell.application.use_cases.category.create_category import CreateCategoryUseCase
from prosell.application.use_cases.category.delete_category import DeleteCategoryUseCase
from prosell.application.use_cases.category.list_categories import ListCategoriesUseCase
from prosell.application.use_cases.category.update_attribute_schema import UpdateCategoryAttributeSchemaUseCase
from prosell.application.use_cases.category.update_category import UpdateCategoryUseCase
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.infrastructure.api.dependencies import (
    get_async_session,
    get_current_auth_user_from_cookie,
)
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)

router = APIRouter()


async def get_category_repository(session: AsyncSession) -> AbstractCategoryRepository:
    """Get category repository instance."""
    return SqlAlchemyCategoryRepository(session)


@router.get("", response_model=CategoryListResponse)
async def list_categories(
    parent_id: UUID | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> CategoryListResponse:
    """
    List categories with optional filters.

    - **parent_id**: Filter by parent category (None = root only)
    - **is_active**: Filter by active status (ignored for non-admins — always True)
    - **skip**: Pagination offset
    - **limit**: Max records per page

    Non-admin users only see active categories.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    # Role-based check: User entity has no .role attr — use has_role() which checks role.role_type.value
    is_admin = current_user.has_role(["super_admin", "admin"])

    repo = SqlAlchemyCategoryRepository(db)
    use_case = ListCategoriesUseCase(repo)

    return await use_case.execute(
        tenant_id=tenant_id,
        parent_id=parent_id,
        is_active=is_active,
        skip=skip,
        limit=limit,
        is_admin=is_admin,
    )


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    request: CreateCategoryRequest,
    _current_user=Depends(get_current_auth_user_from_cookie),
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
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> CategoryResponse:
    """Get a category by ID."""
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyCategoryRepository(db)
    category = await repo.get_by_id(category_id, tenant_id)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    return CategoryResponse.from_entity(category)


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    request: UpdateCategoryRequest,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> CategoryResponse:
    """Update category basic information."""
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyCategoryRepository(db)
    use_case = UpdateCategoryUseCase(repo)

    return await use_case.execute(category_id, tenant_id, request)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> None:
    """
    Soft-delete a category (deactivates it).

    The category remains in the database but is hidden from non-admin users.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyCategoryRepository(db)
    use_case = DeleteCategoryUseCase(repo)

    await use_case.execute(category_id, tenant_id)


@router.patch("/{category_id}/attribute-schema", response_model=CategoryResponse)
async def update_category_attribute_schema(
    category_id: UUID,
    request: UpdateAttributeSchemaRequest,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> CategoryResponse:
    """
    Replace the attribute_schema for a category.

    Uses REPLACE semantics — old schema is discarded entirely.
    Warning: existing products may have attributes that no longer conform
    to the new schema after this operation.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyCategoryRepository(db)
    use_case = UpdateCategoryAttributeSchemaUseCase(repo)

    return await use_case.execute(category_id, tenant_id, request.attribute_schema)


@router.get("/{category_id}/fields", response_model=dict)
async def get_category_fields(
    category_id: UUID,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> dict:
    """Get field configuration for a category."""
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyCategoryRepository(db)
    category = await repo.get_by_id(category_id, tenant_id)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    return {"fields": category.field_config}
