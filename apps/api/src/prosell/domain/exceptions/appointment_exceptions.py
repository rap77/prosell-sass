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
    """Appointment conflicts with existing appointment(s)."""

    def __init__(
        self,
        user_id: str | None = None,
        scheduled_at: str | None = None,
        conflicts: list | None = None,
    ) -> None:
        """Initialize exception with conflict details.

        Args:
            user_id: (Deprecated) Conflicting user ID - kept for backwards compatibility
            scheduled_at: (Deprecated) Conflicting time slot - kept for backwards compatibility
            conflicts: List of Conflict objects from AppointmentConflictDetector
        """
        self.conflicts = conflicts if conflicts is not None else []

        # For backwards compatibility, support old signature
        if user_id and scheduled_at and not self.conflicts:
            message = f"User {user_id} already has an appointment at {scheduled_at}"
        elif self.conflicts:
            count = len(self.conflicts)
            message = f"Appointment conflicts detected with {count} existing appointment(s)"
            for conflict in self.conflicts:
                message += f"\n- {conflict.message}"
        else:
            message = "Appointment conflict detected"

        self.user_id = user_id
        self.scheduled_at = scheduled_at
        super().__init__(message)


class DuplicateAppointmentException(AppointmentError):
    """Duplicate appointment detected (same lead + vehicle)."""

    pass
