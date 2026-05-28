"""Appointment request DTOs."""

from datetime import datetime
from uuid import UUID

from prosell.domain.base import DomainModel, Field
from prosell.domain.entities.appointment import AppointmentStatus


class CreateAppointmentRequest(DomainModel):
    """DTO for creating an appointment."""

    lead_id: UUID = Field(..., description="Lead ID to schedule appointment for")
    user_id: UUID = Field(..., description="User ID who will attend")
    product_id: UUID = Field(..., description="Vehicle ID for the appointment")
    scheduled_at: datetime = Field(
        ..., description="Appointment time (will be validated for business hours)"
    )
    notes: str | None = Field(default=None, max_length=2000)
    force: bool = False


class UpdateAppointmentRequest(DomainModel):
    """Request body for updating an appointment's status and/or notes."""

    status: AppointmentStatus | None = None
    notes: str | None = Field(None, max_length=2000)


class UpdateAppointmentStatusRequest(DomainModel):
    """DTO for updating appointment status via domain use cases."""

    new_status: AppointmentStatus = Field(..., description="New status: 'completed' or 'cancelled'")
