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
        flat: bool = False,
    ) -> list[Category]:
        """
        Get all categories with optional filters.

        Args:
            tenant_id: Tenant UUID
            parent_id: Filter by parent (None = root categories only)
            is_active: Filter by active status (None = all)
            skip: Number of records to skip (pagination)
            limit: Max records to return (pagination)
            flat: If True, ignore parent_id filter (return all for tree building)

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
    async def get_by_id_cross_tenant(self, category_id: UUID) -> Category | None:
        """
        Get a category by ID, allowing reads ACROSS ALL tenants.

        ⚠️  **Cross-tenant leak risk.** This method returns ANY category
        regardless of which tenant owns it. Use ONLY for:

        - Platform-admin contexts (SUPER_ADMIN) that legitimately need
          to see every org's category.
        - Global template reads (Plan 2): root verticals and their
          children have tenant_id=NULL and are shared across
          organizations. This is the design intent — ``tenant_id IS
          NULL`` rows are shared by construction.

        Per-tenant reads (the common case) must go through ``get_by_id``
        or ``get_by_id_or_global`` (the latter for the product
        create/update path that needs both own + global visibility
        without cross-tenant leak).

        Args:
            category_id: Category UUID

        Returns:
            Category entity or None if not found
        """
        pass

    @abstractmethod
    async def get_by_id_or_global(self, category_id: UUID, tenant_id: UUID) -> Category | None:
        """
        Get a category visible to a tenant: the tenant's OWN category OR a
        GLOBAL template (``tenant_id IS NULL``).

        Use for the product create/update path (Plan 2): a product may
        reference a global vertical template the org opted into, while still
        being denied access to OTHER tenants' private categories. This is
        intentionally narrower than ``get_by_id_cross_tenant`` (no
        cross-tenant leak) and broader than ``get_by_id`` (which gates
        MUTATIONS and must stay strict).

        Args:
            category_id: Category UUID
            tenant_id: Caller's tenant UUID

        Returns:
            Category entity if owned by the tenant or global, else None
        """
        pass

    @abstractmethod
    async def get_children_cross_tenant(self, parent_id: UUID) -> list[Category]:
        """
        Get direct children of a parent, allowing reads ACROSS ALL tenants.

        ⚠️  **Cross-tenant leak risk** — same as ``get_by_id_cross_tenant``.
        Use ONLY for platform-admin / global-template reads.

        Per-tenant reads must still go through ``get_children``.

        Args:
            parent_id: Parent category UUID

        Returns:
            List of child categories
        """
        pass

    @abstractmethod
    async def get_active_roots(self, tenant_id: UUID | None) -> list[Category]:
        """
        Get active root categories visible to a tenant.

        Returns categories where ``is_active=True`` and ``parent_id IS NULL``
        (root verticals only — sub-categories are not inference targets).
        Visible to the tenant means: ``tenant_id == :tenant_id`` OR
        ``tenant_id IS NULL`` (GLOBAL templates shared across orgs).

        Used by the category auto-inference endpoint (Subsystem C). The
        caller (use case) is responsible for scoring, thresholding, and
        capping — this port is a pure pass-through.

        Args:
            tenant_id: Caller's tenant UUID, or None for the SUPER_ADMIN
                scenario (GLOBAL templates only).

        Returns:
            Active root categories sorted by ``sort_order ASC, id ASC``.
        """
        pass

    @abstractmethod
    async def get_ancestor_ids(self, category_id: UUID, tenant_id: UUID | None) -> list[UUID]:
        """
        Get all ancestor category IDs (up the tree to root).

        Used for circular reference validation. ``tenant_id=None`` scopes the
        traversal to GLOBAL templates (tenant IS NULL).

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
        self, name: str, tenant_id: UUID | None, parent_id: UUID | None = None
    ) -> bool:
        """
        Check if category with given name exists (for uniqueness validation).

        Args:
            name: Category name
            tenant_id: Tenant UUID, or None for GLOBAL templates (tenant IS NULL)
            parent_id: Parent category ID (None = check root level)

        Returns:
            True if exists, False otherwise
        """
        pass

    @abstractmethod
    async def exists_by_slug(self, slug: str, tenant_id: UUID | None) -> bool:
        """
        Check if category with given slug exists.

        Args:
            slug: Category slug
            tenant_id: Tenant UUID, or None for GLOBAL templates (tenant IS NULL)

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
