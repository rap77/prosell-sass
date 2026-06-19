"""Product repository interface."""

from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from prosell.domain.entities.product import Product
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
    async def get_by_id(self, product_id: UUID, tenant_id: UUID) -> Product | None:
        """
        Get product by ID (with tenant isolation).

        Args:
            product_id: Product UUID
            tenant_id: Tenant UUID for isolation

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
        tenant_id: UUID,
        organization_id: UUID | None = None,
        category_id: UUID | None = None,
        status: ProductStatus | None = None,
        condition: ProductCondition | None = None,
        is_featured: bool | None = None,
        search_query: str | None = None,
        min_price_cents: int | None = None,
        max_price_cents: int | None = None,
        attribute_filters: list["AttributeFilter"] | None = None,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> list[Product]:
        """
        Get products with optional filters.

        Args:
            tenant_id: Tenant UUID
            organization_id: Filter by organization
            category_id: Filter by category
            status: Filter by status
            condition: Filter by condition
            is_featured: Filter by featured status
            search_query: Text search in title/description
            min_price_cents: Minimum price filter
            max_price_cents: Maximum price filter
            attribute_filters: Dynamic filters over the JSONB `attributes` column
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
    async def update(self, product: Product) -> Product:
        """
        Update an existing product.

        Args:
            product: Product entity with updated fields

        Returns:
            Updated product
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
        tenant_id: UUID,
        organization_id: UUID | None = None,
        status: ProductStatus | None = None,
    ) -> int:
        """
        Count products.

        Args:
            tenant_id: Tenant UUID
            organization_id: Filter by organization
            status: Filter by status

        Returns:
            Total count
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
