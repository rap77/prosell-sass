from typing import cast
from uuid import UUID

"""Unit tests for CreateAppointmentUseCase with conflict detection."""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest

from prosell.application.dto.appointment.request import CreateAppointmentRequest
from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.application.use_cases.appointment.create_appointment import CreateAppointmentUseCase
from prosell.domain.entities.appointment import Appointment, AppointmentStatus
from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.exceptions.appointment_exceptions import AppointmentConflictException
from prosell.domain.repositories.appointment_repository import AbstractAppointmentRepository
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.services.appointment_conflict_detector import (
    AppointmentConflictDetector,
    ConflictType,
)


@pytest.fixture
def mock_appointment_repo() -> AsyncMock:
    """Create mock appointment repository."""
    repo = AsyncMock(spec=AbstractAppointmentRepository)
    repo.create = AsyncMock()
    repo.check_conflicts = AsyncMock(return_value=[])
    return repo


@pytest.fixture
def mock_lead_repo() -> AsyncMock:
    """Create mock lead repository."""
    repo = AsyncMock(spec=AbstractLeadRepository)
    repo.get_by_id = AsyncMock()
    repo.update_status = AsyncMock()
    return repo


@pytest.fixture
def conflict_detector() -> AppointmentConflictDetector:
    """Create conflict detector instance."""
    return AppointmentConflictDetector()


@pytest.fixture
def lead() -> Lead:
    """Create a test lead."""
    from uuid import uuid4

    return Lead(
        id=uuid4(),
        tenant_id=uuid4(),
        buyer_name="Juan Pérez",
        buyer_email="juan@example.com",
        buyer_phone="+59899000000",
        product_id=uuid4(),
        vendedor_id=uuid4(),
        message="Interested in this vehicle",
        source="manual",
        status=LeadStatus.QUALIFIED,  # QUALIFIED can transition to APPOINTMENT_SET
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


@pytest.fixture
def base_time() -> datetime:
    """Base time for testing (Tuesday, 2 PM UTC)."""
    return datetime(2026, 5, 19, 14, 0, tzinfo=UTC)  # Tuesday


class TestCreateAppointmentWithConflictDetection:
    """Test appointment creation with conflict detection."""

    @pytest.mark.asyncio
    async def test_create_appointment_no_conflicts(
        self,
        mock_appointment_repo: AbstractAppointmentRepository,
        mock_lead_repo: AbstractLeadRepository,
        conflict_detector: AppointmentConflictDetector,
        lead: Lead,
        base_time: datetime,
    ):
        """Test creating appointment when no conflicts detected."""
        from uuid import uuid4

        tenant_id = uuid4()
        user_id = uuid4()

        # Setup mocks
        mock_lead_repo.get_by_id.return_value = lead  # type: ignore[attr-defined]

        created_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=lead.id,
            user_id=user_id,
            product_id=cast(UUID, lead.product_id),
            scheduled_at=base_time,
            status=AppointmentStatus.SCHEDULED,
        )
        mock_appointment_repo.create.return_value = created_appointment  # type: ignore[attr-defined]

        # Create use case
        use_case = CreateAppointmentUseCase(
            appointment_repository=mock_appointment_repo,
            lead_repository=mock_lead_repo,
            conflict_detector=conflict_detector,
        )

        # Execute
        request = CreateAppointmentRequest(
            lead_id=lead.id,
            user_id=user_id,
            product_id=cast(UUID, lead.product_id),
            scheduled_at=base_time,
            notes="Test appointment",
        )

        result = await use_case.execute(request, tenant_id)

        # Verify
        assert isinstance(result, AppointmentResponse)
        mock_appointment_repo.create.assert_called_once()  # type: ignore[attr-defined]
        mock_lead_repo.update_status.assert_called_once()  # type: ignore[attr-defined]

    @pytest.mark.asyncio
    async def test_create_appointment_with_conflicts_raises_exception(
        self,
        mock_appointment_repo: AbstractAppointmentRepository,
        mock_lead_repo: AbstractLeadRepository,
        conflict_detector: AppointmentConflictDetector,
        lead: Lead,
        base_time: datetime,
    ):
        """Test creating appointment with conflicts raises AppointmentConflictException."""
        from uuid import uuid4

        tenant_id = uuid4()
        user_id = uuid4()

        # Setup mocks
        mock_lead_repo.get_by_id.return_value = lead  # type: ignore[attr-defined]

        # Create conflicting appointment
        conflicting_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),
            user_id=user_id,
            product_id=uuid4(),
            scheduled_at=base_time,
            status=AppointmentStatus.SCHEDULED,
        )
        mock_appointment_repo.check_conflicts.return_value = [conflicting_appointment]  # type: ignore[attr-defined]

        # Create use case
        use_case = CreateAppointmentUseCase(
            appointment_repository=mock_appointment_repo,
            lead_repository=mock_lead_repo,
            conflict_detector=conflict_detector,
        )

        # Execute
        request = CreateAppointmentRequest(
            lead_id=lead.id,
            user_id=user_id,
            product_id=cast(UUID, lead.product_id),
            scheduled_at=base_time,
            notes="Test appointment",
        )

        # Verify exception raised
        with pytest.raises(AppointmentConflictException) as exc_info:
            await use_case.execute(request, tenant_id)

        # Verify exception contains conflicts
        exception = exc_info.value
        assert hasattr(exception, "conflicts")
        assert len(exception.conflicts) > 0
        assert exception.conflicts[0].type == ConflictType.DEALER_UNAVAILABLE

        # Verify appointment not created
        mock_appointment_repo.create.assert_not_called()  # type: ignore[attr-defined]

    @pytest.mark.asyncio
    async def test_create_appointment_with_multiple_conflicts(
        self,
        mock_appointment_repo: AbstractAppointmentRepository,
        mock_lead_repo: AbstractLeadRepository,
        conflict_detector: AppointmentConflictDetector,
        lead: Lead,
        base_time: datetime,
    ):
        """Test creating appointment with multiple conflicts."""
        from uuid import uuid4

        tenant_id = uuid4()
        user_id = uuid4()

        # Setup mocks
        mock_lead_repo.get_by_id.return_value = lead  # type: ignore[attr-defined]

        # Create multiple conflicting appointments
        conflict_1 = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),
            user_id=user_id,
            product_id=uuid4(),
            scheduled_at=base_time,
            status=AppointmentStatus.SCHEDULED,
        )
        conflict_2 = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),
            user_id=user_id,
            product_id=uuid4(),
            scheduled_at=base_time + timedelta(minutes=30),
            status=AppointmentStatus.SCHEDULED,
        )
        mock_appointment_repo.check_conflicts.return_value = [conflict_1, conflict_2]  # type: ignore[attr-defined]

        # Create use case
        use_case = CreateAppointmentUseCase(
            appointment_repository=mock_appointment_repo,
            lead_repository=mock_lead_repo,
            conflict_detector=conflict_detector,
        )

        # Execute
        request = CreateAppointmentRequest(
            lead_id=lead.id,
            user_id=user_id,
            product_id=cast(UUID, lead.product_id),
            scheduled_at=base_time,
            notes="Test appointment",
        )

        # Verify exception raised with multiple conflicts
        with pytest.raises(AppointmentConflictException) as exc_info:
            await use_case.execute(request, tenant_id)

        exception = exc_info.value
        assert len(exception.conflicts) == 2

    @pytest.mark.asyncio
    async def test_create_appointment_skips_cancelled_conflicts(
        self,
        mock_appointment_repo: AbstractAppointmentRepository,
        mock_lead_repo: AbstractLeadRepository,
        conflict_detector: AppointmentConflictDetector,
        lead: Lead,
        base_time: datetime,
    ):
        """Test that cancelled appointments don't cause conflicts."""
        from uuid import uuid4

        tenant_id = uuid4()
        user_id = uuid4()

        # Setup mocks
        mock_lead_repo.get_by_id.return_value = lead  # type: ignore[attr-defined]

        # Create cancelled appointment (should not conflict)
        cancelled_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),
            user_id=user_id,
            product_id=uuid4(),
            scheduled_at=base_time,
            status=AppointmentStatus.CANCELLED,  # Cancelled
        )
        mock_appointment_repo.check_conflicts.return_value = [cancelled_appointment]  # type: ignore[attr-defined]

        # Create use case
        use_case = CreateAppointmentUseCase(
            appointment_repository=mock_appointment_repo,
            lead_repository=mock_lead_repo,
            conflict_detector=conflict_detector,
        )

        # Execute
        request = CreateAppointmentRequest(
            lead_id=lead.id,
            user_id=user_id,
            product_id=cast(UUID, lead.product_id),
            scheduled_at=base_time,
            notes="Test appointment",
        )

        # Setup return value for create
        created_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=lead.id,
            user_id=user_id,
            product_id=cast(UUID, lead.product_id),
            scheduled_at=base_time,
            status=AppointmentStatus.SCHEDULED,
        )
        mock_appointment_repo.create.return_value = created_appointment  # type: ignore[attr-defined]

        # Should succeed (cancelled appointments don't conflict)
        result = await use_case.execute(request, tenant_id)
        assert isinstance(result, AppointmentResponse)
        mock_appointment_repo.create.assert_called_once()  # type: ignore[attr-defined]

    @pytest.mark.asyncio
    async def test_create_appointment_with_force_override(
        self,
        mock_appointment_repo: AbstractAppointmentRepository,
        mock_lead_repo: AbstractLeadRepository,
        conflict_detector: AppointmentConflictDetector,
        lead: Lead,
        base_time: datetime,
    ):
        """Test creating appointment with force=True bypasses conflicts."""
        from uuid import uuid4

        tenant_id = uuid4()
        user_id = uuid4()

        # Setup mocks
        mock_lead_repo.get_by_id.return_value = lead  # type: ignore[attr-defined]

        # Create conflicting appointment
        conflicting_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),
            user_id=user_id,
            product_id=uuid4(),
            scheduled_at=base_time,
            status=AppointmentStatus.SCHEDULED,
        )
        mock_appointment_repo.check_conflicts.return_value = [conflicting_appointment]  # type: ignore[attr-defined]

        # Create use case
        use_case = CreateAppointmentUseCase(
            appointment_repository=mock_appointment_repo,
            lead_repository=mock_lead_repo,
            conflict_detector=conflict_detector,
        )

        # Execute with force=True
        request = CreateAppointmentRequest(
            lead_id=lead.id,
            user_id=user_id,
            product_id=cast(UUID, lead.product_id),
            scheduled_at=base_time,
            notes="Test appointment",
            force=True,  # Override conflicts
        )

        # Setup return value for create
        created_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=lead.id,
            user_id=user_id,
            product_id=cast(UUID, lead.product_id),
            scheduled_at=base_time,
            status=AppointmentStatus.SCHEDULED,
        )
        mock_appointment_repo.create.return_value = created_appointment  # type: ignore[attr-defined]

        # Should succeed despite conflicts (force=True)
        result = await use_case.execute(request, tenant_id)
        assert isinstance(result, AppointmentResponse)
        mock_appointment_repo.create.assert_called_once()  # type: ignore[attr-defined]
