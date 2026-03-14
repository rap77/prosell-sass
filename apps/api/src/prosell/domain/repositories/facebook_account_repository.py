"""Facebook Account repository interface (Port).

Repository for Facebook account entities following Clean Architecture.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from prosell.domain.entities.facebook_account import FacebookAccount


class IFacebookAccountRepository(ABC):
    """Facebook Account repository interface.

    Repository pattern for FacebookAccount entities.
    Manages persistence of Facebook account connections for vendedores.

    Implementation (SQLAlchemy) is in infrastructure layer.
    """

    @abstractmethod
    async def create(self, account: FacebookAccount) -> FacebookAccount:
        """Create a new Facebook account connection.

        Args:
            account: FacebookAccount entity to create

        Returns:
            Created account with generated ID

        Raises:
            FacebookAccountAlreadyExistsException: If account already exists
        """
        pass

    @abstractmethod
    async def get_by_id(self, account_id: UUID) -> FacebookAccount | None:
        """Get Facebook account by ID.

        Args:
            account_id: Facebook account ID

        Returns:
            FacebookAccount entity or None if not found
        """
        pass

    @abstractmethod
    async def get_by_seller_user_id(
        self,
        seller_user_id: UUID,
    ) -> list[FacebookAccount]:
        """Get all Facebook accounts for a vendedor.

        Args:
            seller_user_id: ProSell vendedor user ID

        Returns:
            List of FacebookAccount entities (empty if none found)
        """
        pass

    @abstractmethod
    async def get_by_facebook_user_id(
        self,
        facebook_user_id: str,
    ) -> FacebookAccount | None:
        """Get Facebook account by Facebook user ID.

        Args:
            facebook_user_id: Facebook user ID from Graph API

        Returns:
            FacebookAccount entity or None if not found
        """
        pass

    @abstractmethod
    async def update(self, account: FacebookAccount) -> FacebookAccount:
        """Update Facebook account.

        Args:
            account: FacebookAccount entity with updated fields

        Returns:
            Updated account

        Raises:
            FacebookAccountNotFoundException: If account not found
        """
        pass

    @abstractmethod
    async def delete(self, account_id: UUID) -> None:
        """Delete Facebook account.

        Args:
            account_id: Facebook account ID to delete

        Raises:
            FacebookAccountNotFoundException: If account not found
        """
        pass

    @abstractmethod
    async def get_accounts_expiring_before(
        self,
        threshold: datetime,
    ) -> list[FacebookAccount]:
        """Get accounts expiring before threshold.

        Used by scheduled task to find tokens that need refresh.

        Args:
            threshold: Expiry threshold datetime

        Returns:
            List of FacebookAccount entities expiring before threshold
        """
        pass

    @abstractmethod
    async def exists_by_facebook_user_id(
        self,
        facebook_user_id: str,
    ) -> bool:
        """Check if Facebook account exists by Facebook user ID.

        Args:
            facebook_user_id: Facebook user ID from Graph API

        Returns:
            True if account exists, False otherwise
        """
        pass
