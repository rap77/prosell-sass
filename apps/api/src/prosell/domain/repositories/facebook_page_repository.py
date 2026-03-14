"""Facebook Page repository interface (Port).

Repository for Facebook page entities following Clean Architecture.
"""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.facebook_page import FacebookPage


class IFacebookPageRepository(ABC):
    """Facebook Page repository interface.

    Repository pattern for FacebookPage entities.
    Manages persistence of Facebook pages for vendedores.

    Implementation (SQLAlchemy) is in infrastructure layer.
    """

    @abstractmethod
    async def create(self, page: FacebookPage) -> FacebookPage:
        """Create a new Facebook page.

        Args:
            page: FacebookPage entity to create

        Returns:
            Created page with generated ID
        """
        pass

    @abstractmethod
    async def get_by_id(self, page_id: UUID) -> FacebookPage | None:
        """Get Facebook page by ID.

        Args:
            page_id: Facebook page ID (UUID)

        Returns:
            FacebookPage entity or None if not found
        """
        pass

    @abstractmethod
    async def get_by_facebook_account_id(
        self,
        facebook_account_id: UUID,
    ) -> list[FacebookPage]:
        """Get all pages for a Facebook account.

        Args:
            facebook_account_id: Parent Facebook account ID

        Returns:
            List of FacebookPage entities (empty if none found)
        """
        pass

    @abstractmethod
    async def get_by_facebook_page_id(
        self,
        facebook_page_id: str,
    ) -> FacebookPage | None:
        """Get Facebook page by Facebook page ID.

        Args:
            facebook_page_id: Facebook page ID from Graph API

        Returns:
            FacebookPage entity or None if not found
        """
        pass

    @abstractmethod
    async def update(self, page: FacebookPage) -> FacebookPage:
        """Update Facebook page.

        Args:
            page: FacebookPage entity with updated fields

        Returns:
            Updated page

        Raises:
            FacebookPageNotFoundException: If page not found
        """
        pass

    @abstractmethod
    async def delete(self, page_id: UUID) -> None:
        """Delete Facebook page.

        Args:
            page_id: Facebook page ID to delete

        Raises:
            FacebookPageNotFoundException: If page not found
        """
        pass

    @abstractmethod
    async def delete_by_facebook_account_id(
        self,
        facebook_account_id: UUID,
    ) -> int:
        """Delete all pages for a Facebook account.

        Called when Facebook account is disconnected.

        Args:
            facebook_account_id: Parent Facebook account ID

        Returns:
            Number of pages deleted
        """
        pass

    @abstractmethod
    async def get_default_page(
        self,
        facebook_account_id: UUID,
    ) -> FacebookPage | None:
        """Get default page for a Facebook account.

        Args:
            facebook_account_id: Parent Facebook account ID

        Returns:
            Default FacebookPage or None if no default set
        """
        pass

    @abstractmethod
    async def set_default_page(
        self,
        facebook_account_id: UUID,
        page_id: UUID,
    ) -> None:
        """Set default page for a Facebook account.

        Unsets is_default on all other pages for this account.

        Args:
            facebook_account_id: Parent Facebook account ID
            page_id: Page ID to set as default
        """
        pass
