"""Category repository interface."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.category import Category


class AbstractCategoryRepository(ABC):
    """Repository interface for Category entities."""

    @abstractmethod
    async def create(self, category: Category) -> Category:
        """
        Create a new category.

        Args:
            category: Category entity to create

        Returns:
            Created category with generated ID
        """
        pass

    @abstractmethod
    async def get_by_id(self, category_id: UUID, tenant_id: UUID) -> Category | None:
        """
        Get category by ID (with tenant isolation).

        Args:
            category_id: Category UUID
            tenant_id: Tenant UUID for isolation

        Returns:
            Category entity or None if not found
        """
        pass

    @abstractmethod
    async def get_by_slug(self, slug: str, tenant_id: UUID) -> Category | None:
        """
        Get category by slug.

        Args:
            slug: Category slug
            tenant_id: Tenant UUID

        Returns:
            Category entity or None if not found
        """
        pass

    @abstractmethod
    async def get_all(
        self,
        tenant_id: UUID,
        parent_id: UUID | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Category]:
        """
        Get all categories with optional filters.

        Args:
            tenant_id: Tenant UUID
            parent_id: Filter by parent (None = root categories only)
            is_active: Filter by active status (None = all)
            skip: Number of records to skip (pagination)
            limit: Max records to return (pagination)

        Returns:
            List of categories
        """
        pass

    @abstractmethod
    async def get_children(self, parent_id: UUID, tenant_id: UUID) -> list[Category]:
        """
        Get direct children of a category.

        Args:
            parent_id: Parent category UUID
            tenant_id: Tenant UUID

        Returns:
            List of child categories
        """
        pass

    @abstractmethod
    async def get_ancestor_ids(self, category_id: UUID, tenant_id: UUID) -> list[UUID]:
        """
        Get all ancestor category IDs (up the tree to root).

        Used for circular reference validation.

        Args:
            category_id: Category UUID
            tenant_id: Tenant UUID

        Returns:
            List of ancestor category IDs (empty if root)
        """
        pass

    @abstractmethod
    async def get_tree(self, tenant_id: UUID) -> list[Category]:
        """
        Get all categories as a flat list (tree can be built in application layer).

        Args:
            tenant_id: Tenant UUID

        Returns:
            List of all categories for tenant
        """
        pass

    @abstractmethod
    async def update(self, category: Category) -> Category:
        """
        Update an existing category.

        Args:
            category: Category entity with updated fields

        Returns:
            Updated category
        """
        pass

    @abstractmethod
    async def delete(self, category_id: UUID, tenant_id: UUID) -> bool:
        """
        Delete a category.

        Args:
            category_id: Category UUID
            tenant_id: Tenant UUID for isolation

        Returns:
            True if deleted, False if not found
        """
        pass

    @abstractmethod
    async def exists_by_name(
        self, name: str, tenant_id: UUID, parent_id: UUID | None = None
    ) -> bool:
        """
        Check if category with given name exists (for uniqueness validation).

        Args:
            name: Category name
            tenant_id: Tenant UUID
            parent_id: Parent category ID (None = check root level)

        Returns:
            True if exists, False otherwise
        """
        pass

    @abstractmethod
    async def exists_by_slug(self, slug: str, tenant_id: UUID) -> bool:
        """
        Check if category with given slug exists.

        Args:
            slug: Category slug
            tenant_id: Tenant UUID

        Returns:
            True if exists, False otherwise
        """
        pass

    @abstractmethod
    async def count(self, tenant_id: UUID, is_active: bool | None = None) -> int:
        """
        Count total categories.

        Args:
            tenant_id: Tenant UUID
            is_active: Filter by active status (None = all)

        Returns:
            Total count
        """
        pass
