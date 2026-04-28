"""Unit tests for Lead entity - TDD RED phase."""

import pytest
from datetime import UTC, datetime
from uuid import UUID, uuid4

from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.exceptions import LeadStateTransitionException


class TestLeadStatus:
    """Test LeadStatus enum."""

    def test_status_values(self):
        """Test that all 5 status values exist."""
        assert LeadStatus.NEW.value == "new"
        assert LeadStatus.CONTACTED.value == "contacted"
        assert LeadStatus.QUALIFIED.value == "qualified"
        assert LeadStatus.APPOINTMENT_SET.value == "appointment_set"
        assert LeadStatus.LOST.value == "lost"

    def test_is_lost(self):
        """Test is_lost() method."""
        assert not LeadStatus.NEW.is_lost()
        assert not LeadStatus.CONTACTED.is_lost()
        assert not LeadStatus.QUALIFIED.is_lost()
        assert not LeadStatus.APPOINTMENT_SET.is_lost()
        assert LeadStatus.LOST.is_lost()


class TestLeadEntity:
    """Test Lead entity."""

    def test_lead_creation(self):
        """Test creating a new lead."""
        lead = Lead(
            id=uuid4(),
            tenant_id=uuid4(),
            buyer_name="Juan Pérez",
            buyer_email="juan@example.com",
            buyer_phone="+59899123456",
            vehicle_id=uuid4(),
            vendedor_id=uuid4(),
            message="Estoy interesado en este vehículo",
            source="facebook",
            status=LeadStatus.NEW,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        assert lead.id is not None
        assert lead.buyer_name == "Juan Pérez"
        assert lead.buyer_email == "juan@example.com"
        assert lead.buyer_phone == "+59899123456"
        assert lead.message == "Estoy interesado en este vehículo"
        assert lead.source == "facebook"
        assert lead.status == LeadStatus.NEW
        assert not lead.is_lost()

    def test_valid_transitions(self):
        """Test valid state transitions."""
        # new → contacted
        assert LeadStatus.NEW.can_transition_to(LeadStatus.CONTACTED)
        # contacted → qualified
        assert LeadStatus.CONTACTED.can_transition_to(LeadStatus.QUALIFIED)
        # qualified → appointment_set
        assert LeadStatus.QUALIFIED.can_transition_to(LeadStatus.APPOINTMENT_SET)
        # any → lost
        assert LeadStatus.NEW.can_transition_to(LeadStatus.LOST)
        assert LeadStatus.CONTACTED.can_transition_to(LeadStatus.LOST)
        assert LeadStatus.QUALIFIED.can_transition_to(LeadStatus.LOST)
        assert LeadStatus.APPOINTMENT_SET.can_transition_to(LeadStatus.LOST)

    def test_invalid_transitions(self):
        """Test invalid state transitions."""
        # Cannot go backwards
        assert not LeadStatus.CONTACTED.can_transition_to(LeadStatus.NEW)
        assert not LeadStatus.QUALIFIED.can_transition_to(LeadStatus.CONTACTED)
        assert not LeadStatus.APPOINTMENT_SET.can_transition_to(LeadStatus.QUALIFIED)

        # Cannot skip states
        assert not LeadStatus.NEW.can_transition_to(LeadStatus.QUALIFIED)
        assert not LeadStatus.NEW.can_transition_to(LeadStatus.APPOINTMENT_SET)

        # Lost is terminal
        assert not LeadStatus.LOST.can_transition_to(LeadStatus.NEW)

    def test_transition_to_success(self):
        """Test successful status transition."""
        lead = Lead(
            id=uuid4(),
            tenant_id=uuid4(),
            buyer_name="Juan Pérez",
            buyer_email="juan@example.com",
            buyer_phone="+59899123456",
            vehicle_id=uuid4(),
            vendedor_id=uuid4(),
            message="Interesado",
            source="facebook",
            status=LeadStatus.NEW,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        # Transition new → contacted
        old_updated_at = lead.updated_at
        lead.transition_to(LeadStatus.CONTACTED)

        assert lead.status == LeadStatus.CONTACTED
        assert lead.updated_at > old_updated_at

    def test_transition_to_invalid_raises_exception(self):
        """Test that invalid transition raises exception."""
        lead = Lead(
            id=uuid4(),
            tenant_id=uuid4(),
            buyer_name="Juan Pérez",
            buyer_email="juan@example.com",
            buyer_phone="+59899123456",
            vehicle_id=uuid4(),
            vendedor_id=uuid4(),
            message="Interesado",
            source="facebook",
            status=LeadStatus.CONTACTED,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        # Cannot go backwards: contacted → new
        with pytest.raises(LeadStateTransitionException) as exc_info:
            lead.transition_to(LeadStatus.NEW)

        assert "Cannot transition" in str(exc_info.value)
        assert lead.status == LeadStatus.CONTACTED  # Status unchanged

    def test_is_lost_method(self):
        """Test is_lost() method on Lead entity."""
        lead = Lead(
            id=uuid4(),
            tenant_id=uuid4(),
            buyer_name="Juan Pérez",
            buyer_email="juan@example.com",
            buyer_phone="+59899123456",
            vehicle_id=uuid4(),
            vendedor_id=uuid4(),
            message="Interesado",
            source="facebook",
            status=LeadStatus.NEW,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        assert not lead.is_lost()

        lead.transition_to(LeadStatus.LOST)
        assert lead.is_lost()
