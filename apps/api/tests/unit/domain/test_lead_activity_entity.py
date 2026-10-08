"""Unit tests for LeadActivity entity - TDD RED phase.

Roadmap CRM Fase 4 ("Twenty concept: Activities") — a manual timeline
entry (note/call) on a lead, distinct from LeadAuditLog (which only
records status transitions, not free-form notes).
"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from prosell.domain.entities.lead_activity import LeadActivity, LeadActivityType


class TestLeadActivityEntity:
    """Test LeadActivity entity."""

    def test_activity_creation(self):
        activity = LeadActivity(
            id=uuid4(),
            tenant_id=uuid4(),
            lead_id=uuid4(),
            type=LeadActivityType.NOTE,
            content="Cliente interesado, pide fotos adicionales",
            created_by_user_id=uuid4(),
            created_at=datetime.now(UTC),
        )

        assert activity.id is not None
        assert activity.lead_id is not None
        assert activity.type == LeadActivityType.NOTE
        assert activity.content == "Cliente interesado, pide fotos adicionales"
        assert activity.created_by_user_id is not None
        assert activity.created_at is not None

    def test_activity_factory_method(self):
        lead_id = uuid4()
        tenant_id = uuid4()
        created_by = uuid4()

        activity = LeadActivity.create(
            lead_id=lead_id,
            tenant_id=tenant_id,
            activity_type=LeadActivityType.CALL,
            content="Primera llamada, muy interesado",
            created_by_user_id=created_by,
        )

        assert activity.id is not None
        assert activity.lead_id == lead_id
        assert activity.tenant_id == tenant_id
        assert activity.type == LeadActivityType.CALL
        assert activity.content == "Primera llamada, muy interesado"
        assert activity.created_by_user_id == created_by
        assert activity.created_at is not None

    def test_activity_created_by_user_id_is_optional(self):
        """A system-generated activity (e.g. future automation) may have no actor."""
        activity = LeadActivity.create(
            lead_id=uuid4(),
            tenant_id=uuid4(),
            activity_type=LeadActivityType.NOTE,
            content="Nota automática",
            created_by_user_id=None,
        )

        assert activity.created_by_user_id is None

    def test_activity_immutability(self):
        """LeadActivity is a ValueObject (frozen) — once created, never changes."""
        activity = LeadActivity.create(
            lead_id=uuid4(),
            tenant_id=uuid4(),
            activity_type=LeadActivityType.NOTE,
            content="Test",
            created_by_user_id=uuid4(),
        )

        with pytest.raises(Exception):  # noqa: B017 - Pydantic ValidationError
            activity.content = "Modified"
