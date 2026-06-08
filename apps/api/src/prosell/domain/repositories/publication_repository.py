"""IPublicationRepository — Port for Publication persistence.

Clean Architecture: domain defines the contract.
Infrastructure layer provides the SQLAlchemy implementation.
"""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.publication import Publication


class IPublicationRepository(ABC):
    """Repository interface for Publication entities.

    All methods are async — I/O is always async in this project.
    """

    @abstractmethod
    async def create(self, publication: Publication) -> Publication:
        """Persist a new publication.

        Args:
            publication: Publication entity to create

        Returns:
            Created publication (with DB-assigned timestamps if any)
        """
        pass

    @abstractmethod
    async def get_by_id(
        self,
        publication_id: UUID,
        tenant_id: UUID,
    ) -> Publication | None:
        """Get publication by primary key, scoped to a tenant.

        Args:
            publication_id: Publication UUID
            tenant_id: Tenant UUID. REQUIRED — every publication has a
                tenant_id column, and the repo must enforce the boundary.
                A query with the wrong tenant_id returns None (not raises),
                so callers can treat it the same as "not found".

        Returns:
            Publication entity or None if not found / wrong tenant
        """
        pass

    @abstractmethod
    async def get_by_id_admin(self, publication_id: UUID) -> Publication | None:
        """Get publication by primary key, bypassing tenant isolation.

        Reserved for background tasks and admin/internal operations that
        have legitimate reason to cross tenant boundaries (e.g., async
        tasks dispatched from a tenant-scoped API call need to load the
        publication they were dispatched for, even after the original
        request context is gone). MUST NOT be called from request handlers.
        """
        pass

    @abstractmethod
    async def get_by_product_id(self, product_id: UUID) -> list[Publication]:
        """Get all publications for a product (full history).

        Args:
            product_id: Product UUID

        Returns:
            List of publications ordered by created_at desc
        """
        pass

    @abstractmethod
    async def get_active_by_seller(self, seller_user_id: UUID) -> list[Publication]:
        """Get active (PUBLISHED) publications for a seller.

        Args:
            seller_user_id: Seller user UUID

        Returns:
            List of PUBLISHED publications for this seller
        """
        pass

    @abstractmethod
    async def get_by_fb_listing_id(
        self,
        fb_listing_id: str,
        tenant_id: UUID | None = None,
    ) -> Publication | None:
        """Get publication by Facebook listing ID.

        Args:
            fb_listing_id: Facebook listing ID from webhook payload
            tenant_id: Optional tenant ID for multi-tenant isolation

        Returns:
            Publication entity or None if not found
        """
        pass

    @abstractmethod
    async def get_approaching_expiry(self, hours_before: int = 48) -> list[Publication]:
        """Get PUBLISHED listings expiring within the warning window.

        Used by the scheduler to trigger republication before FB removes listings.
        Query: status = 'published' AND expires_at < now() + interval hours_before

        Args:
            hours_before: Warning window in hours (default 48h)

        Returns:
            List of publications approaching expiry
        """
        pass

    @abstractmethod
    async def update(self, publication: Publication) -> Publication:
        """Update an existing publication.

        Args:
            publication: Publication entity with updated fields

        Returns:
            Updated publication

        Raises:
            PublicationNotFoundException: If publication not found
        """
        pass
