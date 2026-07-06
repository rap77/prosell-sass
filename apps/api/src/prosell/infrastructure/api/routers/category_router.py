"""Category router."""

import csv as csv_module
import io
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel as _BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.category import (
    CategoryResponse,
    CreateCategoryRequest,
)
from prosell.application.dto.category.update import (
    UpdateAttributeSchemaRequest,
    UpdateCategoryRequest,
)
from prosell.application.use_cases.category.create_category import CreateCategoryUseCase
from prosell.application.use_cases.category.delete_category import DeleteCategoryUseCase
from prosell.application.use_cases.category.list_categories import (
    CategoryListResponse,
    ListCategoriesUseCase,
)
from prosell.application.use_cases.category.patch_category_schema import (
    PatchCategorySchemaUseCase,
)
from prosell.application.use_cases.category.update_attribute_schema import (
    UpdateCategoryAttributeSchemaUseCase,
)
from prosell.application.use_cases.category.update_category import UpdateCategoryUseCase
from prosell.domain.entities.user import User
from prosell.domain.exceptions.category_exceptions import (
    CategoryNotFoundError,
    SchemaMigrationRequiresForceError,
)
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.services.csv_product_parser import ALL_KNOWN_COLUMNS, UNIVERSAL_COLUMNS
from prosell.infrastructure.api.dependencies import (
    get_async_session,
    get_current_auth_user_from_cookie,
)
from prosell.infrastructure.api.middleware import smart_rate_limit
from prosell.infrastructure.models.category_schema_change_model import (
    CategorySchemaChangeModel,
)
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.category_schema_repository_impl import (
    SqlAlchemyCategorySchemaRepository,
)

# attribute_schema maps field_name → field definition (type, required, options…) — free-form JSONB
AttributeSchemaDict = dict[str, dict[str, object]]


class _CategorySchemaResponse(_BaseModel):
    attributes: AttributeSchemaDict
    attribute_groups: list[dict[str, object]] = []
    schema_version: str
    updated_at: str
    migration_warnings: list[str] = []
    requires_force: bool = False


class _SchemaChangeEntry(_BaseModel):
    id: str
    changed_at: str
    changed_by_user_id: str
    change_summary: str
    migration_applied: bool
    migration_warnings: list[str]


class _PatchSchemaRequest(_BaseModel):
    attribute_schema: AttributeSchemaDict
    attribute_groups: list[dict[str, object]] = []


class _CategoryFieldsResponse(_BaseModel):
    fields: list[dict[str, object]]


router = APIRouter()


async def get_category_repository(
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractCategoryRepository:
    """Get category repository instance."""
    return SqlAlchemyCategoryRepository(db)


async def get_schema_repository(
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyCategorySchemaRepository:
    """Get category schema repository instance."""
    return SqlAlchemyCategorySchemaRepository(db)


# Annotated dep aliases (FastAPI 0.100+ pattern — avoids B008 default-value Depends)
CurrentUser = Annotated[User, Depends(get_current_auth_user_from_cookie)]
CategoryRepo = Annotated[AbstractCategoryRepository, Depends(get_category_repository)]
SchemaRepo = Annotated[SqlAlchemyCategorySchemaRepository, Depends(get_schema_repository)]
DB = Annotated[AsyncSession, Depends(get_async_session)]


def _require_platform_admin(user: User) -> None:
    """Gate category mutations to the ProSell platform admin (super_admin).

    The category taxonomy is GENERAL and platform-managed: only the ProSell
    admin defines/maintains it (including multi-level niches). Tenants — org
    admins and sales agents alike — may READ categories to classify their own
    products, but never create/update/soft-delete them. An organization admin
    (role ``admin``) is intentionally NOT enough.
    """
    if not user.has_role("super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the ProSell platform admin can manage categories",
        )


@router.get("", response_model=CategoryListResponse)
@smart_rate_limit("api")
async def list_categories(
    request: Request,  # pyright: ignore[reportUnusedParameter]  # noqa: ARG001 — required by slowapi rate-limit introspection
    current_user: CurrentUser,
    repo: CategoryRepo,
    parent_id: UUID | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
    flat: bool = False,
) -> CategoryListResponse:
    """
    List categories with optional filters.

    - **parent_id**: Filter by parent category (None = root only)
    - **is_active**: Filter by active status (ignored for non-admins — always True)
    - **skip**: Pagination offset
    - **limit**: Max records per page
    - **flat**: If true, return all categories ignoring parent_id (for admin tree view)

    Non-admin users only see active categories.

    Rate limit: 100 requests per minute per user/IP.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    # Role-based check: User entity has no .role attr — use has_role()
    is_admin = current_user.has_role(["super_admin", "admin"])

    use_case = ListCategoriesUseCase(repo)

    return await use_case.execute(
        tenant_id=tenant_id,
        parent_id=parent_id,
        is_active=is_active,
        skip=skip,
        limit=limit,
        is_admin=is_admin,
        flat=flat,
    )


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    request: CreateCategoryRequest,
    current_user: CurrentUser,
    repo: CategoryRepo,
) -> CategoryResponse:
    """
    Create a new category.

    Only the ProSell platform admin (super_admin) can create categories.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    _require_platform_admin(current_user)

    use_case = CreateCategoryUseCase(repo)

    try:
        return await use_case.execute(request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)) from e


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: UUID,
    current_user: CurrentUser,
    repo: CategoryRepo,
) -> CategoryResponse:
    """Get a category by ID."""
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    category = await repo.get_by_id_or_global(category_id, tenant_id)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    return CategoryResponse.from_entity(category)


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    request: UpdateCategoryRequest,
    current_user: CurrentUser,
    repo: CategoryRepo,
) -> CategoryResponse:
    """Update category basic information."""
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    _require_platform_admin(current_user)
    tenant_id = current_user.tenant_id

    use_case = UpdateCategoryUseCase(repo)

    return await use_case.execute(category_id, tenant_id, request, is_platform_admin=True)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    current_user: CurrentUser,
    repo: CategoryRepo,
) -> None:
    """
    Soft-delete a category (deactivates it).

    The category remains in the database but is hidden from non-admin users.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    _require_platform_admin(current_user)
    tenant_id = current_user.tenant_id

    use_case = DeleteCategoryUseCase(repo)

    await use_case.execute(category_id, tenant_id, is_platform_admin=True)


@router.patch("/{category_id}/attribute-schema", response_model=CategoryResponse)
async def update_category_attribute_schema(
    category_id: UUID,
    request: UpdateAttributeSchemaRequest,
    current_user: CurrentUser,
    repo: CategoryRepo,
) -> CategoryResponse:
    """
    Replace the attribute_schema for a category.

    Uses REPLACE semantics — old schema is discarded entirely.
    Warning: existing products may have attributes that no longer conform
    to the new schema after this operation.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    _require_platform_admin(current_user)
    tenant_id = current_user.tenant_id

    use_case = UpdateCategoryAttributeSchemaUseCase(repo)

    return await use_case.execute(
        category_id, tenant_id, request.attribute_schema, is_platform_admin=True
    )


@router.get("/{category_id}/schema", response_model=_CategorySchemaResponse)
async def get_category_schema(
    category_id: UUID,
    current_user: CurrentUser,
    repo: CategoryRepo,
) -> _CategorySchemaResponse:
    """Get category attribute_schema with version metadata."""
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    category = await repo.get_by_id_or_global(category_id, current_user.tenant_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    return _CategorySchemaResponse(
        attributes=category.attribute_schema or {},
        attribute_groups=category.attribute_groups or [],
        schema_version=category.updated_at.isoformat(),
        updated_at=category.updated_at.isoformat(),
    )


@router.patch("/{category_id}/schema", response_model=_CategorySchemaResponse)
async def patch_category_schema(
    category_id: UUID,
    request: _PatchSchemaRequest,
    current_user: CurrentUser,
    repo: CategoryRepo,
    schema_repo: SchemaRepo,
    force: bool = False,
) -> _CategorySchemaResponse:
    """
    Replace category attribute_schema with migration warnings.

    Without ?force=true: returns 422 with migration_warnings if any type or
    required changes affect existing products.
    With ?force=true: applies schema and migrates compatible attribute values.
    Writes to audit log on every successful change.
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    _require_platform_admin(current_user)

    use_case = PatchCategorySchemaUseCase(category_repository=repo, schema_repository=schema_repo)
    try:
        result = await use_case.execute(
            category_id=category_id,
            tenant_id=current_user.tenant_id,
            new_schema=request.attribute_schema,
            new_groups=request.attribute_groups,
            force=force,
            user_id=current_user.id,
        )
    except CategoryNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SchemaMigrationRequiresForceError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "migration_warnings": exc.warnings,
                "requires_force": exc.requires_force,
                "hint": "Re-send with ?force=true to apply",
            },
        ) from exc

    return _CategorySchemaResponse(
        attributes=result.schema,
        attribute_groups=result.attribute_groups,
        schema_version=result.schema_version,
        updated_at=result.schema_version,
        migration_warnings=result.migration_warnings,
        requires_force=result.requires_force,
    )


@router.get("/{category_id}/schema/template.csv", response_model=None)
async def get_category_schema_template(
    category_id: UUID,
    current_user: CurrentUser,
    repo: CategoryRepo,
) -> StreamingResponse:
    """Download an empty CSV template with this category's attribute headers."""
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    category = await repo.get_by_id_or_global(category_id, current_user.tenant_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    schema_keys = list((category.attribute_schema or {}).keys())
    extra_cols = [
        "description",
        "condition",
        "currency",
        "location_city",
        "location_state",
        "location_zip",
    ]
    headers = (
        list(UNIVERSAL_COLUMNS)
        + extra_cols
        + [k for k in schema_keys if k not in ALL_KNOWN_COLUMNS]
    )

    output = io.StringIO()
    writer = csv_module.writer(output)
    writer.writerow(headers)

    return StreamingResponse(
        iter([output.getvalue().encode("utf-8")]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="template-{category_id}.csv"'},
    )


@router.post(
    "/{category_id}/schema/clone-from/{source_category_id}",
    response_model=_CategorySchemaResponse,
)
async def clone_category_schema(
    category_id: UUID,
    source_category_id: UUID,
    current_user: CurrentUser,
    repo: CategoryRepo,
    schema_repo: SchemaRepo,
    force: bool = False,
) -> _CategorySchemaResponse:
    """Copy source category's attribute_schema (and attribute_groups) to target (full overwrite)."""
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    _require_platform_admin(current_user)

    source = await repo.get_by_id_or_global(source_category_id, current_user.tenant_id)
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Source category not found"
        )

    use_case = PatchCategorySchemaUseCase(category_repository=repo, schema_repository=schema_repo)
    try:
        result = await use_case.execute(
            category_id=category_id,
            tenant_id=current_user.tenant_id,
            new_schema=source.attribute_schema or {},
            new_groups=list(source.attribute_groups or []),
            force=force,
            user_id=current_user.id,
        )
    except CategoryNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SchemaMigrationRequiresForceError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "migration_warnings": exc.warnings,
                "requires_force": exc.requires_force,
                "hint": "Re-send with ?force=true to apply",
            },
        ) from exc

    return _CategorySchemaResponse(
        attributes=result.schema,
        attribute_groups=result.attribute_groups,
        schema_version=result.schema_version,
        updated_at=result.schema_version,
        migration_warnings=result.migration_warnings,
    )


@router.get("/{category_id}/schema/history", response_model=list[_SchemaChangeEntry])
async def get_category_schema_history(
    category_id: UUID,
    current_user: CurrentUser,
    repo: CategoryRepo,
    db: DB,
) -> list[_SchemaChangeEntry]:
    """Return audit log for category schema changes, newest first (max 100)."""
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")

    category = await repo.get_by_id_or_global(category_id, current_user.tenant_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    result = await db.execute(
        select(CategorySchemaChangeModel)
        .where(CategorySchemaChangeModel.category_id == category_id)
        .order_by(CategorySchemaChangeModel.changed_at.desc())
        .limit(100)
    )
    rows = result.scalars().all()
    return [
        _SchemaChangeEntry(
            id=str(row.id),
            changed_at=row.changed_at.isoformat(),
            changed_by_user_id=str(row.changed_by_user_id),
            change_summary=row.change_summary,
            migration_applied=row.migration_applied,
            migration_warnings=row.migration_warnings or [],
        )
        for row in rows
    ]


@router.get("/{category_id}/fields", response_model=_CategoryFieldsResponse)
async def get_category_fields(
    category_id: UUID,
    current_user: CurrentUser,
    repo: CategoryRepo,
) -> _CategoryFieldsResponse:
    """Get field configuration for a category."""
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    tenant_id = current_user.tenant_id

    category = await repo.get_by_id_or_global(category_id, tenant_id)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    return _CategoryFieldsResponse(fields=category.field_config)
