"""Verify / reject organization use cases."""

from uuid import UUID

from prosell.application.dto.org import OrganizationResponse
from prosell.domain.exceptions.org_exceptions import (
    OrganizationNotFoundException,
    OrganizationVerificationException,
)
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository


class VerifyOrganizationUseCase:
    """Approve organization verification (MASTER/SUPER_ADMIN only)."""

    def __init__(self, org_repository: AbstractOrganizationRepository) -> None:
        self.org_repository = org_repository

    async def execute(
        self,
        org_id: UUID,
        verifier_id: UUID,
        tenant_id: UUID | None = None,
    ) -> OrganizationResponse:
        """
        Verify (approve) an organization.

        Args:
            org_id: Organization UUID
            verifier_id: User ID performing verification
            tenant_id: Optional tenant filter (None = SUPER_ADMIN fetches any)

        Returns:
            Updated OrganizationResponse DTO

        Raises:
            OrganizationNotFoundException: If not found
            OrganizationVerificationException: If verification fails
        """
        if tenant_id is not None:
            org = await self.org_repository.get_by_id(org_id, tenant_id)
        else:
            org = await self.org_repository.get_by_tenant_id(org_id)

        if not org:
            raise OrganizationNotFoundException(str(org_id))

        try:
            org.verify(verifier_id)
        except ValueError as e:
            raise OrganizationVerificationException(str(e)) from e

        updated = await self.org_repository.update(org)
        return OrganizationResponse.from_entity(updated)


class RejectOrganizationUseCase:
    """Reject organization verification (MASTER/SUPER_ADMIN only)."""

    def __init__(self, org_repository: AbstractOrganizationRepository) -> None:
        self.org_repository = org_repository

    async def execute(
        self,
        org_id: UUID,
        verifier_id: UUID,
        tenant_id: UUID | None = None,
    ) -> OrganizationResponse:
        """
        Reject an organization's verification.

        Args:
            org_id: Organization UUID
            verifier_id: User ID performing rejection
            tenant_id: Optional tenant filter

        Returns:
            Updated OrganizationResponse DTO

        Raises:
            OrganizationNotFoundException: If not found
            OrganizationVerificationException: If rejection fails
        """
        if tenant_id is not None:
            org = await self.org_repository.get_by_id(org_id, tenant_id)
        else:
            org = await self.org_repository.get_by_tenant_id(org_id)

        if not org:
            raise OrganizationNotFoundException(str(org_id))

        try:
            org.reject(verifier_id)
        except ValueError as e:
            raise OrganizationVerificationException(str(e)) from e

        updated = await self.org_repository.update(org)
        return OrganizationResponse.from_entity(updated)


class SuspendOrganizationUseCase:
    """Suspend an active organization."""

    def __init__(self, org_repository: AbstractOrganizationRepository) -> None:
        self.org_repository = org_repository

    async def execute(self, org_id: UUID, tenant_id: UUID) -> OrganizationResponse:
        """Suspend organization."""
        org = await self.org_repository.get_by_id(org_id, tenant_id)
        if not org:
            raise OrganizationNotFoundException(str(org_id))

        org.suspend()
        updated = await self.org_repository.update(org)
        return OrganizationResponse.from_entity(updated)
