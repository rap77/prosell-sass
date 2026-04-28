"""Appointment response DTOs."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from prosell.domain.entities.appointment import Appointment, AppointmentStatus


class AppointmentResponse(BaseModel):
    """DTO for a single appointment."""

    id: UUID
    tenant_id: UUID
    lead_id: UUID
    dealer_id: UUID
    vehicle_id: UUID
    scheduled_at: datetime
    status: AppointmentStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_entity(cls, appointment: Appointment) -> "AppointmentResponse":
        """Create response DTO from domain entity."""
        return cls(
            id=appointment.id,
            tenant_id=appointment.tenant_id,
            lead_id=appointment.lead_id,
            dealer_id=appointment.dealer_id,
            vehicle_id=appointment.vehicle_id,
            scheduled_at=appointment.scheduled_at,
            status=appointment.status,
            notes=appointment.notes,
            created_at=appointment.created_at,
            updated_at=appointment.updated_at,
        )
