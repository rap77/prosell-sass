"""Product router."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.product import (
    CreateProductRequest,
    ProductListResponse,
    ProductResponse,
    UpdateProductRequest,
)
from prosell.application.use_cases.product.approve_product import ApproveProductUseCase
from prosell.application.use_cases.product.create_product import CreateProductUseCase
from prosell.application.use_cases.product.delete_product import DeleteProductUseCase
from prosell.application.use_cases.product.list_products import ListProductsUseCase
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.category_repository_impl import SqlAlchemyCategoryRepository
from prosell.infrastructure.repositories.product_repository_impl import SqlAlchemyProductRepository

router = APIRouter()


async def get_product_repository(session: AsyncSession) -> AbstractProductRepository:
    """Get product repository instance."""
    return SqlAlchemyProductRepository(session)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    request: CreateProductRequest,
    _current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Create a new product.

    Product is created in DRAFT status by default.
    """
    product_repo = SqlAlchemyProductRepository(db)
    category_repo = SqlAlchemyCategoryRepository(db)
    use_case = CreateProductUseCase(product_repo, category_repo)

    return await use_case.execute(request)


@router.get("", response_model=ProductListResponse)
async def list_products(
    organization_id: UUID | None = None,
    category_id: UUID | None = None,
    status: str | None = None,
    condition: str | None = None,
    is_featured: bool | None = None,
    search: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductListResponse:
    """
    List products with optional filters.

    - **organization_id**: Filter by organization
    - **category_id**: Filter by category
    - **status**: Filter by status (draft, pending, published, etc.)
    - **condition**: Filter by condition (new, used, etc.)
    - **is_featured**: Filter by featured status
    - **search**: Text search in title/description
    - **min_price**: Minimum price in cents
    - **max_price**: Maximum price in cents
    - **skip**: Pagination offset
    - **limit**: Max records per page
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    use_case = ListProductsUseCase(repo)

    return await use_case.execute(
        tenant_id=tenant_id,
        organization_id=organization_id,
        category_id=category_id,
        status=status,
        condition=condition,
        is_featured=is_featured,
        search_query=search,
        min_price_cents=min_price,
        max_price_cents=max_price,
        skip=skip,
        limit=limit,
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """Get a product by ID."""
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Increment view count
    await repo.increment_view_count(product_id, tenant_id)

    return ProductResponse.from_entity(product)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    request: UpdateProductRequest,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Update a product.

    Only DRAFT, REJECTED, and PAUSED products can be edited.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Update basic fields
    if request.title is not None:
        product.title = request.title
    if request.description is not None:
        product.description = request.description
    if request.price_cents is not None:
        product.price_cents = request.price_cents
    if request.condition is not None:
        product.condition = request.condition
    if request.attributes is not None:
        product.attributes = request.attributes
    if request.location_city is not None:
        product.location_city = request.location_city
    if request.location_state is not None:
        product.location_state = request.location_state
    if request.location_zip is not None:
        product.location_zip = request.location_zip

    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/submit", response_model=ProductResponse)
async def submit_product_for_approval(
    product_id: UUID,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Submit product for approval.

    Transitions product from DRAFT/REJECTED → PENDING.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.submit_for_approval(current_user.id)
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/approve", response_model=ProductResponse)
async def approve_product(
    product_id: UUID,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Approve a product.

    Transitions product from PENDING → PUBLISHED.
    Requires MASTER or VERIFIER role.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    use_case = ApproveProductUseCase(repo)

    return await use_case.execute(product_id, tenant_id, current_user.id)


@router.post("/{product_id}/reject", response_model=ProductResponse)
async def reject_product(
    product_id: UUID,
    reason: str,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Reject a product.

    Transitions product from PENDING → REJECTED.
    Requires MASTER or VERIFIER role.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.reject(current_user.id, reason)
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/publish", response_model=ProductResponse)
async def publish_product(
    product_id: UUID,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Publish product directly (skip approval).

    Transitions product from PENDING → PUBLISHED.
    Admin only - skips approval workflow.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.publish()
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/pause", response_model=ProductResponse)
async def pause_product(
    product_id: UUID,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Pause a published product.

    Transitions product from PUBLISHED → PAUSED.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.pause()
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/resume", response_model=ProductResponse)
async def resume_product(
    product_id: UUID,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Resume a paused product.

    Transitions product from PAUSED → PUBLISHED.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.resume()
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.post("/{product_id}/mark-sold", response_model=ProductResponse)
async def mark_product_sold(
    product_id: UUID,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Mark product as sold.

    Transitions product from PUBLISHED/RESERVED → SOLD.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.mark_sold()
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> None:
    """
    Hard-delete a product and cascade to vehicle.

    ON DELETE CASCADE on vehicles.product_id ensures vehicle record is
    automatically deleted. This is a permanent, irreversible operation.

    Requires: product must belong to user's tenant.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    use_case = DeleteProductUseCase(repo)

    try:
        await use_case.execute(product_id, tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/{product_id}/archive", response_model=ProductResponse)
async def archive_product(
    product_id: UUID,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> ProductResponse:
    """
    Archive a product (soft delete).

    Transitions any status → ARCHIVED.
    """
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    product = await repo.get_by_id(product_id, tenant_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.archive()
    product = await repo.update(product)

    return ProductResponse.from_entity(product)


@router.get("/featured", response_model=list[ProductResponse])
async def get_featured_products(
    limit: int = 10,
    current_user=Depends(get_current_auth_user_from_cookie),
    db: AsyncSession = Depends(get_async_session),
) -> list[ProductResponse]:
    """Get featured products."""
    tenant_id = current_user.tenant_id  # type: ignore

    repo = SqlAlchemyProductRepository(db)
    products = await repo.get_featured(tenant_id, limit)

    return [ProductResponse.from_entity(p) for p in products]
