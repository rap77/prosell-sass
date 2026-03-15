"""IPublisherService — Port for Facebook Marketplace publishing adapters.

Two implementations will exist:
1. PlaywrightPublisherService — browser automation (primary, works now)
2. GraphApiPublisherService — FB Graph API (secondary, requires App Review)
"""

from abc import ABC, abstractmethod

from prosell.domain.entities.publication import Publication


class IPublisherService(ABC):
    """Port for Facebook Marketplace publishing operations.

    Adapters (Playwright, Graph API) implement this interface.
    Use cases depend on this abstraction — never on concrete adapters.
    """

    @abstractmethod
    async def publish(
        self,
        publication: Publication,
        access_token: str,
        image_bytes_list: list[bytes],
    ) -> str:
        """Publish a vehicle listing to Facebook Marketplace.

        Args:
            publication: Publication entity with listing content
            access_token: Decrypted Facebook page access token
            image_bytes_list: Processed image bytes (compressed, resized)

        Returns:
            fb_listing_id: Facebook listing ID (used to track/update/delete)
        """
        pass

    @abstractmethod
    async def update(
        self,
        publication: Publication,
        access_token: str,
        image_bytes_list: list[bytes],
    ) -> None:
        """Update an existing Facebook Marketplace listing.

        Args:
            publication: Publication entity with fb_listing_id set
            access_token: Decrypted Facebook page access token
            image_bytes_list: Updated image bytes
        """
        pass

    @abstractmethod
    async def delete(
        self,
        publication: Publication,
        access_token: str,
    ) -> None:
        """Remove a listing from Facebook Marketplace.

        Called on mark_sold() or when user manually removes a listing.

        Args:
            publication: Publication entity with fb_listing_id set
            access_token: Decrypted Facebook page access token
        """
        pass
