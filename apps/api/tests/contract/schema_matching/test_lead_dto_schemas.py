"""Contract tests for Lead DTO schemas.

These tests verify that:
1. Request DTOs validate inputs correctly (required fields, types, constraints)
2. Response DTOs serialize correctly from domain entities
3. Schema fields match OpenAPI spec expectations
"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from prosell.application.dto.lead.request import (
    CreateLeadRequest,
    ListLeadsRequest,
    UpdateLeadStatusRequest,
)
from prosell.application.dto.lead.response import (
    LeadAuditLogResponse,
    LeadDetailResponse,
    LeadListResponse,
    LeadResponse,
)
from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.entities.lead_audit_log import LeadAuditLog
from prosell.domain.value_objects.lead_source import LeadSource

# =============================================================================
# HELPERS
# =============================================================================


def make_lead_entity(**kwargs) -> Lead:
    """Create Lead entity for DTO tests."""
    return Lead(
        id=uuid4(),
        tenant_id=uuid4(),
        buyer_name=kwargs.get("buyer_name", "Test Buyer"),
        buyer_email=kwargs.get("buyer_email", "buyer@test.com"),
        buyer_phone=kwargs.get("buyer_phone"),
        product_id=kwargs.get("product_id", uuid4()),
        vendedor_id=kwargs.get("vendedor_id", uuid4()),
        message=kwargs.get("message"),
        source=kwargs.get("source", "manual"),
        status=kwargs.get("status", LeadStatus.NEW),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def make_audit_log_entity(lead: Lead, **kwargs) -> LeadAuditLog:
    """Create LeadAuditLog entity for DTO tests."""
    return LeadAuditLog.create(
        lead_id=lead.id,
        tenant_id=lead.tenant_id,
        old_status=kwargs.get("old_status", LeadStatus.NEW),
        new_status=kwargs.get("new_status", LeadStatus.CONTACTED),
        changed_by_user_id=kwargs.get("changed_by_user_id", uuid4()),
        reason=kwargs.get("reason", "Test reason"),
    )


# =============================================================================
# CreateLeadRequest contract tests
# =============================================================================


class TestCreateLeadRequestSchema:
    """Contract tests for CreateLeadRequest."""

    def test_valid_minimal_request(self):
        """buyer_name is the only required field."""
        req = CreateLeadRequest(buyer_name="Juan Pérez")
        assert req.buyer_name == "Juan Pérez"
        assert req.buyer_email is None
        assert req.buyer_phone is None
        assert req.product_id is None
        assert req.vendedor_id is None
        assert req.source == "manual"

    def test_valid_full_request(self):
        """All fields should be accepted."""
        req = CreateLeadRequest(
            buyer_name="Juan Pérez",
            buyer_email="juan@test.com",
            buyer_phone="+59899123456",
            product_id=uuid4(),
            vendedor_id=uuid4(),
            message="Interested in the car",
            source=LeadSource.FACEBOOK,
        )
        assert req.buyer_name == "Juan Pérez"
        assert req.source == "facebook"

    def test_buyer_name_required(self):
        """buyer_name is required — empty raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CreateLeadRequest()  # type: ignore[call-arg]
        errors = exc_info.value.errors()
        field_names = [e["loc"][0] for e in errors]
        assert "buyer_name" in field_names

    def test_buyer_name_cannot_be_empty_string(self):
        """buyer_name with min_length=1 rejects empty string."""
        with pytest.raises(ValidationError):
            CreateLeadRequest(buyer_name="")

    def test_invalid_email_raises(self):
        """Invalid email format should raise ValidationError."""
        with pytest.raises(ValidationError):
            CreateLeadRequest(buyer_name="Test", buyer_email="not-an-email")

    def test_buyer_name_stripped(self):
        """Whitespace should be stripped from buyer_name."""
        req = CreateLeadRequest(buyer_name="  Juan  ")
        assert req.buyer_name == "Juan"

    def test_message_max_length(self):
        """message field max_length=2000 should be enforced."""
        with pytest.raises(ValidationError):
            CreateLeadRequest(buyer_name="Test", message="x" * 2001)

    def test_phone_max_length(self):
        """buyer_phone max_length=50 should be enforced."""
        with pytest.raises(ValidationError):
            CreateLeadRequest(buyer_name="Test", buyer_phone="x" * 51)


# =============================================================================
# UpdateLeadStatusRequest contract tests
# =============================================================================


class TestUpdateLeadStatusRequestSchema:
    """Contract tests for UpdateLeadStatusRequest."""

    def test_valid_request(self):
        """Should accept valid status value."""
        req = UpdateLeadStatusRequest(new_status=LeadStatus.CONTACTED)
        assert req.new_status == LeadStatus.CONTACTED
        assert req.reason is None

    def test_invalid_status_raises(self):
        """Invalid status string should raise ValidationError."""
        with pytest.raises(ValidationError):
            UpdateLeadStatusRequest(new_status="invalid_status")  # type: ignore[arg-type]

    def test_all_valid_statuses_accepted(self):
        """All 5 status values should be valid."""
        for status in LeadStatus:
            req = UpdateLeadStatusRequest(new_status=status)
            assert req.new_status == status

    def test_reason_max_length(self):
        """reason max_length=500 should be enforced."""
        with pytest.raises(ValidationError):
            UpdateLeadStatusRequest(new_status=LeadStatus.CONTACTED, reason="x" * 501)


# =============================================================================
# ListLeadsRequest contract tests
# =============================================================================


class TestListLeadsRequestSchema:
    """Contract tests for ListLeadsRequest."""

    def test_defaults(self):
        """Should use default values when not specified."""
        req = ListLeadsRequest()
        assert req.limit == 50
        assert req.offset == 0
        assert req.status is None

    def test_limit_range(self):
        """limit must be between 1 and 100."""
        with pytest.raises(ValidationError):
            ListLeadsRequest(limit=0)
        with pytest.raises(ValidationError):
            ListLeadsRequest(limit=101)

    def test_offset_non_negative(self):
        """offset must be >= 0."""
        with pytest.raises(ValidationError):
            ListLeadsRequest(offset=-1)

    def test_status_filter(self):
        """Should accept valid status filter."""
        req = ListLeadsRequest(status=LeadStatus.NEW)
        assert req.status == LeadStatus.NEW


# =============================================================================
# LeadResponse contract tests
# =============================================================================


class TestLeadResponseSchema:
    """Contract tests for LeadResponse."""

    def test_from_entity_all_fields_mapped(self):
        """All entity fields should be present in response."""
        lead = make_lead_entity()
        resp = LeadResponse.from_entity(lead)

        assert resp.id == lead.id
        assert resp.tenant_id == lead.tenant_id
        assert resp.buyer_name == lead.buyer_name
        assert resp.buyer_email == lead.buyer_email
        assert resp.buyer_phone == lead.buyer_phone
        assert resp.product_id == lead.product_id
        assert resp.vendedor_id == lead.vendedor_id
        assert resp.message == lead.message
        assert resp.source == lead.source
        assert resp.status == lead.status
        assert resp.created_at == lead.created_at
        assert resp.updated_at == lead.updated_at

    def test_status_serializes_as_string(self):
        """status should serialize to string value."""
        lead = make_lead_entity(status=LeadStatus.CONTACTED)
        resp = LeadResponse.from_entity(lead)
        data = resp.model_dump()
        assert data["status"] == "contacted"

    def test_null_optional_fields(self):
        """Optional fields should serialize as None."""
        lead = make_lead_entity(buyer_email=None, buyer_phone=None)
        resp = LeadResponse.from_entity(lead)
        data = resp.model_dump()
        assert data["buyer_email"] is None
        assert data["buyer_phone"] is None


# =============================================================================
# LeadAuditLogResponse contract tests
# =============================================================================


class TestLeadAuditLogResponseSchema:
    """Contract tests for LeadAuditLogResponse."""

    def test_from_entity_maps_correctly(self):
        """All audit log fields should be mapped."""
        lead = make_lead_entity()
        log = make_audit_log_entity(lead)
        resp = LeadAuditLogResponse.from_entity(log)

        assert resp.id == log.id
        assert resp.lead_id == log.lead_id
        assert resp.old_status == log.old_status
        assert resp.new_status == log.new_status
        assert resp.changed_by_user_id == log.changed_by_user_id
        assert resp.reason == log.reason
        assert resp.created_at == log.created_at


# =============================================================================
# LeadDetailResponse contract tests
# =============================================================================


class TestLeadDetailResponseSchema:
    """Contract tests for LeadDetailResponse."""

    def test_contains_lead_and_audit_logs(self):
        """Should contain lead and audit_logs fields."""
        lead = make_lead_entity()
        log = make_audit_log_entity(lead)

        resp = LeadDetailResponse(
            lead=LeadResponse.from_entity(lead),
            audit_logs=[LeadAuditLogResponse.from_entity(log)],
        )
        data = resp.model_dump()

        assert "lead" in data
        assert "audit_logs" in data
        assert len(data["audit_logs"]) == 1


# =============================================================================
# LeadListResponse contract tests
# =============================================================================


class TestLeadListResponseSchema:
    """Contract tests for LeadListResponse."""

    def test_pagination_fields_present(self):
        """Should contain items, total, limit, offset."""
        lead = make_lead_entity()
        resp = LeadListResponse(
            items=[LeadResponse.from_entity(lead)],
            total=1,
            limit=50,
            offset=0,
        )
        data = resp.model_dump()

        assert "items" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert data["total"] == 1
        assert len(data["items"]) == 1

    def test_empty_list(self):
        """Should handle empty items list."""
        resp = LeadListResponse(items=[], total=0, limit=50, offset=0)
        assert resp.total == 0
        assert resp.items == []
