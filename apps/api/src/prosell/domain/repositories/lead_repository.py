"""AbstractLeadRepository interface."""

from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.entities.lead_activity import LeadActivity
from prosell.domain.entities.lead_audit_log import LeadAuditLog


class AbstractLeadRepository(ABC):
    """Repository interface for Lead entities."""

    @abstractmethod
    async def create(self, lead: Lead) -> Lead:
        """Create a new lead."""
        pass

    @abstractmethod
    async def get_by_id(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        *,
        include_product: bool = False,
    ) -> Lead | None:
        """Get lead by ID with tenant isolation and optional product JOIN."""
        pass

    @abstractmethod
    async def get_many_by_ids(
        self,
        lead_ids: list[UUID],
        tenant_id: UUID,
    ) -> list[Lead]:
        """Get multiple leads by ID in a single query (no N+1)."""
        pass

    @abstractmethod
    async def get_by_buyer_and_product(
        self,
        buyer_email: str | None,
        buyer_phone: str | None,
        product_id: UUID | None,
        tenant_id: UUID,
        within_hours: int = 24,
    ) -> Lead | None:
        """Check for duplicate lead (same buyer + vehicle within N hours)."""
        pass

    @abstractmethod
    async def update_status(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        new_status: LeadStatus,
        changed_by_user_id: UUID | None = None,
        reason: str | None = None,
    ) -> Lead:
        """Update lead status and create audit log entry."""
        pass

    @abstractmethod
    async def list_by_vendedor(
        self,
        tenant_id: UUID,
        vendedor_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status: LeadStatus | None = None,
        include_products: bool = False,
    ) -> tuple[list[Lead], int]:
        """List leads for a vendedor with pagination. Returns (leads, total)."""
        pass

    @abstractmethod
    async def list_by_manager(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status: LeadStatus | None = None,
        vendedor_id: UUID | None = None,
        include_products: bool = False,
    ) -> tuple[list[Lead], int]:
        """List all leads for a tenant (manager view). Returns (leads, total)."""
        pass

    @abstractmethod
    async def get_audit_logs(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        limit: int = 50,
    ) -> list[LeadAuditLog]:
        """Get audit logs for a lead."""
        pass

    @abstractmethod
    async def create_activity(self, activity: LeadActivity) -> LeadActivity:
        """Create a manual activity entry (note/call) for a lead.

        Raises LeadNotFoundException if the lead doesn't exist in the
        tenant — CRM roadmap Fase 4 ("Activities").
        """
        pass

    @abstractmethod
    async def get_activities(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        limit: int = 50,
    ) -> list[LeadActivity]:
        """Get manual activity entries for a lead, newest first."""
        pass

    @abstractmethod
    async def find_by_email(
        self,
        tenant_id: UUID,
        email: str,
        within_hours: int = 24,
    ) -> list[Lead]:
        """Find leads by buyer email (exact match) within time window."""
        pass

    @abstractmethod
    async def find_by_phone(
        self,
        tenant_id: UUID,
        phone: str,
        within_hours: int = 24,
    ) -> list[Lead]:
        """Find leads by buyer phone (normalized match) within time window."""
        pass

    @abstractmethod
    async def find_potential_duplicates(
        self,
        tenant_id: UUID,
        email: str | None = None,
        phone: str | None = None,
        within_hours: int = 24,
    ) -> list[Lead]:
        """Find potential duplicate leads by email or phone within time window."""
        pass

    @abstractmethod
    async def assign_to_vendedor(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        new_vendedor_id: UUID | None,
    ) -> Lead:
        """Assign lead to a vendedor (or unassign if None)."""
        pass

    @abstractmethod
    async def count_by_vendedor(
        self,
        vendedor_id: UUID,
        tenant_id: UUID,
        status: LeadStatus | None = None,
    ) -> int:
        """Count active leads assigned to a vendedor."""
        pass

    @abstractmethod
    async def list_stale(
        self,
        before: datetime,
        exclude_statuses: list[LeadStatus],
    ) -> list[Lead]:
        """List leads (across every tenant) not updated since `before`,
        excluding any in `exclude_statuses` (e.g. LOST — terminal leads
        don't need a "no activity" nudge). CRM roadmap Fase 5
        ("Automations" — the stale-lead cron). A platform-wide sweep, not
        tenant-scoped, since the cron runs once for the whole system."""
        pass

    @abstractmethod
    async def touch(self, lead_id: UUID, tenant_id: UUID) -> None:
        """Bump `updated_at` to now without any other change — resets the
        staleness clock after a stale-lead notification is sent, so the
        next cron run doesn't re-notify for the same inactivity window."""
        pass

    @abstractmethod
    async def list_by_tenant(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status_filter: LeadStatus | None = None,
    ) -> tuple[list[Lead], int]:
        """List all leads for a tenant with pagination. Returns (leads, total)."""
        pass
