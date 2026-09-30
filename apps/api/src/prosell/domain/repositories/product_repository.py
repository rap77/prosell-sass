"""Product repository interface."""

from abc import ABC, abstractmethod
from collections.abc import Iterable
from datetime import datetime
from uuid import UUID

from prosell.domain.entities.product import Product
from prosell.domain.entities.product_audit_log import ProductAuditLog
from prosell.domain.value_objects.attribute_filter import AttributeFilter
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus


class AbstractProductRepository(ABC):
    """Repository interface for Product entities."""

    @abstractmethod
    async def create(self, product: Product) -> Product:
        """
        Create a new product.

        Args:
            product: Product entity to create

        Returns:
            Created product with generated ID
        """
        pass

    @abstractmethod
    async def get_by_id(self, product_id: UUID, tenant_id: UUID | None) -> Product | None:
        """
        Get product by ID, optionally with tenant isolation.

        Args:
            product_id: Product UUID
            tenant_id: Tenant UUID for isolation. None skips the tenant
                filter entirely — only internal callers without a tenant
                context should pass None.

        Returns:
            Product entity or None if not found
        """
        pass

    @abstractmethod
    async def get_by_slug(self, slug: str, tenant_id: UUID) -> Product | None:
        """
        Get product by slug.

        Args:
            slug: Product slug
            tenant_id: Tenant UUID

        Returns:
            Product entity or None if not found
        """
        pass

    @abstractmethod
    async def get_all(
        self,
        tenant_id: UUID | None,
        organization_id: UUID | None = None,
        category_id: UUID | None = None,
        status: ProductStatus | None = None,
        condition: ProductCondition | None = None,
        is_featured: bool | None = None,
        search_query: str | None = None,
        min_price_cents: int | None = None,
        max_price_cents: int | None = None,
        attribute_filters: list["AttributeFilter"] | None = None,
        published_to_marketplace: bool | None = None,
        has_images: bool | None = None,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> list[Product]:
        """
        Get products with optional filters.

        Args:
            tenant_id: Tenant UUID. None lifts tenant isolation entirely —
                callers MUST only pass None for a user holding
                Permission.ORG_ADMIN_VIEW_ALL.
            organization_id: Filter by organization
            category_id: Filter by category
            status: Filter by status
            condition: Filter by condition
            is_featured: Filter by featured status
            search_query: Text search in title/description
            min_price_cents: Minimum price filter
            max_price_cents: Maximum price filter
            attribute_filters: Dynamic filters over the JSONB `attributes` column
            published_to_marketplace: When True/False, only products whose
                `published_to_marketplace` flag matches. None skips the
                filter.
            has_images: When True, only products with at least one entry in
                their `image_urls` JSONB array. When False, only products
                with an empty or null `image_urls` array. None skips.
            skip: Number of records to skip (pagination)
            limit: Max records to return (pagination)
            order_by: Field to order by
            order_desc: True for descending, False for ascending

        Returns:
            List of products
        """
        pass

    @abstractmethod
    async def get_by_organization(
        self,
        organization_id: UUID,
        tenant_id: UUID,
        status: ProductStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Product]:
        """
        Get products by organization.

        Args:
            organization_id: Organization UUID
            tenant_id: Tenant UUID
            status: Filter by status (None = all)
            skip: Number of records to skip
            limit: Max records to return

        Returns:
            List of products
        """
        pass

    @abstractmethod
    async def get_by_category(
        self,
        category_id: UUID,
        tenant_id: UUID,
        status: ProductStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Product]:
        """
        Get products by category.

        Args:
            category_id: Category UUID
            tenant_id: Tenant UUID
            status: Filter by status (None = all)
            skip: Number of records to skip
            limit: Max records to return

        Returns:
            List of products
        """
        pass

    @abstractmethod
    async def get_pending_approval(
        self,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Product]:
        """
        Get products pending approval.

        Args:
            tenant_id: Tenant UUID
            skip: Number of records to skip
            limit: Max records to return

        Returns:
            List of products pending approval
        """
        pass

    @abstractmethod
    async def update(
        self,
        product: Product,
        *,
        changed_by_user_id: UUID | None = None,
        reason: str | None = None,
    ) -> Product:
        """
        Update an existing product.

        If the status actually changes, an immutable ProductAuditLog entry
        is recorded automatically (old status, new status, who, why).

        Args:
            product: Product entity with updated fields
            changed_by_user_id: User who made the change, for the audit
                trail (optional — omit for system-initiated updates)
            reason: Reason for the change, for the audit trail (optional)

        Returns:
            Updated product
        """
        pass

    @abstractmethod
    async def get_audit_logs(
        self,
        product_id: UUID,
        tenant_id: UUID,
        limit: int = 50,
    ) -> list[ProductAuditLog]:
        """
        Get status-change audit history for a product, newest first.

        Args:
            product_id: Product UUID
            tenant_id: Tenant UUID for isolation
            limit: Maximum number of entries to return

        Returns:
            List of audit log entries, newest first
        """
        pass

    @abstractmethod
    async def delete(self, product_id: UUID, tenant_id: UUID) -> bool:
        """
        Delete a product (soft delete via archive).

        Args:
            product_id: Product UUID
            tenant_id: Tenant UUID for isolation

        Returns:
            True if deleted, False if not found
        """
        pass

    @abstractmethod
    async def count(
        self,
        tenant_id: UUID | None,
        organization_id: UUID | None = None,
        category_id: UUID | None = None,
        status: ProductStatus | None = None,
        condition: ProductCondition | None = None,
        is_featured: bool | None = None,
        search_query: str | None = None,
        min_price_cents: int | None = None,
        max_price_cents: int | None = None,
        attribute_filters: list["AttributeFilter"] | None = None,
        published_to_marketplace: bool | None = None,
        has_images: bool | None = None,
    ) -> int:
        """
        Count products matching the same filters `get_all()` accepts.

        Args:
            tenant_id: Tenant UUID. None lifts tenant isolation (admin bypass).
            organization_id: Filter by organization
            category_id: Filter by category
            status: Filter by status
            condition: Filter by condition
            is_featured: Filter by featured status
            search_query: Text search in title/description
            min_price_cents: Minimum price filter
            max_price_cents: Maximum price filter
            attribute_filters: Dynamic filters over the JSONB `attributes` column
            published_to_marketplace: See `get_all()`.
            has_images: See `get_all()`.

        Returns:
            Total count of products matching every filter above
        """
        pass

    @abstractmethod
    async def increment_view_count(self, product_id: UUID, tenant_id: UUID) -> None:
        """
        Increment product view count.

        Args:
            product_id: Product UUID
            tenant_id: Tenant UUID
        """
        pass

    @abstractmethod
    async def increment_favorite_count(self, product_id: UUID, tenant_id: UUID) -> None:
        """
        Increment product favorite count.

        Args:
            product_id: Product UUID
            tenant_id: Tenant UUID
        """
        pass

    @abstractmethod
    async def decrement_favorite_count(self, product_id: UUID, tenant_id: UUID) -> None:
        """
        Decrement product favorite count.

        Args:
            product_id: Product UUID
            tenant_id: Tenant UUID
        """
        pass

    @abstractmethod
    async def get_featured(
        self,
        tenant_id: UUID,
        limit: int = 10,
    ) -> list[Product]:
        """
        Get featured products.

        Args:
            tenant_id: Tenant UUID
            limit: Max records to return

        Returns:
            List of featured products
        """
        pass

    @abstractmethod
    async def search(
        self,
        tenant_id: UUID,
        query: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Product]:
        """
        Full-text search products.

        Args:
            tenant_id: Tenant UUID
            query: Search query
            skip: Number of records to skip
            limit: Max records to return

        Returns:
            List of matching products
        """
        pass

    @abstractmethod
    async def get_recently_viewed(
        self,
        tenant_id: UUID,
        product_ids: list[UUID],
        limit: int = 10,
    ) -> list[Product]:
        """
        Get recently viewed products.

        Args:
            tenant_id: Tenant UUID
            product_ids: List of product IDs to fetch
            limit: Max records to return

        Returns:
            List of products
        """
        pass

    @abstractmethod
    async def set_primary_image(self, product_id: UUID, image_id: UUID, tenant_id: UUID) -> bool:
        """
        Set an image as primary for a product.

        This method ensures the invariant "only one primary image per product"
        by unsetting is_primary on all other images before setting the new one.

        Args:
            product_id: Product UUID
            image_id: Image UUID to set as primary
            tenant_id: Tenant UUID for isolation

        Returns:
            True if successful, False if product/image not found
        """
        pass

    @abstractmethod
    async def get_by_vin(self, vin: str, tenant_id: UUID) -> Product | None:
        """
        Get product by VIN (for upsert operations).

        Args:
            vin: Vehicle Identification Number (17 characters)
            tenant_id: Tenant UUID for isolation

        Returns:
            Product entity or None if not found
        """
        pass

    @abstractmethod
    async def get_sold_before(self, cutoff: datetime) -> list[Product]:
        """
        Get products that have been SOLD since before a cutoff timestamp.

        System-wide (no tenant filter) — this backs the maintenance sweep that
        prunes long-sold products' image galleries. Products that left SOLD
        (e.g. returned) are naturally excluded by the status filter.

        Args:
            cutoff: Only products whose sold_at is strictly before this returned

        Returns:
            List of SOLD products with sold_at < cutoff
        """
        pass

    @abstractmethod
    async def distinct_attribute_values(
        self, tenant_id: UUID, category_id: UUID, keys: list[str]
    ) -> dict[str, list[str]]:
        """
        Get DISTINCT non-null values of `attributes[key]` per key.

        Tenant + category scoped — used by the catalog UI to populate
        `select` filters that have no static options (e.g. `make`, `color`).

        Args:
            tenant_id: Tenant UUID for isolation
            category_id: Category UUID to scope the values to
            keys: Attribute keys to compute distinct values for

        Returns:
            Mapping of key -> sorted list of distinct non-null values
        """
        pass

    @abstractmethod
    async def get_max_vehicle_code(self) -> int | None:
        """
        Return the largest `vehicle_code` currently persisted, or `None`
        if no product has one yet.

        Tenant-agnostic on purpose: `vehicle_code` is a globally-unique
        legacy product id scoped to vehicle categories only, persisted
        inside `attributes->>'vehicle_code'` (a JSONB text field). The
        uniqueness invariant is enforced by the functional partial index
        `ix_products_attrs_vehicle_code_unique`. The allocator backs
        `VehicleCodeAllocator.peek_next()` and walks across every tenant
        because the value must remain globally unique for the client
        CSV's ``id`` column to round-trip.

        Returns:
            Largest persisted `vehicle_code` cast to int, or `None` if
            no row has one. Non-numeric values (defensive — the index
            is text-typed) are ignored.
        """
        pass

    @abstractmethod
    async def allocate_next_vehicle_code(self) -> int:
        """Atomically reserve the next globally unique vehicle code.

        Calls ``nextval('products_vehicle_code_seq')`` for race-free
        allocation across concurrent product creations. The caller is
        responsible for storing the returned value as text under
        ``attributes["vehicle_code"]`` on the product row. The sequence
        remains after the JSONB move (migration
        ``20260927_0001_move_vehicle_code_to_attributes_jsonb.py``) — only
        the column the value lands in changed.
        """
        pass

    @abstractmethod
    async def vehicle_code_exists(
        self, code: int, *, exclude_product_id: UUID | None = None
    ) -> bool:
        """
        Return whether any product currently uses `code` as its `vehicle_code`.

        Backs `VehicleCodeAllocator.reserve()` for fail-fast collision
        detection. Looks up against `attributes->>'vehicle_code'` (cast
        to bigint so callers can pass an int and the index does the
        numeric comparison via ``~ '^[0-9]+$'`` predicate).

        Optional `exclude_product_id` lets `UpdateProductUseCase` reuse
        the same uniqueness check without false-positives on the row
        being updated.

        Args:
            code: The `vehicle_code` value to test for collision.
            exclude_product_id: Optional product id to ignore (used when
                validating a PATCH — the row being updated already has
                that value, so it shouldn't count as a collision with
                itself).

        Returns:
            True iff some other product already holds `code`.
        """
        pass

    @abstractmethod
    async def vehicle_codes_exist(self, codes: Iterable[int]) -> set[int]:
        """
        Return the subset of `codes` that are currently in use as `vehicle_code`.

        Bulk variant of `vehicle_code_exists` — `BulkUploadPreviewUseCase`
        walks every distinct `csv_id` in the CSV once and needs a single
        round-trip to flag the rows whose codes already collide with a
        persisted product. Iterating `vehicle_code_exists` per row works
        for small CSVs but blows up on the multi-thousand-row client file
        the client uploads today.

        Args:
            codes: Iterable of candidate `vehicle_code` values to test.

        Returns:
            Set of codes from `codes` that are already in use. Empty if
            none of them are, or if `codes` is empty.
        """
        pass

    @abstractmethod
    async def update_vehicle_code_if_absent(self, product_id: UUID, code: int) -> bool:
        """
        Atomically set ``attributes->>'vehicle_code'`` = ``code`` (text)
        ONLY IF that JSONB key is currently NULL or an empty string.

        Backs the catalog export backfill path (`u1-catalog-export-api`,
        intent `export-vehicle-code-backfill`) — a published product
        whose `attributes["vehicle_code"]` is NULL or `''` would otherwise
        be dropped from the export by the BR1.7-style guard, leaving the
        client CSV header-only. This method is the single-row race-safe
        guard: two concurrent writers cannot both win, because the
        `WHERE attributes->>'vehicle_code' IS NULL OR attributes->>'vehicle_code' = ''`
        predicate matches at most one of them per row.

        The stored value is text-formatted (matches the JSONB-side
        representation; the regex guard on
        `ix_products_attrs_vehicle_code_unique` accepts both numeric and
        legacy mixed values, but numeric strings are the steady state).

        Cross-product collisions on the partial unique index
        `ix_products_attrs_vehicle_code_unique` are NOT covered here —
        the infrastructure impl translates the underlying unique-violation
        into the domain-level `DuplicateVehicleCodeError` so this domain
        contract never references persistence-layer exception types. The
        caller is expected to handle the domain exception (e.g. skip the
        row, log a warning, retry with a different code).

        Args:
            product_id: UUID of the product row to update.
            code: The `vehicle_code` (int) to write as text into
                `attributes["vehicle_code"]`.

        Returns:
            True iff this caller's UPDATE affected a row — i.e., this
            caller won the race and is responsible for the backfill.
            False if the WHERE clause matched no rows, meaning another
            writer already backfilled this product (or the product
            was deleted between the caller's read and write).

        Raises:
            DuplicateVehicleCodeError: If the UPDATE collides with the
                partial unique index — another product already holds the
                same `code` value.
        """
        pass
