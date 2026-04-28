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
    async def get_by_id(self, publication_id: UUID) -> Publication | None:
        """Get publication by primary key.

        Args:
            publication_id: Publication UUID

        Returns:
            Publication entity or None if not found
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
