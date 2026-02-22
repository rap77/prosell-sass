"""Organization repository interface."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.organization import Organization


class AbstractOrganizationRepository(ABC):
    """Repository interface for Organization entities."""

    @abstractmethod
    async def create(self, organization: Organization) -> Organization:
        """
        Create a new organization.

        Args:
            organization: Organization entity to create

        Returns:
            Created organization with generated ID
        """
        pass

    @abstractmethod
    async def get_by_id(self, org_id: UUID, tenant_id: UUID) -> Organization | None:
        """
        Get organization by ID (with tenant isolation).

        Args:
            org_id: Organization UUID
            tenant_id: Tenant UUID for isolation

        Returns:
            Organization entity or None if not found
        """
        pass

    @abstractmethod
    async def get_by_tenant_id(self, tenant_id: UUID) -> Organization | None:
        """
        Get organization by tenant ID.

        Args:
            tenant_id: Tenant UUID (same as org_id in our design)

        Returns:
            Organization entity or None if not found
        """
        pass

    @abstractmethod
    async def get_all(
        self,
        tenant_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Organization]:
        """
        Get all organizations (with optional tenant filtering).

        Args:
            tenant_id: Optional tenant filter (None = all orgs for SUPER_ADMIN)
            skip: Number of records to skip (pagination)
            limit: Max records to return (pagination)

        Returns:
            List of organizations
        """
        pass

    @abstractmethod
    async def update(self, organization: Organization) -> Organization:
        """
        Update an existing organization.

        Args:
            organization: Organization entity with updated fields

        Returns:
            Updated organization
        """
        pass

    @abstractmethod
    async def delete(self, org_id: UUID, tenant_id: UUID) -> bool:
        """
        Delete an organization (soft delete recommended).

        Args:
            org_id: Organization UUID
            tenant_id: Tenant UUID for isolation

        Returns:
            True if deleted, False if not found
        """
        pass

    @abstractmethod
    async def exists_by_name(self, name: str, tenant_id: UUID) -> bool:
        """
        Check if organization with given name exists (for uniqueness validation).

        Args:
            name: Organization name
            tenant_id: Tenant UUID

        Returns:
            True if exists, False otherwise
        """
        pass

    @abstractmethod
    async def count(self, tenant_id: UUID | None = None) -> int:
        """
        Count total organizations.

        Args:
            tenant_id: Optional tenant filter

        Returns:
            Total count
        """
        pass
