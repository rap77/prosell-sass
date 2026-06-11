"""SQLAlchemy implementation of Product repository."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.product import Product
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.models.product_image_model import ProductImageModel
from prosell.infrastructure.models.product_model import ProductModel


class SqlAlchemyProductRepository(AbstractProductRepository):
    """SQLAlchemy implementation of ProductRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, product: Product) -> Product:
        """Create a new product."""
        model = ProductModel(
            id=product.id,
            tenant_id=product.tenant_id,
            organization_id=product.organization_id,
            category_id=product.category_id,
            title=product.title,
            slug=product.slug,
            description=product.description,
            price_cents=product.price_cents,
            currency=product.currency,
            condition=product.condition.value,
            status=product.status.value,
            attributes=product.attributes,
            image_urls=product.image_urls,
            cover_image_key=product.cover_image_key,
            location_city=product.location_city,
            location_state=product.location_state,
            location_zip=product.location_zip,
            is_featured=product.is_featured,
            view_count=product.view_count,
            favorite_count=product.favorite_count,
            submitted_for_approval_at=product.submitted_for_approval_at,
            submitted_by=product.submitted_by,
            approved_at=product.approved_at,
            approved_by=product.approved_by,
            rejection_reason=product.rejection_reason,
            published_at=product.published_at,
            sold_at=product.sold_at,
            archived_at=product.archived_at,
            created_at=product.created_at,
            updated_at=product.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, product_id: UUID, tenant_id: UUID) -> Product | None:
        """Get product by ID with optional tenant isolation.

        When tenant_id == UUID(int=0), the tenant filter is skipped.
        This is used by internal use cases (e.g. CreateVehicleUseCase) that
        reference a product by ID without tenant context.
        """
        stmt = select(ProductModel).where(ProductModel.id == product_id)
        if tenant_id != UUID(int=0):
            stmt = stmt.where(ProductModel.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_slug(self, slug: str, tenant_id: UUID) -> Product | None:
        """Get product by slug."""
        stmt = select(ProductModel).where(
            ProductModel.slug == slug,
            ProductModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_vin(self, vin: str, tenant_id: UUID) -> Product | None:
        """Get product by VIN for upsert operations.

        Searches in product attributes JSONB column where VIN is stored.
        """
        # VIN is stored in attributes->>'vin'

        stmt = select(ProductModel).where(
            func.jsonb_extract_path_text(ProductModel.attributes, "vin") == vin,
            ProductModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_all(
        self,
        tenant_id: UUID,
        organization_id: UUID | None = None,
        category_id: UUID | None = None,
        status: ProductStatus | None = None,
        condition: ProductCondition | None = None,
        is_featured: bool | None = None,
        search_query: str | None = None,
        min_price_cents: int | None = None,
        max_price_cents: int | None = None,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> list[Product]:
        """Get products with optional filters."""
        stmt = select(ProductModel).where(ProductModel.tenant_id == tenant_id)

        # Apply filters
        if organization_id is not None:
            stmt = stmt.where(ProductModel.organization_id == organization_id)

        if category_id is not None:
            stmt = stmt.where(ProductModel.category_id == category_id)

        if status is not None:
            stmt = stmt.where(ProductModel.status == status.value)

        if condition is not None:
            stmt = stmt.where(ProductModel.condition == condition.value)

        if is_featured is not None:
            stmt = stmt.where(ProductModel.is_featured == is_featured)

        # Text search
        if search_query:
            search_term = f"%{search_query}%"
            stmt = stmt.where(
                or_(
                    ProductModel.title.ilike(search_term),
                    ProductModel.description.ilike(search_term),
                )
            )

        # Price range
        if min_price_cents is not None:
            stmt = stmt.where(ProductModel.price_cents >= min_price_cents)

        if max_price_cents is not None:
            stmt = stmt.where(ProductModel.price_cents <= max_price_cents)

        # Ordering
        order_column = getattr(ProductModel, order_by, ProductModel.created_at)
        if order_desc:
            stmt = stmt.order_by(order_column.desc())
        else:
            stmt = stmt.order_by(order_column.asc())

        stmt = stmt.offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_by_organization(
        self,
        organization_id: UUID,
        tenant_id: UUID,
        status: ProductStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Product]:
        """Get products by organization."""
        stmt = select(ProductModel).where(
            ProductModel.organization_id == organization_id,
            ProductModel.tenant_id == tenant_id,
        )

        if status is not None:
            stmt = stmt.where(ProductModel.status == status.value)

        stmt = stmt.order_by(ProductModel.created_at.desc())
        stmt = stmt.offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_by_category(
        self,
        category_id: UUID,
        tenant_id: UUID,
        status: ProductStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Product]:
        """Get products by category."""
        stmt = select(ProductModel).where(
            ProductModel.category_id == category_id,
            ProductModel.tenant_id == tenant_id,
        )

        if status is not None:
            stmt = stmt.where(ProductModel.status == status.value)

        stmt = stmt.order_by(ProductModel.created_at.desc())
        stmt = stmt.offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_pending_approval(
        self,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Product]:
        """Get products pending approval."""
        stmt = (
            select(ProductModel)
            .where(
                ProductModel.tenant_id == tenant_id,
                ProductModel.status == ProductStatus.PENDING.value,
            )
            .order_by(ProductModel.submitted_for_approval_at.asc())
        )

        stmt = stmt.offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def update(self, product: Product) -> Product:
        """Update an existing product."""
        from datetime import datetime

        stmt = select(ProductModel).where(ProductModel.id == product.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"Product not found: {product.id}")

        model.title = product.title
        model.slug = product.slug
        model.description = product.description
        model.price_cents = product.price_cents
        model.currency = product.currency
        model.condition = product.condition.value
        model.status = product.status.value
        model.attributes = product.attributes
        model.image_urls = product.image_urls
        model.cover_image_key = product.cover_image_key
        model.location_city = product.location_city
        model.location_state = product.location_state
        model.location_zip = product.location_zip
        model.is_featured = product.is_featured
        model.view_count = product.view_count
        model.favorite_count = product.favorite_count
        model.submitted_for_approval_at = product.submitted_for_approval_at
        model.submitted_by = product.submitted_by
        model.approved_at = product.approved_at
        model.approved_by = product.approved_by
        model.rejection_reason = product.rejection_reason
        model.published_at = product.published_at
        model.sold_at = product.sold_at
        model.archived_at = product.archived_at

        # Manually update updated_at to avoid async greenlet issues with onupdate
        model.updated_at = datetime.now(UTC)

        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, product_id: UUID, tenant_id: UUID) -> bool:
        """Hard-delete a product. ON DELETE CASCADE handles vehicle deletion automatically."""
        stmt = select(ProductModel).where(
            ProductModel.id == product_id,
            ProductModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return False

        await self.session.delete(model)
        await self.session.flush()
        return True

    async def count(
        self,
        tenant_id: UUID,
        organization_id: UUID | None = None,
        status: ProductStatus | None = None,
    ) -> int:
        """Count products."""
        stmt = select(func.count(ProductModel.id)).where(
            ProductModel.tenant_id == tenant_id,
        )

        if organization_id is not None:
            stmt = stmt.where(ProductModel.organization_id == organization_id)

        if status is not None:
            stmt = stmt.where(ProductModel.status == status.value)

        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def increment_view_count(self, product_id: UUID, tenant_id: UUID) -> None:
        """Increment product view count."""
        from datetime import datetime

        stmt = select(ProductModel).where(
            ProductModel.id == product_id,
            ProductModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            model.view_count += 1
            model.updated_at = datetime.now(UTC)
            await self.session.flush()

    async def increment_favorite_count(self, product_id: UUID, tenant_id: UUID) -> None:
        """Increment product favorite count."""
        stmt = select(ProductModel).where(
            ProductModel.id == product_id,
            ProductModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            model.favorite_count += 1
            await self.session.flush()

    async def decrement_favorite_count(self, product_id: UUID, tenant_id: UUID) -> None:
        """Decrement product favorite count."""
        stmt = select(ProductModel).where(
            ProductModel.id == product_id,
            ProductModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            model.favorite_count = max(0, model.favorite_count - 1)
            await self.session.flush()

    async def get_featured(
        self,
        tenant_id: UUID,
        limit: int = 10,
    ) -> list[Product]:
        """Get featured products."""
        stmt = (
            select(ProductModel)
            .where(
                ProductModel.tenant_id == tenant_id,
                ProductModel.is_featured,
                ProductModel.status == ProductStatus.PUBLISHED.value,
            )
            .order_by(ProductModel.created_at.desc())
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def search(
        self,
        tenant_id: UUID,
        query: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Product]:
        """Full-text search products."""
        search_term = f"%{query}%"
        stmt = (
            select(ProductModel)
            .where(
                ProductModel.tenant_id == tenant_id,
                ProductModel.status == ProductStatus.PUBLISHED.value,
                or_(
                    ProductModel.title.ilike(search_term),
                    ProductModel.description.ilike(search_term),
                ),
            )
            .order_by(ProductModel.created_at.desc())
        )

        stmt = stmt.offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_recently_viewed(
        self,
        tenant_id: UUID,
        product_ids: list[UUID],
        limit: int = 10,
    ) -> list[Product]:
        """Get recently viewed products."""
        if not product_ids:
            return []

        stmt = (
            select(ProductModel)
            .where(
                ProductModel.tenant_id == tenant_id,
                ProductModel.id.in_(product_ids),
                ProductModel.status == ProductStatus.PUBLISHED.value,
            )
            .order_by(ProductModel.created_at.desc())
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def set_primary_image(self, product_id: UUID, image_id: UUID, tenant_id: UUID) -> bool:  # noqa: ARG002
        """
        Set an image as primary for a product.

        Unsets is_primary on all other images before setting the new one.
        """
        # First, verify the image belongs to the product
        verify_stmt = select(ProductImageModel).where(
            ProductImageModel.id == image_id,
            ProductImageModel.product_id == product_id,
        )
        verify_result = await self.session.execute(verify_stmt)
        if not verify_result.scalar_one_or_none():
            return False  # Image not found or doesn't belong to product

        # Unset is_primary on all images of this product
        unset_stmt = select(ProductImageModel).where(
            ProductImageModel.product_id == product_id,
            ProductImageModel.is_primary.is_(True),
        )
        unset_result = await self.session.execute(unset_stmt)
        images_to_unset = unset_result.scalars().all()

        for img in images_to_unset:
            img.is_primary = False

        # Set is_primary on the target image
        set_stmt = select(ProductImageModel).where(ProductImageModel.id == image_id)
        set_result = await self.session.execute(set_stmt)
        target_image = set_result.scalar_one_or_none()

        if target_image:
            target_image.is_primary = True
            await self.session.flush()
            return True

        return False

    async def get_sold_before(self, cutoff: datetime) -> list[Product]:
        """Return all SOLD products whose sold_at is strictly before cutoff.

        System-wide maintenance query (no tenant filter); products that left
        SOLD (e.g. returned) are excluded by the status filter.
        """
        stmt = select(ProductModel).where(
            ProductModel.status == ProductStatus.SOLD.value,
            ProductModel.sold_at.is_not(None),
            ProductModel.sold_at < cutoff,
        )
        result = await self.session.execute(stmt)
        return [self._to_entity(model) for model in result.scalars().all()]

    def _to_entity(self, model: ProductModel) -> Product:
        """Convert ORM model to domain entity."""
        return Product.model_validate(model, from_attributes=True)
