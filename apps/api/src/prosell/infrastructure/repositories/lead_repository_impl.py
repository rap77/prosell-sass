"""SqlAlchemyLeadRepository implementation with product JOIN support."""

from datetime import UTC, datetime, timedelta
from typing import Any, NamedTuple, cast
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.entities.lead_audit_log import LeadAuditLog
from prosell.domain.exceptions import LeadNotFoundException
from prosell.domain.exceptions.lead_exceptions import LeadStateTransitionException
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.infrastructure.models.lead_model import LeadAuditLogModel, LeadModel
from prosell.infrastructure.models.product_model import ProductModel


class LeadWithProduct(NamedTuple):
    """Lead entity with optional product model."""
    lead: Lead
    product_model: ProductModel | None = None


class SqlAlchemyLeadRepository(AbstractLeadRepository):
    """SQLAlchemy implementation of AbstractLeadRepository with product JOIN."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, lead: Lead) -> Lead:
        """Create a new lead."""
        model = self._to_model(lead)
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        *,
        include_product: bool = False,
    ) -> Lead | None:
        """Get lead by ID with tenant isolation and optional product JOIN."""
        if include_product:
            # LEFT JOIN with products table - select both models
            stmt = (
                select(LeadModel, ProductModel)
                .outerjoin(ProductModel, LeadModel.product_id == ProductModel.id)
                .where(
                    LeadModel.id == lead_id,
                    LeadModel.tenant_id == tenant_id,
                )
            )
            result = await self.session.execute(stmt)
            row = result.first()
            if not row:
                return None
            lead_model, _product_model = row
            return self._to_entity(lead_model)
        else:
            # Original behavior - just get lead
            stmt_single = select(LeadModel).where(
                LeadModel.id == lead_id,
                LeadModel.tenant_id == tenant_id,
            )
            result = await self.session.execute(stmt_single)
            model = result.scalar_one_or_none()
            return self._to_entity(model) if model else None

    async def get_by_buyer_and_product(
        self,
        buyer_email: str | None,
        buyer_phone: str | None,
        product_id: UUID | None,
        tenant_id: UUID,
        within_hours: int = 24,
    ) -> Lead | None:
        """
        Check for duplicate lead (same buyer + vehicle within N hours).

        Duplicate logic:
        - If product_id is provided: Only match leads with that specific product_id
        - If product_id is null: Return None (no duplicate detection for leads without vehicles)
        This prevents false positives when multiple leads have no vehicle associated.
        """
        cutoff = datetime.now(UTC) - timedelta(hours=within_hours)

        conditions = [
            LeadModel.tenant_id == tenant_id,
            LeadModel.created_at >= cutoff,
        ]

        if buyer_email:
            conditions.append(LeadModel.buyer_email == buyer_email)
        elif buyer_phone:
            conditions.append(LeadModel.buyer_phone == buyer_phone)
        else:
            return None  # Must have at least one identifier

        # Vehicle condition: only check duplicates when product_id is provided
        if product_id is not None:
            conditions.append(LeadModel.product_id == product_id)
            stmt = select(LeadModel).where(*conditions).order_by(LeadModel.created_at.desc())
            result = await self.session.execute(stmt)
            model = result.scalar_one_or_none()
            return self._to_entity(model) if model else None
        else:
            # No product_id provided - skip duplicate detection
            return None

    async def list_by_tenant(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status_filter: LeadStatus | None = None,
    ) -> tuple[list[Lead], int]:
        """List leads with pagination and status filter."""
        # Count total
        count_stmt = select(func.count()).select_from(LeadModel).where(
            LeadModel.tenant_id == tenant_id
        )
        if status_filter:
            count_stmt = count_stmt.where(LeadModel.status == status_filter)
        
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0
        
        # Fetch page
        stmt = (
            select(LeadModel)
            .where(LeadModel.tenant_id == tenant_id)
            .order_by(LeadModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if status_filter:
            stmt = stmt.where(LeadModel.status == status_filter)
            
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        
        return [self._to_entity(model) for model in models], total

    async def update_status(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        new_status: LeadStatus,
        changed_by_user_id: UUID | None = None,
        reason: str | None = None,
    ) -> Lead:
        """Update lead status and create audit log entry."""
        # Fetch lead
        stmt = select(LeadModel).where(
            LeadModel.id == lead_id,
            LeadModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            raise LeadNotFoundException(f"Lead not found: {lead_id}")
        
        # Validate state transition via domain entity
        entity = self._to_entity(model)
        if not entity.can_transition_to(new_status):
            raise LeadStateTransitionException(
                current_status=entity.status.value,
                target_status=new_status.value,
            )

        # Update status
        old_status = model.status
        model.status = new_status.value
        model.updated_at = datetime.now(UTC)

        # Create audit log
        audit_log = LeadAuditLogModel(
            lead_id=lead_id,
            tenant_id=tenant_id,
            old_status=old_status if old_status else None,
            new_status=new_status,
            changed_by_user_id=changed_by_user_id,
            reason=reason,
        )
        self.session.add(audit_log)
        
        await self.session.flush()
        return self._to_entity(model)

    async def get_audit_logs(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        limit: int = 50,
    ) -> list[LeadAuditLog]:
        """Get audit log history for a lead."""
        # Verify lead exists in tenant
        stmt = select(LeadModel).where(
            LeadModel.id == lead_id,
            LeadModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        if not result.scalar_one_or_none():
            raise LeadNotFoundException(f"Lead not found: {lead_id}")
        
        # Fetch audit logs
        stmt = (
            select(LeadAuditLogModel)
            .where(LeadAuditLogModel.lead_id == lead_id)
            .order_by(LeadAuditLogModel.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt_audit)
        models = result.scalars().all()
        
        return [self._audit_log_to_entity(model) for model in models]

    async def list_by_vendedor(
        self,
        tenant_id: UUID,
        vendedor_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status: LeadStatus | None = None,
        include_products: bool = False,
    ) -> tuple[list[Lead], int]:
        """List leads assigned to a specific vendedor with optional vehicle JOIN."""
        base_filter = [
            LeadModel.tenant_id == tenant_id,
            LeadModel.vendedor_id == vendedor_id,
        ]
        if status:
            base_filter.append(LeadModel.status == status.value)

        count_result = await self.session.execute(
            select(func.count()).select_from(LeadModel).where(*base_filter)
        )
        total = count_result.scalar() or 0

        if include_products:
            stmt = (
                select(LeadModel, ProductModel)
                .outerjoin(ProductModel, LeadModel.product_id == ProductModel.id)
                .where(*base_filter)
                .order_by(LeadModel.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
            result = await self.session.execute(stmt)
            rows = result.all()
            leads = [LeadWithProduct(lead=self._to_entity(r[0]), product_model=r[1]) for r in rows]
            # Convert LeadWithProduct to Lead for return type compatibility
            return [lp.lead for lp in leads], total
        else:
            result = await self.session.execute(
                select(LeadModel).where(*base_filter)
                .order_by(LeadModel.created_at.desc()).limit(limit).offset(offset)
            )
            return [self._to_entity(m) for m in result.scalars().all()], total

    async def list_by_manager(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status: LeadStatus | None = None,
        vendedor_id: UUID | None = None,
        include_products: bool = False,
    ) -> tuple[list[Lead], int]:
        """List all leads for a tenant (manager view) with optional vehicle JOIN."""
        base_filter = [LeadModel.tenant_id == tenant_id]
        if status:
            base_filter.append(LeadModel.status == status.value)
        if vendedor_id:
            base_filter.append(LeadModel.vendedor_id == vendedor_id)

        count_result = await self.session.execute(
            select(func.count()).select_from(LeadModel).where(*base_filter)
        )
        total = count_result.scalar() or 0

        if include_products:
            stmt = (
                select(LeadModel, ProductModel)
                .outerjoin(ProductModel, LeadModel.product_id == ProductModel.id)
                .where(*base_filter)
                .order_by(LeadModel.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
            result = await self.session.execute(stmt)
            rows = result.all()
            leads = [LeadWithProduct(lead=self._to_entity(r[0]), product_model=r[1]) for r in rows]
            # Convert LeadWithProduct to Lead for return type compatibility
            return [lp.lead for lp in leads], total
        else:
            result = await self.session.execute(
                select(LeadModel).where(*base_filter)
                .order_by(LeadModel.created_at.desc()).limit(limit).offset(offset)
            )
            return [self._to_entity(m) for m in result.scalars().all()], total

    async def assign_to_vendedor(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        new_vendedor_id: UUID | None,
    ) -> Lead:
        """Assign lead to a vendedor (or unassign if None)."""
        result = await self.session.execute(
            select(LeadModel).where(
                LeadModel.id == lead_id,
                LeadModel.tenant_id == tenant_id,
            )
        )
        model = result.scalar_one_or_none()
        if not model:
            raise LeadNotFoundException(f"Lead not found: {lead_id}")
        model.vendedor_id = new_vendedor_id
        model.updated_at = datetime.now(UTC)
        await self.session.flush()
        return self._to_entity(model)

    def _to_entity(self, model: LeadModel) -> Lead:
        """Convert ORM model to domain entity."""
        return Lead(
            id=model.id,
            tenant_id=model.tenant_id,
            buyer_name=model.buyer_name,
            buyer_email=model.buyer_email,
            buyer_phone=model.buyer_phone,
            product_id=model.product_id,
            vendedor_id=model.vendedor_id,
            message=model.message,
            source=model.source,
            status=LeadStatus(model.status),
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, entity: Lead) -> LeadModel:
        """Convert domain entity to ORM model."""
        return LeadModel(
            id=entity.id,
            tenant_id=entity.tenant_id,
            buyer_name=entity.buyer_name,
            buyer_email=entity.buyer_email,
            buyer_phone=entity.buyer_phone,
            product_id=entity.product_id,
            vendedor_id=entity.vendedor_id,
            message=entity.message,
            source=entity.source,
            status=entity.status.value,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )

    def _audit_log_to_entity(self, model: LeadAuditLogModel) -> LeadAuditLog:
        """Convert audit log ORM model to domain entity."""
        return LeadAuditLog(
            id=model.id,
            lead_id=model.lead_id,
            tenant_id=model.tenant_id,
            old_status=LeadStatus(model.old_status),
            new_status=LeadStatus(model.new_status),
            changed_by_user_id=model.changed_by_user_id,
            reason=model.reason,
            created_at=model.created_at,
        )

    async def find_by_email(
        self,
        tenant_id: UUID,
        email: str,
    ) -> list[Lead]:
        """Find leads by buyer email (exact match)."""
        from prosell.infrastructure.models.lead_model import LeadModel

        stmt = (
            select(LeadModel)
            .where(LeadModel.tenant_id == tenant_id)
            .where(LeadModel.buyer_email == email)
            .order_by(LeadModel.created_at.desc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(model) for model in models]

    async def find_by_phone(
        self,
        tenant_id: UUID,
        phone: str,
    ) -> list[Lead]:
        """Find leads by buyer phone (normalized match)."""
        from prosell.infrastructure.models.lead_model import LeadModel

        stmt = (
            select(LeadModel)
            .where(LeadModel.tenant_id == tenant_id)
            .where(LeadModel.buyer_phone == phone)
            .order_by(LeadModel.created_at.desc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(model) for model in models]

    async def find_potential_duplicates(
        self,
        tenant_id: UUID,
        email: str | None = None,
        phone: str | None = None,
    ) -> list[Lead]:
        """Find potential duplicate leads by email or phone."""
        from prosell.infrastructure.models.lead_model import LeadModel

        conditions: list[Any] = []
        if email:
            conditions.append(LeadModel.buyer_email == email)
        if phone:
            conditions.append(LeadModel.buyer_phone == phone)

        if not conditions:
            return []

        stmt = (
            select(LeadModel)
            .where(LeadModel.tenant_id == tenant_id)
            .where(or_(*conditions))
            .order_by(LeadModel.created_at.desc())
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(model) for model in models]
