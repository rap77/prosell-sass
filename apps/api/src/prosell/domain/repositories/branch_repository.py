"""AbstractBranchRepository interface."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.branch import Branch


class AbstractBranchRepository(ABC):
    """Repository interface for Branch entities."""

    @abstractmethod
    async def create(self, branch: Branch) -> Branch:
        """Create a new branch."""
        pass

    @abstractmethod
    async def get_by_id(self, branch_id: UUID, tenant_id: UUID | None = None) -> Branch | None:
        """Get branch by ID with optional tenant isolation."""
        pass

    @abstractmethod
    async def get_by_slug(self, slug: str, tenant_id: UUID) -> Branch | None:
        """Get branch by slug (unique per tenant)."""
        pass

    @abstractmethod
    async def exists_by_slug(self, slug: str, tenant_id: UUID) -> bool:
        """Check if slug exists (for validation)."""
        pass

    @abstractmethod
    async def update(self, branch: Branch) -> Branch:
        """Update an existing branch."""
        pass

    @abstractmethod
    async def delete(self, branch_id: UUID, tenant_id: UUID) -> None:
        """Delete a branch by ID."""
        pass

    @abstractmethod
    async def list_by_tenant(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Branch], int]:
        """List branches for a tenant with pagination. Returns (branches, total)."""
        pass
