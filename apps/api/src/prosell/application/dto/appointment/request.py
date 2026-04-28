"""Appointment request DTOs."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreateAppointmentRequest(BaseModel):
    """DTO for creating an appointment."""

    lead_id: UUID = Field(..., description="Lead ID to schedule appointment for")
    dealer_id: UUID = Field(..., description="Dealer ID (user) who will attend")
    vehicle_id: UUID = Field(..., description="Vehicle ID for the appointment")
    scheduled_at: datetime = Field(..., description="Appointment time (will be validated for business hours)")
    notes: str | None = Field(None, description="Additional notes for the appointment")

    model_config = {"from_attributes": True}
