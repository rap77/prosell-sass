"""Domain exceptions for Publication / Publisher operations."""


class PublisherDomainError(Exception):
    """Base class for all publisher-related domain errors."""


class PublicationNotFoundError(PublisherDomainError):
    """Raised when a Publication entity cannot be found."""

    def __init__(self, publication_id: str) -> None:
        super().__init__(f"Publication not found: {publication_id}")
        self.publication_id = publication_id


class PublicationRepublishError(PublisherDomainError):
    """Raised when a single republication attempt fails.

    Used by AutoRepublishUseCase to isolate per-listing failures
    so one broken listing does not abort the entire batch.
    """

    def __init__(self, publication_id: str, reason: str) -> None:
        super().__init__(f"Failed to republish {publication_id}: {reason}")
        self.publication_id = publication_id
        self.reason = reason


class TaskDispatchError(PublisherDomainError):
    """Raised when dispatching a background publish task fails."""

    def __init__(self, publication_id: str, reason: str = "unknown") -> None:
        super().__init__(f"Failed to dispatch publish task for {publication_id}: {reason}")
        self.publication_id = publication_id
        self.reason = reason
