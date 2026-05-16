"""Contract tests for Appointment DTO schemas.

These tests verify that:
1. Request DTOs validate inputs correctly (required fields, types, constraints)
2. Response DTOs serialize correctly from domain entities
3. Schema fields match OpenAPI spec expectations
"""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import pytest
from pydantic import ValidationError

from prosell.application.dto.appointment.request import CreateAppointmentRequest
from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.domain.entities.appointment import Appointment, AppointmentStatus

# =============================================================================
# HELPERS
# =============================================================================


def make_appointment_entity(**kwargs: Any) -> Appointment:
    """Create Appointment entity for DTO tests."""
    return Appointment(
        id=kwargs.get("id", uuid4()),  # type: ignore[arg-type]
        tenant_id=kwargs.get("tenant_id", uuid4()),  # type: ignore[arg-type]
        lead_id=kwargs.get("lead_id", uuid4()),  # type: ignore[arg-type]
        user_id=kwargs.get("user_id", uuid4()),  # type: ignore[arg-type]
        product_id=kwargs.get("product_id", uuid4()),  # type: ignore[arg-type]
        scheduled_at=kwargs.get("scheduled_at", datetime.now(UTC)) or datetime.now(UTC),  # type: ignore[arg-type]
        status=kwargs.get("status", AppointmentStatus.SCHEDULED),  # type: ignore[arg-type]
        notes=kwargs.get("notes"),  # type: ignore[arg-type]
        created_at=kwargs.get("created_at", datetime.now(UTC)),  # type: ignore[arg-type]
        updated_at=kwargs.get("updated_at", datetime.now(UTC)),  # type: ignore[arg-type]
    )


# =============================================================================
# CreateAppointmentRequest contract tests
# =============================================================================


class TestCreateAppointmentRequestSchema:
    """Contract tests for CreateAppointmentRequest."""

    def test_valid_minimal_request(self):
        """Should accept valid minimal request with required fields."""
        req = CreateAppointmentRequest(
            lead_id=uuid4(),
            user_id=uuid4(),
            product_id=uuid4(),
            scheduled_at=datetime.now(UTC),
            notes=None,
        )
        assert req.lead_id is not None
        assert req.user_id is not None
        assert req.product_id is not None
        assert req.scheduled_at is not None
        assert req.notes is None

    def test_valid_full_request_with_notes(self):
        """Should accept valid request with optional notes."""
        req = CreateAppointmentRequest(
            lead_id=uuid4(),
            user_id=uuid4(),
            product_id=uuid4(),
            scheduled_at=datetime.now(UTC),
            notes="Customer prefers morning appointments",
        )
        assert req.notes == "Customer prefers morning appointments"

    def test_lead_id_required(self):
        """lead_id is required — missing raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CreateAppointmentRequest(  # type: ignore[call-arg]
                user_id=uuid4(),
                product_id=uuid4(),
                scheduled_at=datetime.now(UTC),
                notes=None,
            )
        errors = exc_info.value.errors()
        field_names = [e["loc"][0] for e in errors]
        assert "lead_id" in field_names

    def test_user_id_required(self):
        """user_id is required — missing raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CreateAppointmentRequest(  # type: ignore[call-arg]
                lead_id=uuid4(),
                product_id=uuid4(),
                scheduled_at=datetime.now(UTC),
                notes=None,
            )
        errors = exc_info.value.errors()
        field_names = [e["loc"][0] for e in errors]
        assert "user_id" in field_names

    def test_product_id_required(self):
        """product_id is required — missing raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CreateAppointmentRequest(  # type: ignore[call-arg]
                lead_id=uuid4(),
                user_id=uuid4(),
                scheduled_at=datetime.now(UTC),
                notes=None,
            )
        errors = exc_info.value.errors()
        field_names = [e["loc"][0] for e in errors]
        assert "product_id" in field_names

    def test_scheduled_at_required(self):
        """scheduled_at is required — missing raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CreateAppointmentRequest(  # type: ignore[call-arg]
                lead_id=uuid4(),
                user_id=uuid4(),
                product_id=uuid4(),
                notes=None,
            )
        errors = exc_info.value.errors()
        field_names = [e["loc"][0] for e in errors]
        assert "scheduled_at" in field_names

    def test_notes_max_length(self):
        """notes max_length=2000 should be enforced."""
        with pytest.raises(ValidationError):
            CreateAppointmentRequest(
                lead_id=uuid4(),
                user_id=uuid4(),
                product_id=uuid4(),
                scheduled_at=datetime.now(UTC),
                notes="x" * 2001,
            )

    def test_notes_accepts_none(self):
        """notes should accept None (optional field)."""
        req = CreateAppointmentRequest(
            lead_id=uuid4(),
            user_id=uuid4(),
            product_id=uuid4(),
            scheduled_at=datetime.now(UTC),
            notes=None,
        )
        assert req.notes is None

    def test_notes_accepts_empty_string(self):
        """notes should accept empty string."""
        req = CreateAppointmentRequest(
            lead_id=uuid4(),
            user_id=uuid4(),
            product_id=uuid4(),
            scheduled_at=datetime.now(UTC),
            notes="",
        )
        assert req.notes == ""


# =============================================================================
# AppointmentResponse contract tests
# =============================================================================


class TestAppointmentResponseSchema:
    """Contract tests for AppointmentResponse."""

    def test_from_entity_all_fields_mapped(self):
        """All entity fields should be present in response."""
        appointment = make_appointment_entity()
        resp = AppointmentResponse.from_entity(appointment)

        assert resp.id == appointment.id
        assert resp.tenant_id == appointment.tenant_id
        assert resp.lead_id == appointment.lead_id
        assert resp.user_id == appointment.user_id
        assert resp.product_id == appointment.product_id
        assert resp.scheduled_at == appointment.scheduled_at
        assert resp.status == appointment.status
        assert resp.notes == appointment.notes
        assert resp.created_at == appointment.created_at
        assert resp.updated_at == appointment.updated_at

    def test_status_serializes_as_string(self):
        """status should serialize to string value."""
        appointment = make_appointment_entity(status=AppointmentStatus.COMPLETED)
        resp = AppointmentResponse.from_entity(appointment)
        data = resp.model_dump()
        assert data["status"] == "completed"

    def test_all_status_values_accepted(self):
        """All 3 status values should be valid."""
        for status in AppointmentStatus:
            appointment = make_appointment_entity(status=status)
            resp = AppointmentResponse.from_entity(appointment)
            assert resp.status == status

    def test_null_optional_fields(self):
        """Optional notes field should serialize as None."""
        appointment = make_appointment_entity(notes=None)
        resp = AppointmentResponse.from_entity(appointment)
        data = resp.model_dump()
        assert data["notes"] is None

    def test_notes_with_content(self):
        """notes with content should serialize correctly."""
        appointment = make_appointment_entity(notes="Test notes")
        resp = AppointmentResponse.from_entity(appointment)
        data = resp.model_dump()
        assert data["notes"] == "Test notes"
