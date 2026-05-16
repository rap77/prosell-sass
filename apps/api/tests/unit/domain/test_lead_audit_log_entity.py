"""Unit tests for LeadAuditLog entity - TDD RED phase."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from prosell.domain.entities.lead import LeadStatus
from prosell.domain.entities.lead_audit_log import LeadAuditLog


class TestLeadAuditLogEntity:
    """Test LeadAuditLog entity."""

    def test_audit_log_creation(self):
        """Test creating a new audit log entry."""
        audit_log = LeadAuditLog(
            id=uuid4(),
            tenant_id=uuid4(),
            lead_id=uuid4(),
            old_status=LeadStatus.NEW,
            new_status=LeadStatus.CONTACTED,
            changed_by_user_id=uuid4(),
            reason="Contacted buyer via phone",
            created_at=datetime.now(UTC),
        )

        assert audit_log.id is not None
        assert audit_log.lead_id is not None
        assert audit_log.old_status == LeadStatus.NEW
        assert audit_log.new_status == LeadStatus.CONTACTED
        assert audit_log.changed_by_user_id is not None
        assert audit_log.reason == "Contacted buyer via phone"
        assert audit_log.created_at is not None

    def test_audit_log_factory_method(self):
        """Test LeadAuditLog.create() factory method."""
        lead_id = uuid4()
        tenant_id = uuid4()
        changed_by = uuid4()

        audit_log = LeadAuditLog.create(
            lead_id=lead_id,
            tenant_id=tenant_id,
            old_status=LeadStatus.QUALIFIED,
            new_status=LeadStatus.APPOINTMENT_SET,
            changed_by_user_id=changed_by,
            reason="Appointment scheduled for tomorrow",
        )

        assert audit_log.id is not None
        assert audit_log.lead_id == lead_id
        assert audit_log.tenant_id == tenant_id
        assert audit_log.old_status == LeadStatus.QUALIFIED
        assert audit_log.new_status == LeadStatus.APPOINTMENT_SET
        assert audit_log.changed_by_user_id == changed_by
        assert audit_log.reason == "Appointment scheduled for tomorrow"
        assert audit_log.created_at is not None

    def test_audit_log_optional_reason(self):
        """Test that reason is optional."""
        audit_log = LeadAuditLog.create(
            lead_id=uuid4(),
            tenant_id=uuid4(),
            old_status=LeadStatus.CONTACTED,
            new_status=LeadStatus.LOST,
            changed_by_user_id=uuid4(),
            reason=None,
        )

        assert audit_log.reason is None
        assert audit_log.old_status == LeadStatus.CONTACTED
        assert audit_log.new_status == LeadStatus.LOST

    def test_audit_log_immutability(self):
        """Test that audit log is immutable (DomainModel with frozen=True)."""
        audit_log = LeadAuditLog.create(
            lead_id=uuid4(),
            tenant_id=uuid4(),
            old_status=LeadStatus.NEW,
            new_status=LeadStatus.CONTACTED,
            changed_by_user_id=uuid4(),
            reason="Test",
        )

        # Attempting to modify should raise ValidationError
        with pytest.raises(Exception):  # noqa: B017 - Pydantic ValidationError
            audit_log.reason = "Modified reason"
