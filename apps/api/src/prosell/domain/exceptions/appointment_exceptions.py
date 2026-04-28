"""Appointment-related domain exceptions."""


class AppointmentError(Exception):
    """Base exception for appointment domain errors."""

    pass


class AppointmentNotFoundException(AppointmentError):
    """Appointment not found in database."""

    pass


class AppointmentTimeValidationException(AppointmentError):
    """Appointment time is outside business hours."""

    def __init__(self, message: str) -> None:
        """Initialize exception with validation message.

        Args:
            message: Validation error message
        """
        self.message = message
        super().__init__(message)


class AppointmentConflictException(AppointmentError):
    """Appointment conflicts with existing appointment."""

    def __init__(self, dealer_id: str, scheduled_at: str) -> None:
        """Initialize exception with conflict details.

        Args:
            dealer_id: Conflicting dealer ID
            scheduled_at: Conflicting time slot
        """
        self.dealer_id = dealer_id
        self.scheduled_at = scheduled_at
        message = f"Dealer {dealer_id} already has an appointment at {scheduled_at}"
        super().__init__(message)


class DuplicateAppointmentException(AppointmentError):
    """Duplicate appointment detected (same lead + vehicle)."""

    pass
