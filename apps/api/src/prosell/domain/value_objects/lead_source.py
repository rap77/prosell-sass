"""Lead source value object."""

from enum import StrEnum


class LeadSource(StrEnum):
    """Lead source enum.

    Represents where a lead originated from:
    - FACEBOOK: Lead from Facebook Marketplace scraping
    - WEBSITE: Lead from public website contact form
    - MANUAL: Lead created manually by staff
    """

    FACEBOOK = "facebook"
    WEBSITE = "website"
    MANUAL = "manual"

    def __str__(self) -> str:
        return self.value
