"""AbstractLeadRepository interface."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.entities.lead_audit_log import LeadAuditLog


class AbstractLeadRepository(ABC):
    """Repository interface for Lead entities."""

    @abstractmethod
    async def create(self, lead: Lead) -> Lead:
        """Create a new lead."""
        pass

    @abstractmethod
    async def get_by_id(self, lead_id: UUID, tenant_id: UUID) -> Lead | None:
        """Get lead by ID with tenant isolation."""
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
    async def find_by_email(
        self,
        tenant_id: UUID,
        email: str,
    ) -> list[Lead]:
        """Find leads by buyer email (exact match)."""
        pass

    @abstractmethod
    async def find_by_phone(
        self,
        tenant_id: UUID,
        phone: str,
    ) -> list[Lead]:
        """Find leads by buyer phone (normalized match)."""
        pass

    @abstractmethod
    async def find_potential_duplicates(
        self,
        tenant_id: UUID,
        email: str | None = None,
        phone: str | None = None,
    ) -> list[Lead]:
        """Find potential duplicate leads by email or phone."""
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
    async def list_by_tenant(
        self,
        tenant_id: UUID,
    ) -> list[Lead]:
        """List all leads for a tenant (for metrics calculation)."""
        pass
