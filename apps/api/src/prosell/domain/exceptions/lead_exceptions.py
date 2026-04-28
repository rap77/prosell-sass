"""Lead-related domain exceptions."""


class LeadError(Exception):
    """Base exception for lead domain errors."""

    pass


class LeadNotFoundException(LeadError):
    """Lead not found in database."""

    pass


class LeadStateTransitionException(LeadError):
    """Invalid state transition for lead status."""

    def __init__(self, current_status: str, target_status: str) -> None:
        """Initialize exception with status details.

        Args:
            current_status: Current lead status
            target_status: Target status that was invalid
        """
        self.current_status = current_status
        self.target_status = target_status
        message = f"Cannot transition from '{current_status}' to '{target_status}'"
        super().__init__(message)


class DuplicateLeadException(LeadError):
    """Duplicate lead detected (same buyer + vehicle within 24h)."""

    pass
