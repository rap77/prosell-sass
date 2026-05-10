"""Facebook buyer profile port used by webhook processing."""

from typing import Protocol


class BuyerProfile(Protocol):
    """Minimal buyer profile returned by the Facebook adapter."""

    name: str | None
    email: str | None


class AbstractFacebookBuyerProfileService(Protocol):
    """Secondary port for fetching buyer profile data from Facebook."""

    async def get_buyer_profile(
        self,
        sender_id: str,
        page_access_token: str,
    ) -> BuyerProfile:
        """Fetch buyer profile details for a Facebook sender."""
        ...
