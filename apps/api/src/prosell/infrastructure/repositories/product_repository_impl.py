"""SQLAlchemy implementation of Product repository."""

from collections.abc import Iterable
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import Boolean, Numeric, Select, cast, func, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.product import Product
from prosell.domain.entities.product_audit_log import ProductAuditLog
from prosell.domain.exceptions.product_exceptions import (
    DuplicateInternalCodeError,
    ProductVersionConflictError,
)
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.value_objects.attribute_filter import AttributeFilter
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus
from prosell.infrastructure.models.product_image_model import ProductImageModel
from prosell.infrastructure.models.product_model import ProductAuditLogModel, ProductModel

#: Single source of truth for the per-key cap on `distinct_attribute_values`.
#: Enforced in SQL via `LIMIT cap + 1` so PostgreSQL never streams more than
#: N + 1 rows; the router detects overflow by `len > cap` and reports the key
#: as truncated. See `product_router.get_category_filter_values`.
FILTER_VALUES_MAX_PER_KEY = 1000


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
            thumbnail_image_key=product.thumbnail_image_key,
            location_city=product.location_city,
            location_state=product.location_state,
            location_zip=product.location_zip,
            is_featured=product.is_featured,
            published_to_marketplace=product.published_to_marketplace,
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
            archived_from_status=product.archived_from_status,
            version=product.version,
            # Note: `internal_code` no longer lives on the product model —
            # it persists inside `attributes["internal_code"]` (JSONB)
            # since migration 20260927_0001 (moved to JSONB) and
            # 20261002_0001 (renamed from `vehicle_code`). The
            # column-to-entity map below is identical to the JSONB-write
            # path; we just rely on the model's `attributes` JSONB field
            # to round-trip the value.
            created_at=product.created_at,
            updated_at=product.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, product_id: UUID, tenant_id: UUID | None) -> Product | None:
        """Get product by ID, optionally with tenant isolation.

        tenant_id=None skips the tenant filter entirely — only internal
        callers without a tenant context should pass None.
        """
        stmt = select(ProductModel).where(ProductModel.id == product_id)
        if tenant_id is not None:
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

    @staticmethod
    def _apply_product_filters(
        stmt: Select,
        tenant_id: UUID | None,
        organization_id: UUID | None = None,
        organization_ids: list[UUID] | None = None,
        category_id: UUID | None = None,
        status: ProductStatus | None = None,
        condition: ProductCondition | None = None,
        is_featured: bool | None = None,
        search_query: str | None = None,
        min_price_cents: int | None = None,
        max_price_cents: int | None = None,
        attribute_filters: list[AttributeFilter] | None = None,
        published_to_marketplace: bool | None = None,
        has_images: bool | None = None,
    ) -> Select:
        """Apply the WHERE clauses shared by `get_all()` and `count()`.

        Kept as one place so the two can never drift on which filters they
        honor (count() used to silently ignore everything but
        tenant_id/organization_id/status, making `total` wrong whenever a
        caller filtered by category, featured, price, search, or attributes).
        """
        if tenant_id is not None:
            stmt = stmt.where(ProductModel.tenant_id == tenant_id)

        if organization_ids:
            # Mutually exclusive with `organization_id` — a non-empty set
            # takes precedence (same "the broader param wins" pattern as
            # `all_organizations` over `organization_id` elsewhere).
            stmt = stmt.where(ProductModel.organization_id.in_(organization_ids))
        elif organization_id is not None:
            stmt = stmt.where(ProductModel.organization_id == organization_id)

        if category_id is not None:
            stmt = stmt.where(ProductModel.category_id == category_id)

        if status is not None:
            stmt = stmt.where(ProductModel.status == status.value)

        if condition is not None:
            stmt = stmt.where(ProductModel.condition == condition.value)

        if is_featured is not None:
            stmt = stmt.where(ProductModel.is_featured == is_featured)

        if published_to_marketplace is not None:
            stmt = stmt.where(ProductModel.published_to_marketplace == published_to_marketplace)

        # `image_urls` is a JSONB array, nullable. The catalog wants
        # "has at least one image" / "has no images" — implemented via
        # PostgreSQL's `jsonb_array_length` (NULL → NULL, which is
        # falsy in both branches, so `True` requires
        # `IS NOT NULL AND length > 0` while `False` collapses the two
        # empty cases into `OR`).
        if has_images is True:
            stmt = stmt.where(
                ProductModel.image_urls.is_not(None)
                & (func.jsonb_array_length(ProductModel.image_urls) > 0)
            )
        elif has_images is False:
            stmt = stmt.where(
                or_(
                    ProductModel.image_urls.is_(None),
                    func.jsonb_array_length(ProductModel.image_urls) == 0,
                )
            )

        if search_query:
            search_term = f"%{search_query}%"
            stmt = stmt.where(
                or_(
                    ProductModel.title.ilike(search_term),
                    ProductModel.description.ilike(search_term),
                )
            )

        if min_price_cents is not None:
            stmt = stmt.where(ProductModel.price_cents >= min_price_cents)

        if max_price_cents is not None:
            stmt = stmt.where(ProductModel.price_cents <= max_price_cents)

        for af in attribute_filters or []:
            col = ProductModel.attributes[af.key].astext
            if af.filter_type == "exact":
                stmt = stmt.where(ProductModel.attributes.contains({af.key: af.value}))
            elif af.filter_type == "select":
                stmt = stmt.where(col.in_(af.values or []))
            elif af.filter_type == "text":
                stmt = stmt.where(col.ilike(f"%{af.value}%"))
            elif af.filter_type == "boolean":
                stmt = stmt.where(cast(col, Boolean) == af.value)
            elif af.filter_type == "range":
                if af.min is not None:
                    stmt = stmt.where(cast(col, Numeric) >= af.min)
                if af.max is not None:
                    stmt = stmt.where(cast(col, Numeric) <= af.max)

        return stmt

    async def get_all(
        self,
        tenant_id: UUID | None,
        organization_id: UUID | None = None,
        organization_ids: list[UUID] | None = None,
        category_id: UUID | None = None,
        status: ProductStatus | None = None,
        condition: ProductCondition | None = None,
        is_featured: bool | None = None,
        search_query: str | None = None,
        min_price_cents: int | None = None,
        max_price_cents: int | None = None,
        attribute_filters: list[AttributeFilter] | None = None,
        published_to_marketplace: bool | None = None,
        has_images: bool | None = None,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> list[Product]:
        """Get products with optional filters. tenant_id=None lifts tenant isolation."""
        stmt = self._apply_product_filters(
            select(ProductModel),
            tenant_id=tenant_id,
            organization_id=organization_id,
            organization_ids=organization_ids,
            category_id=category_id,
            status=status,
            condition=condition,
            is_featured=is_featured,
            search_query=search_query,
            min_price_cents=min_price_cents,
            max_price_cents=max_price_cents,
            attribute_filters=attribute_filters,
            published_to_marketplace=published_to_marketplace,
            has_images=has_images,
        )

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

    async def update(
        self,
        product: Product,
        *,
        changed_by_user_id: UUID | None = None,
        reason: str | None = None,
    ) -> Product:
        """Update an existing product.

        If `product.status` differs from the persisted status, an immutable
        ProductAuditLogModel row is written in the same flush — professional
        state handling requires the write path to make it structurally
        impossible to change status without leaving a trail, rather than
        relying on every call site remembering to log it separately.

        Optimistic locking: `product.version` must match the persisted
        version, or a ProductVersionConflictError is raised and nothing is
        written. Callers must re-fetch and retry on conflict.
        """
        # Defense in depth: filter by tenant_id even though the caller
        # (use case) already validated ownership. Prevents cross-tenant
        # updates if a product entity is incorrectly constructed.
        stmt = select(ProductModel).where(
            ProductModel.id == product.id,
            ProductModel.tenant_id == product.tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"Product not found: {product.id}")

        if model.version != product.version:
            raise ProductVersionConflictError(str(product.id), product.version, model.version)

        old_status = model.status

        model.title = product.title
        model.slug = product.slug
        model.description = product.description
        model.price_cents = product.price_cents
        model.currency = product.currency
        model.condition = product.condition.value
        model.status = product.status.value
        model.attributes = product.attributes
        model.organization_id = product.organization_id
        model.image_urls = product.image_urls
        model.cover_image_key = product.cover_image_key
        model.thumbnail_image_key = product.thumbnail_image_key
        model.location_city = product.location_city
        model.location_state = product.location_state
        model.location_zip = product.location_zip
        model.is_featured = product.is_featured
        model.published_to_marketplace = product.published_to_marketplace
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
        model.archived_from_status = product.archived_from_status
        # Note: `internal_code` round-trips through the JSONB
        # `model.attributes` column; no dedicated column to update.
        model.version += 1

        if old_status != model.status:
            self.session.add(
                ProductAuditLogModel(
                    product_id=product.id,
                    tenant_id=product.tenant_id,
                    old_status=old_status,
                    new_status=model.status,
                    changed_by_user_id=changed_by_user_id,
                    reason=reason,
                )
            )

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
        tenant_id: UUID | None,
        organization_id: UUID | None = None,
        organization_ids: list[UUID] | None = None,
        category_id: UUID | None = None,
        status: ProductStatus | None = None,
        condition: ProductCondition | None = None,
        is_featured: bool | None = None,
        search_query: str | None = None,
        min_price_cents: int | None = None,
        max_price_cents: int | None = None,
        attribute_filters: list[AttributeFilter] | None = None,
        published_to_marketplace: bool | None = None,
        has_images: bool | None = None,
    ) -> int:
        """Count products. tenant_id=None lifts tenant isolation.

        Mirrors every filter `get_all()` accepts via `_apply_product_filters`
        so `total` always matches the filtered set, not the whole tenant.
        """
        stmt = self._apply_product_filters(
            select(func.count(ProductModel.id)),
            tenant_id=tenant_id,
            organization_id=organization_id,
            organization_ids=organization_ids,
            category_id=category_id,
            status=status,
            condition=condition,
            is_featured=is_featured,
            search_query=search_query,
            min_price_cents=min_price_cents,
            max_price_cents=max_price_cents,
            attribute_filters=attribute_filters,
            published_to_marketplace=published_to_marketplace,
            has_images=has_images,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one() or 0

    async def get_price_range(
        self,
        tenant_id: UUID | None,
        organization_id: UUID | None = None,
        organization_ids: list[UUID] | None = None,
        category_id: UUID | None = None,
        status: ProductStatus | None = None,
        condition: ProductCondition | None = None,
        is_featured: bool | None = None,
        search_query: str | None = None,
        attribute_filters: list[AttributeFilter] | None = None,
        published_to_marketplace: bool | None = None,
        has_images: bool | None = None,
    ) -> tuple[int, int] | None:
        """Min/max price_cents for a price range slider's track.

        Deliberately does NOT take min_price_cents/max_price_cents — the
        track's absolute bounds must not shrink to whatever the slider is
        currently set to, only to every OTHER active filter.
        """
        stmt = self._apply_product_filters(
            select(func.min(ProductModel.price_cents), func.max(ProductModel.price_cents)),
            tenant_id=tenant_id,
            organization_id=organization_id,
            organization_ids=organization_ids,
            category_id=category_id,
            status=status,
            condition=condition,
            is_featured=is_featured,
            search_query=search_query,
            attribute_filters=attribute_filters,
            published_to_marketplace=published_to_marketplace,
            has_images=has_images,
        )
        result = await self.session.execute(stmt)
        min_cents, max_cents = result.one()
        if min_cents is None or max_cents is None:
            return None
        return (min_cents, max_cents)

    async def increment_view_count(self, product_id: UUID, tenant_id: UUID) -> None:
        """Increment product view count."""
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

    async def set_primary_image(self, product_id: UUID, image_id: UUID, tenant_id: UUID) -> bool:
        """
        Set an image as primary for a product (tenant-isolated).

        Unsets is_primary on all other images before setting the new one.
        `ProductImageModel` has no `tenant_id` column of its own, so every
        query joins through `ProductModel` to enforce isolation.
        """
        # First, verify the image belongs to the product AND the caller's tenant
        verify_stmt = (
            select(ProductImageModel)
            .join(ProductModel, ProductModel.id == ProductImageModel.product_id)
            .where(
                ProductImageModel.id == image_id,
                ProductImageModel.product_id == product_id,
                ProductModel.tenant_id == tenant_id,
            )
        )
        verify_result = await self.session.execute(verify_stmt)
        if not verify_result.scalar_one_or_none():
            return False  # Image not found, doesn't belong to product, or wrong tenant

        # Unset is_primary on all images of this product
        unset_stmt = (
            select(ProductImageModel)
            .join(ProductModel, ProductModel.id == ProductImageModel.product_id)
            .where(
                ProductImageModel.product_id == product_id,
                ProductImageModel.is_primary.is_(True),
                ProductModel.tenant_id == tenant_id,
            )
        )
        unset_result = await self.session.execute(unset_stmt)
        images_to_unset = unset_result.scalars().all()

        for img in images_to_unset:
            img.is_primary = False

        # Set is_primary on the target image
        set_stmt = (
            select(ProductImageModel)
            .join(ProductModel, ProductModel.id == ProductImageModel.product_id)
            .where(
                ProductImageModel.id == image_id,
                ProductModel.tenant_id == tenant_id,
            )
        )
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

    async def distinct_attribute_values(
        self, tenant_id: UUID, category_id: UUID, keys: list[str]
    ) -> dict[str, list[str]]:
        """Return DISTINCT non-null `attributes[key]` values, tenant+category scoped.

        The cap is enforced in SQL via `LIMIT FILTER_VALUES_MAX_PER_KEY + 1` so
        PostgreSQL never streams more than N + 1 rows over the wire — defense
        against DoS via a key with millions of distinct values. Callers detect
        overflow by `len(out[key]) > FILTER_VALUES_MAX_PER_KEY` and slice the
        trailing sentinel row off.
        """
        out: dict[str, list[str]] = {}
        cap_plus_one = FILTER_VALUES_MAX_PER_KEY + 1
        for key in keys:
            col = ProductModel.attributes[key].astext
            stmt = (
                select(col)
                .where(
                    ProductModel.tenant_id == tenant_id,
                    ProductModel.category_id == category_id,
                    col.isnot(None),
                )
                .distinct()
                .order_by(col)
                .limit(cap_plus_one)
            )
            rows = (await self.session.execute(stmt)).scalars().all()
            out[key] = list(rows)
        return out

    async def get_audit_logs(
        self,
        product_id: UUID,
        tenant_id: UUID,
        limit: int = 50,
    ) -> list[ProductAuditLog]:
        """Get status-change audit history for a product, newest first."""
        stmt = (
            select(ProductAuditLogModel)
            .where(
                ProductAuditLogModel.product_id == product_id,
                ProductAuditLogModel.tenant_id == tenant_id,
            )
            .order_by(ProductAuditLogModel.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return [self._audit_log_to_entity(model) for model in result.scalars().all()]

    def _to_entity(self, model: ProductModel) -> Product:
        """Convert ORM model to domain entity."""
        return Product.model_validate(model, from_attributes=True)

    async def get_max_internal_code(self) -> int | None:
        """Return the largest `internal_code` currently persisted, or `None`.

        Tenant-agnostic: `internal_code` is a globally-unique durable
        product id scoped to vehicle categories; it lives at
        `attributes->>'internal_code'` (JSONB text). The regex filter
        `~ '^[0-9]+$'` keeps non-numeric legacy values from breaking the
        cast; the partial index `ix_products_attrs_internal_code_unique`
        backs the lookup so the query stays O(1) regardless of table size.
        """
        # `attributes->>'internal_code' ~ '^[0-9]+$'` restricts to numeric
        # strings (the index is text-typed to coexist with legacy data);
        # the cast `::bigint` then runs only over rows we know are
        # numeric. MAX is a single scalar aggregate.
        result = await self.session.execute(
            text(
                """
                SELECT MAX((attributes->>'internal_code')::bigint)
                FROM products
                WHERE attributes->>'internal_code' ~ '^[0-9]+$'
                """
            )
        )
        return result.scalar_one_or_none()

    async def allocate_next_internal_code(self) -> int:
        """Allocate a globally unique internal code from PostgreSQL sequence.

        ``nextval`` is atomic across concurrent transactions and does not
        depend on a stale ``MAX(attributes->>'internal_code')`` read.
        PostgreSQL sequences may have gaps after rollbacks, which is
        correct: internal codes require uniqueness and durability, not
        contiguity. The sequence survives both the JSONB move and the
        `vehicle_code` -> `internal_code` rename intact; only the name
        the value lands under changed.
        """
        result = await self.session.execute(text("SELECT nextval('products_internal_code_seq')"))
        internal_code = result.scalar_one()
        if not isinstance(internal_code, int):
            raise RuntimeError("products_internal_code_seq returned a non-integer value")
        return internal_code

    async def internal_code_exists(
        self, code: int, *, exclude_product_id: UUID | None = None
    ) -> bool:
        """Return whether any product uses `code` as its `internal_code`.

        Looks up against `attributes->>'internal_code'` (JSONB text) cast
        to bigint, with the same regex guard as `get_max_internal_code`.
        Hits the partial functional index — single indexed lookup
        regardless of table size. `exclude_product_id` lets
        `UpdateProductUseCase` reuse this check without flagging the
        row being updated as a self-collision.
        """
        # `~ '^[0-9]+$'` guards against non-numeric strings blowing up
        # the bigint cast; numeric rows pass through the cast and compare
        # against the requested code.
        #
        # The `exclude_id` predicate uses `CAST(:p AS UUID) IS NULL`
        # rather than the more common `:p::uuid IS NULL` shortcut —
        # SQLAlchemy's bind-parameter parser eats `:exclude_id::uuid`
        # as a single named bind (`:exclude_id::uuid`) and emits
        # `syntax error at or near ":"` on PostgreSQL when the cast
        # appears adjacent to a parameter name. The `CAST()` form
        # keeps the bind name and the type annotation cleanly separated.
        # When `exclude_product_id` is None, we substitute the zero
        # UUID so the `id != :exclude_id` branch matches every real
        # row (no product carries the zero UUID).
        ZERO_UUID = "00000000-0000-0000-0000-000000000000"  # noqa: N806
        stmt = text(
            """
            SELECT 1
            FROM products
            WHERE attributes->>'internal_code' ~ '^[0-9]+$'
              AND (attributes->>'internal_code')::bigint = :code
              AND id != CAST(:exclude_id AS UUID)
            LIMIT 1
            """
        )
        result = await self.session.execute(
            stmt,
            {
                "code": code,
                "exclude_id": (str(exclude_product_id) if exclude_product_id else ZERO_UUID),
            },
        )
        return result.scalar_one_or_none() is not None

    async def internal_codes_exist(self, codes: Iterable[int]) -> set[int]:
        """Return the subset of `codes` currently in use as `internal_code`.

        Single query: `attributes->>'internal_code' = ANY(:codes_text)`,
        filtered through the regex guard so only numeric candidates are
        cast and compared. Hits the partial functional index
        `ix_products_attrs_internal_code_unique` so the DB scan stays
        bounded by the size of the result. Empty input short-circuits to
        an empty set without touching the DB.
        """
        codes_list = list(codes)
        if not codes_list:
            return set()
        # Cast incoming ints to text to match the JSONB-side representation;
        # the regex on the right side of the comparison
        # (`'^[0-9]+$'` inverted via `~`) catches anything that wouldn't
        # cast cleanly. Single round-trip against the partial functional
        # index.
        stmt = text(
            """
            SELECT DISTINCT (attributes->>'internal_code')::bigint AS code
            FROM products
            WHERE attributes->>'internal_code' = ANY(:codes_text)
              AND attributes->>'internal_code' ~ '^[0-9]+$'
            """
        )
        result = await self.session.execute(
            stmt,
            {"codes_text": [str(c) for c in codes_list]},
        )
        return {row for row in result.scalars().all() if row is not None}

    async def update_internal_code_if_absent(self, product_id: UUID, code: int) -> bool:
        """Atomic conditional backfill — see the abstract method docstring.

        `jsonb_set(..., '{internal_code}', to_jsonb(:code_text), true)`
        writes the value as a JSON text token (matching the JSONB-side
        representation used by the partial unique index and the
        `~ '^[0-9]+$'` regex guard in `get_max_internal_code`). The
        `create_if_missing=true` flag is defensive — `attributes` is
        `NOT NULL DEFAULT '{}'`, so the key never already exists.

        The single-statement `UPDATE ... WHERE id = ... AND
        (attributes->>'internal_code' IS NULL OR attributes->>'internal_code' = '')`
        makes the whole write row-atomic: PostgreSQL guarantees that
        among concurrent writers targeting the same `id`, exactly one
        observes `result.rowcount == 1` and every other observes
        `rowcount == 0`. The use case that calls this treats `False` as
        "another writer already backfilled this product — re-read its
        attributes". The empty-string branch treats legacy rows written
        by older paths as missing too, so a NULL-or-empty
        `attributes["internal_code"]` always backfills cleanly.

        After a winning UPDATE we re-SELECT the row with
        `populate_existing=True` so the session's identity-map entry
        for that `id` reflects the post-UPDATE attributes JSONB. The
        export loop relies on this when its "another writer already
        backfilled it" branch re-reads
        `product.attributes["internal_code"]` via `get_by_id` in the
        same session (e.g. integration-test setups that reuse a single
        AsyncSession across consecutive requests).

        Cross-product uniqueness is enforced by the partial unique
        index `ix_products_attrs_internal_code_unique`. A collision on
        `code` (because some other product already holds that value)
        surfaces as a `sqlalchemy.exc.IntegrityError` from
        `session.execute()` and is translated here to the domain-level
        `DuplicateInternalCodeError` — application/domain code never
        imports `sqlalchemy.exc` (Clean Architecture boundary).
        """
        stmt = text(
            """
            UPDATE products
            SET attributes = jsonb_set(
                attributes,
                '{internal_code}',
                to_jsonb(CAST(:code_text AS TEXT)),
                true
            )
            WHERE id = CAST(:product_id AS UUID)
              AND (
                attributes->>'internal_code' IS NULL
                OR attributes->>'internal_code' = ''
              )
            """
        )
        try:
            result = await self.session.execute(
                stmt,
                {"code_text": str(code), "product_id": str(product_id)},
            )
        except IntegrityError as exc:
            # Partial unique index collision on
            # `ix_products_attrs_internal_code_unique` — another product
            # already holds `code`. Translate to the domain-level
            # exception so the application layer never has to import
            # `sqlalchemy.exc`.
            raise DuplicateInternalCodeError(code) from exc
        # ponytail: `rowcount` exists at runtime on the UPDATE result
        # returned by `text(...)`, pyright doesn't see it on the wider
        # `Result[Any]` type.
        won = int(result.rowcount or 0) > 0  # type: ignore[attr-defined]
        if won:
            # Refresh the cached ProductModel for this row in-place so
            # the caller's subsequent `get_by_id` (identity-map hit)
            # observes the freshly-persisted attributes JSONB instead
            # of the stale pre-update copy. `populate_existing=True`
            # is the standard SQLAlchemy idiom for "refetch into an
            # already-tracked instance"; the row is still in the
            # identity map because `get_all` ran in the same session.
            await self.session.execute(
                select(ProductModel)
                .where(ProductModel.id == product_id)
                .execution_options(populate_existing=True)
            )
        return won

    def _audit_log_to_entity(self, model: ProductAuditLogModel) -> ProductAuditLog:
        """Convert ORM model to domain entity."""
        return ProductAuditLog.model_validate(model, from_attributes=True)
