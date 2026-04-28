"""SqlAlchemyLeadRepository implementation."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import and_, func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.entities.lead_audit_log import LeadAuditLog
from prosell.domain.exceptions import LeadNotFoundException, DuplicateLeadException
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.infrastructure.models.lead_model import LeadAuditLogModel, LeadModel


class SqlAlchemyLeadRepository(AbstractLeadRepository):
    """SQLAlchemy implementation of AbstractLeadRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, lead: Lead) -> Lead:
        """Create a new lead."""
        model = self._to_model(lead)
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, lead_id: UUID, tenant_id: UUID) -> Lead | None:
        """Get lead by ID with tenant isolation."""
        stmt = select(LeadModel).where(
            LeadModel.id == lead_id,
            LeadModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_buyer_and_vehicle(
        self,
        buyer_email: str | None,
        buyer_phone: str | None,
        vehicle_id: UUID | None,
        tenant_id: UUID,
        within_hours: int = 24,
    ) -> Lead | None:
        """Check for duplicate lead (same buyer + vehicle within N hours)."""
        if not buyer_email and not buyer_phone:
            return None

        # Build conditions: match email OR phone, AND same vehicle (if provided)
        conditions = [LeadModel.tenant_id == tenant_id]

        buyer_conditions = []
        if buyer_email:
            buyer_conditions.append(LeadModel.buyer_email == buyer_email)
        if buyer_phone:
            buyer_conditions.append(LeadModel.buyer_phone == buyer_phone)

        if buyer_conditions:
            conditions.append(or_(*buyer_conditions))

        if vehicle_id:
            conditions.append(LeadModel.vehicle_id == vehicle_id)

        # Time window: created_at >= now() - within_hours
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=within_hours)
        conditions.append(LeadModel.created_at >= cutoff_time)

        stmt = select(LeadModel).where(*conditions).order_by(LeadModel.created_at.desc())
        result = await self.session.execute(stmt)
        model = result.scalars().first()
        return self._to_entity(model) if model else None

    async def update_status(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        new_status: LeadStatus,
        changed_by_user_id: UUID | None = None,
        reason: str | None = None,
    ) -> Lead:
        """Update lead status and create audit log entry."""
        # Get lead
        stmt = select(LeadModel).where(
            LeadModel.id == lead_id,
            LeadModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise LeadNotFoundException(f"Lead not found: {lead_id}")

        # Convert to entity to validate transition
        lead = self._to_entity(model)

        # Capture old_status BEFORE transition mutates lead.status
        old_status = lead.status
        lead.transition_to(new_status)

        # Update model
        model.status = new_status.value
        model.updated_at = datetime.now(timezone.utc)

        # Create audit log with correct old_status
        audit_log = LeadAuditLog.create(
            lead_id=lead_id,
            tenant_id=tenant_id,
            old_status=old_status,
            new_status=new_status,
            changed_by_user_id=changed_by_user_id,
            reason=reason,
        )

        audit_model = self._audit_log_to_model(audit_log)
        self.session.add(audit_model)

        await self.session.flush()
        return self._to_entity(model)

    async def list_by_vendedor(
        self,
        tenant_id: UUID,
        vendedor_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status: LeadStatus | None = None,
    ) -> tuple[list[Lead], int]:
        """List leads for a vendedor with pagination. Returns (leads, total)."""
        conditions = [
            LeadModel.tenant_id == tenant_id,
            LeadModel.vendedor_id == vendedor_id,
        ]

        if status:
            conditions.append(LeadModel.status == status.value)

        # Count total
        count_stmt = select(func.count(LeadModel.id)).where(*conditions)
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        # Fetch paginated results
        stmt = (
            select(LeadModel)
            .where(*conditions)
            .order_by(LeadModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        leads = [self._to_entity(model) for model in models]
        return leads, total

    async def list_by_manager(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status: LeadStatus | None = None,
    ) -> tuple[list[Lead], int]:
        """List all leads for a tenant (manager view). Returns (leads, total)."""
        conditions = [LeadModel.tenant_id == tenant_id]

        if status:
            conditions.append(LeadModel.status == status.value)

        # Count total
        count_stmt = select(func.count(LeadModel.id)).where(*conditions)
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        # Fetch paginated results
        stmt = (
            select(LeadModel)
            .where(*conditions)
            .order_by(LeadModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        leads = [self._to_entity(model) for model in models]
        return leads, total

    async def get_audit_logs(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        limit: int = 50,
    ) -> list[LeadAuditLog]:
        """Get audit logs for a lead."""
        stmt = (
            select(LeadAuditLogModel)
            .where(
                LeadAuditLogModel.lead_id == lead_id,
                LeadAuditLogModel.tenant_id == tenant_id,
            )
            .order_by(LeadAuditLogModel.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._audit_log_to_entity(model) for model in models]

    def _to_entity(self, model: LeadModel) -> Lead:
        """Convert model to entity."""
        return Lead(
            id=model.id,
            tenant_id=model.tenant_id,
            buyer_name=model.buyer_name,
            buyer_email=model.buyer_email,
            buyer_phone=model.buyer_phone,
            vehicle_id=model.vehicle_id,
            vendedor_id=model.vendedor_id,
            message=model.message,
            source=model.source,
            status=LeadStatus(model.status),
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, entity: Lead) -> LeadModel:
        """Convert entity to model."""
        return LeadModel(
            id=entity.id,
            tenant_id=entity.tenant_id,
            buyer_name=entity.buyer_name,
            buyer_email=entity.buyer_email,
            buyer_phone=entity.buyer_phone,
            vehicle_id=entity.vehicle_id,
            vendedor_id=entity.vendedor_id,
            message=entity.message,
            source=entity.source,
            status=entity.status.value,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )

    def _audit_log_to_entity(self, model: LeadAuditLogModel) -> LeadAuditLog:
        """Convert audit log model to entity."""
        return LeadAuditLog(
            id=model.id,
            tenant_id=model.tenant_id,
            lead_id=model.lead_id,
            old_status=LeadStatus(model.old_status),
            new_status=LeadStatus(model.new_status),
            changed_by_user_id=model.changed_by_user_id,
            reason=model.reason,
            created_at=model.created_at,
        )

    def _audit_log_to_model(self, entity: LeadAuditLog) -> LeadAuditLogModel:
        """Convert audit log entity to model."""
        return LeadAuditLogModel(
            id=entity.id,
            tenant_id=entity.tenant_id,
            lead_id=entity.lead_id,
            old_status=entity.old_status.value,
            new_status=entity.new_status.value,
            changed_by_user_id=entity.changed_by_user_id,
            reason=entity.reason,
            created_at=entity.created_at,
        )
