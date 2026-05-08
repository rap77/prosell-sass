"""SqlAlchemyAppointmentRepository implementation."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.appointment import Appointment, AppointmentStatus
from prosell.domain.exceptions import AppointmentConflictException, AppointmentNotFoundException
from prosell.domain.repositories.appointment_repository import AbstractAppointmentRepository
from prosell.infrastructure.models.appointment_model import AppointmentModel


class SqlAlchemyAppointmentRepository(AbstractAppointmentRepository):
    """SQLAlchemy implementation of AbstractAppointmentRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, appointment: Appointment) -> Appointment:
        """Create a new appointment with conflict detection."""
        # Check for conflicts before creating
        conflicts = await self.check_conflicts(
            user_id=appointment.user_id,
            scheduled_at=appointment.scheduled_at,
            tenant_id=appointment.tenant_id,
        )

        if conflicts:
            raise AppointmentConflictException(
                user_id=str(appointment.user_id),
                scheduled_at=appointment.scheduled_at.isoformat(),
            )

        model = self._to_model(appointment)
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, appointment_id: UUID, tenant_id: UUID) -> Appointment | None:
        """Get appointment by ID with tenant isolation."""
        stmt = select(AppointmentModel).where(
            AppointmentModel.id == appointment_id,
            AppointmentModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_branch(
        self,
        tenant_id: UUID,
        user_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        status: AppointmentStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Appointment], int]:
        """List appointments for a branch with pagination."""
        conditions = [
            AppointmentModel.tenant_id == tenant_id,
            AppointmentModel.user_id == user_id,
        ]

        if start_date:
            conditions.append(AppointmentModel.scheduled_at >= start_date)
        if end_date:
            conditions.append(AppointmentModel.scheduled_at <= end_date)
        if status:
            conditions.append(AppointmentModel.status == status.value)

        # Count total
        count_stmt = select(func.count(AppointmentModel.id)).where(*conditions)
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        # Fetch paginated results
        stmt = (
            select(AppointmentModel)
            .where(*conditions)
            .order_by(AppointmentModel.scheduled_at.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        return [self._to_entity(model) for model in models], total

    async def list_by_vendedor(
        self,
        tenant_id: UUID,
        vendedor_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        status: AppointmentStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Appointment], int]:
        """List appointments for a vendedor with pagination."""
        # Vendedor view: appointments where vendedor_id matches the lead's vendedor
        # We need to join with leads table to filter by vendedor_id
        from prosell.infrastructure.models.lead_model import LeadModel

        conditions = [
            AppointmentModel.tenant_id == tenant_id,
            AppointmentModel.lead_id == LeadModel.id,
            LeadModel.vendedor_id == vendedor_id,
        ]

        if start_date:
            conditions.append(AppointmentModel.scheduled_at >= start_date)
        if end_date:
            conditions.append(AppointmentModel.scheduled_at <= end_date)
        if status:
            conditions.append(AppointmentModel.status == status.value)

        # Count total (need to use distinct)
        count_stmt = select(func.count(AppointmentModel.id.distinct())).where(*conditions)
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        # Fetch paginated results
        stmt = (
            select(AppointmentModel)
            .join(LeadModel, AppointmentModel.lead_id == LeadModel.id)
            .where(*conditions)
            .order_by(AppointmentModel.scheduled_at.asc())
            .limit(limit)
            .offset(offset)
            .distinct()
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        return [self._to_entity(model) for model in models], total

    async def update_status(
        self,
        appointment_id: UUID,
        tenant_id: UUID,
        new_status: AppointmentStatus,
    ) -> Appointment:
        """Update appointment status."""
        stmt = select(AppointmentModel).where(
            AppointmentModel.id == appointment_id,
            AppointmentModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise AppointmentNotFoundException(f"Appointment not found: {appointment_id}")

        # Update model
        model.status = new_status.value
        model.updated_at = datetime.now(UTC)

        await self.session.flush()
        return self._to_entity(model)

    async def list_all(
        self,
        tenant_id: UUID,
        user_id: UUID | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        status: AppointmentStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Appointment], int]:
        """List all appointments for a tenant with optional filters."""
        conditions = [AppointmentModel.tenant_id == tenant_id]

        if user_id:
            conditions.append(AppointmentModel.user_id == user_id)
        if start_date:
            conditions.append(AppointmentModel.scheduled_at >= start_date)
        if end_date:
            conditions.append(AppointmentModel.scheduled_at <= end_date)
        if status:
            conditions.append(AppointmentModel.status == status.value)

        count_stmt = select(func.count(AppointmentModel.id)).where(*conditions)
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        stmt = (
            select(AppointmentModel)
            .where(*conditions)
            .order_by(AppointmentModel.scheduled_at.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        return [self._to_entity(model) for model in models], total

    async def update_appointment(
        self,
        appointment_id: UUID,
        tenant_id: UUID,
        new_status: AppointmentStatus | None = None,
        notes: str | None = None,
    ) -> Appointment:
        """Update appointment status and/or notes."""
        stmt = select(AppointmentModel).where(
            AppointmentModel.id == appointment_id,
            AppointmentModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise AppointmentNotFoundException(f"Appointment not found: {appointment_id}")

        if new_status is not None:
            model.status = new_status.value
        if notes is not None:
            model.notes = notes
        model.updated_at = datetime.now(UTC)

        await self.session.flush()
        return self._to_entity(model)

    async def check_conflicts(
        self,
        user_id: UUID,
        scheduled_at: datetime,
        tenant_id: UUID,
        exclude_appointment_id: UUID | None = None,
    ) -> list[Appointment]:
        """Check for conflicting appointments for a branch (1-hour window)."""
        # Define 1-hour window around scheduled time
        window_start = scheduled_at - timedelta(minutes=30)
        window_end = scheduled_at + timedelta(minutes=30)

        conditions = [
            AppointmentModel.tenant_id == tenant_id,
            AppointmentModel.user_id == user_id,
            AppointmentModel.status == AppointmentStatus.SCHEDULED.value,
            AppointmentModel.scheduled_at >= window_start,
            AppointmentModel.scheduled_at <= window_end,
        ]

        if exclude_appointment_id:
            conditions.append(AppointmentModel.id != exclude_appointment_id)

        stmt = select(AppointmentModel).where(*conditions)
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        return [self._to_entity(model) for model in models]

    def _to_model(self, entity: Appointment) -> AppointmentModel:
        """Convert domain entity to SQLAlchemy model."""
        return AppointmentModel(
            id=entity.id,
            tenant_id=entity.tenant_id,
            lead_id=entity.lead_id,
            user_id=entity.user_id,
            product_id=entity.product_id,
            scheduled_at=entity.scheduled_at,
            status=entity.status.value,
            notes=entity.notes,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )

    def _to_entity(self, model: AppointmentModel) -> Appointment:
        """Convert SQLAlchemy model to domain entity."""
        return Appointment(
            id=model.id,
            tenant_id=model.tenant_id,
            lead_id=model.lead_id,
            user_id=model.user_id,
            product_id=model.product_id,
            scheduled_at=model.scheduled_at,
            status=AppointmentStatus(model.status),
            notes=model.notes,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
