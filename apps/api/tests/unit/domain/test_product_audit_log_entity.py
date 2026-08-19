"""Unit tests for ProductAuditLog entity - TDD RED phase."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from prosell.domain.entities.product_audit_log import ProductAuditLog
from prosell.domain.value_objects.product_status import ProductStatus


class TestProductAuditLogEntity:
    """Test ProductAuditLog entity."""

    def test_audit_log_creation(self):
        """Test creating a new audit log entry."""
        audit_log = ProductAuditLog(
            id=uuid4(),
            tenant_id=uuid4(),
            product_id=uuid4(),
            old_status=ProductStatus.PENDING,
            new_status=ProductStatus.PUBLISHED,
            changed_by_user_id=uuid4(),
            reason="Approved after review",
            created_at=datetime.now(UTC),
        )

        assert audit_log.id is not None
        assert audit_log.product_id is not None
        assert audit_log.old_status == ProductStatus.PENDING
        assert audit_log.new_status == ProductStatus.PUBLISHED
        assert audit_log.changed_by_user_id is not None
        assert audit_log.reason == "Approved after review"
        assert audit_log.created_at is not None

    def test_audit_log_factory_method(self):
        """Test ProductAuditLog.create() factory method."""
        product_id = uuid4()
        tenant_id = uuid4()
        changed_by = uuid4()

        audit_log = ProductAuditLog.create(
            product_id=product_id,
            tenant_id=tenant_id,
            old_status=ProductStatus.PENDING,
            new_status=ProductStatus.REJECTED,
            changed_by_user_id=changed_by,
            reason="Missing required photos",
        )

        assert audit_log.id is not None
        assert audit_log.product_id == product_id
        assert audit_log.tenant_id == tenant_id
        assert audit_log.old_status == ProductStatus.PENDING
        assert audit_log.new_status == ProductStatus.REJECTED
        assert audit_log.changed_by_user_id == changed_by
        assert audit_log.reason == "Missing required photos"
        assert audit_log.created_at is not None

    def test_audit_log_optional_reason(self):
        """Test that reason is optional."""
        audit_log = ProductAuditLog.create(
            product_id=uuid4(),
            tenant_id=uuid4(),
            old_status=ProductStatus.PUBLISHED,
            new_status=ProductStatus.ARCHIVED,
            changed_by_user_id=uuid4(),
            reason=None,
        )

        assert audit_log.reason is None
        assert audit_log.old_status == ProductStatus.PUBLISHED
        assert audit_log.new_status == ProductStatus.ARCHIVED

    def test_audit_log_immutability(self):
        """Test that audit log is immutable (ValueObject with frozen=True)."""
        audit_log = ProductAuditLog.create(
            product_id=uuid4(),
            tenant_id=uuid4(),
            old_status=ProductStatus.DRAFT,
            new_status=ProductStatus.PENDING,
            changed_by_user_id=uuid4(),
            reason="Test",
        )

        with pytest.raises(Exception):  # noqa: B017 - Pydantic ValidationError
            audit_log.reason = "Modified reason"
