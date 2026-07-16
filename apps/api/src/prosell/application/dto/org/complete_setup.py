"""DTO for completing organization onboarding setup."""

from prosell.domain.base import DomainModel


class CompleteSetupRequest(DomainModel):
    """Request body for completing onboarding setup."""

    setup_complete: bool = True
