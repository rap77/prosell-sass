"""Unit tests for marketplace access use cases."""

from uuid import UUID, uuid4

import pytest

from prosell.application.use_cases.organization.request_marketplace_access import (
    RequestMarketplaceAccessUseCase,
)
from prosell.domain.entities.marketplace_access import MarketplaceAccessGrant
from prosell.domain.repositories.marketplace_access_repository import (
    AbstractMarketplaceAccessRepository,
)


class InMemoryMarketplaceAccessRepository(AbstractMarketplaceAccessRepository):
    """In-memory repository for testing - works with domain entities."""

    def __init__(self):
        self.grants = {}

    async def get_by_id(self, grant_id: UUID) -> MarketplaceAccessGrant | None:
        """Get grant by ID."""
        return self.grants.get(grant_id)

    async def get_by_orgs(
        self, inventory_owner_id: UUID, operator_id: UUID
    ) -> MarketplaceAccessGrant | None:
        """Get grant by owner and operator."""
        for grant in self.grants.values():
            if (
                grant.inventory_owner_organization_id == inventory_owner_id
                and grant.operator_organization_id == operator_id
            ):
                return grant
        return None

    async def create(self, grant: MarketplaceAccessGrant) -> MarketplaceAccessGrant:
        """Create a new grant."""
        self.grants[grant.id] = grant
        return grant

    async def update(self, grant: MarketplaceAccessGrant) -> MarketplaceAccessGrant:
        """Update an existing grant."""
        self.grants[grant.id] = grant
        return grant

    async def list_by_inventory_owner(
        self, inventory_owner_id: UUID
    ) -> list[MarketplaceAccessGrant]:
        """List grants where org is inventory owner."""
        return [
            g
            for g in self.grants.values()
            if g.inventory_owner_organization_id == inventory_owner_id
        ]

    async def list_by_operator(self, operator_id: UUID) -> list[MarketplaceAccessGrant]:
        """List grants where org is operator."""
        return [g for g in self.grants.values() if g.operator_organization_id == operator_id]


@pytest.mark.asyncio
class TestRequestMarketplaceAccessUseCase:
    """Test request marketplace access use case."""

    async def test_inventory_owner_can_request_access(self):
        """Inventory owner can request marketplace operator access."""
        repo = InMemoryMarketplaceAccessRepository()
        use_case = RequestMarketplaceAccessUseCase(repo)

        inventory_owner_org_id = uuid4()
        operator_org_id = uuid4()
        requester_user_id = uuid4()

        grant = await use_case.execute(
            inventory_owner_organization_id=inventory_owner_org_id,
            operator_organization_id=operator_org_id,
            requested_by_user_id=requester_user_id,
            can_publish_marketplace=True,
        )

        assert grant.status.value == "pending"
        assert grant.inventory_owner_organization_id == inventory_owner_org_id
        assert grant.operator_organization_id == operator_org_id
        assert grant.requested_by_user_id == requester_user_id
        assert grant.can_publish_marketplace is True
        assert grant.approved_by_user_id is None
        assert grant.approved_at is None

    async def test_duplicate_request_returns_existing_pending(self):
        """Requesting again when pending returns existing request."""
        repo = InMemoryMarketplaceAccessRepository()
        use_case = RequestMarketplaceAccessUseCase(repo)

        inventory_owner_org_id = uuid4()
        operator_org_id = uuid4()
        requester_user_id = uuid4()

        # First request
        grant1 = await use_case.execute(
            inventory_owner_organization_id=inventory_owner_org_id,
            operator_organization_id=operator_org_id,
            requested_by_user_id=requester_user_id,
            can_publish_marketplace=True,
        )

        # Second request
        grant2 = await use_case.execute(
            inventory_owner_organization_id=inventory_owner_org_id,
            operator_organization_id=operator_org_id,
            requested_by_user_id=requester_user_id,
            can_publish_marketplace=True,
        )

        # Should return same grant
        assert grant1.id == grant2.id
        assert grant2.status.value == "pending"


@pytest.mark.asyncio
class TestApproveMarketplaceAccessUseCase:
    """Test approve marketplace access use case."""

    async def test_operator_can_approve_pending_request(self):
        """Operator can approve a pending request."""
        from prosell.application.use_cases.organization.approve_marketplace_access import (
            ApproveMarketplaceAccessUseCase,
        )

        repo = InMemoryMarketplaceAccessRepository()
        request_uc = RequestMarketplaceAccessUseCase(repo)
        approve_uc = ApproveMarketplaceAccessUseCase(repo)

        inventory_owner_org_id = uuid4()
        operator_org_id = uuid4()
        requester_user_id = uuid4()
        approver_user_id = uuid4()

        # Create pending request
        grant = await request_uc.execute(
            inventory_owner_organization_id=inventory_owner_org_id,
            operator_organization_id=operator_org_id,
            requested_by_user_id=requester_user_id,
            can_publish_marketplace=True,
        )

        # Approve it
        approved = await approve_uc.execute(
            grant_id=grant.id,
            approved_by_user_id=approver_user_id,
        )

        assert approved.status.value == "active"
        assert approved.approved_by_user_id == approver_user_id
        assert approved.approved_at is not None


@pytest.mark.asyncio
class TestRejectMarketplaceAccessUseCase:
    """Test reject marketplace access use case."""

    async def test_operator_can_reject_pending_request(self):
        """Operator can reject a pending request with reason."""
        from prosell.application.use_cases.organization.reject_marketplace_access import (
            RejectMarketplaceAccessUseCase,
        )

        repo = InMemoryMarketplaceAccessRepository()
        request_uc = RequestMarketplaceAccessUseCase(repo)
        reject_uc = RejectMarketplaceAccessUseCase(repo)

        inventory_owner_org_id = uuid4()
        operator_org_id = uuid4()
        requester_user_id = uuid4()
        rejector_user_id = uuid4()

        # Create pending request
        grant = await request_uc.execute(
            inventory_owner_organization_id=inventory_owner_org_id,
            operator_organization_id=operator_org_id,
            requested_by_user_id=requester_user_id,
            can_publish_marketplace=True,
        )

        # Reject it
        rejected = await reject_uc.execute(
            grant_id=grant.id,
            rejected_by_user_id=rejector_user_id,
            reason="Not authorized for marketplace",
        )

        assert rejected.status.value == "rejected"
        assert rejected.rejected_by_user_id == rejector_user_id
        assert rejected.rejected_at is not None
        assert rejected.rejection_reason == "Not authorized for marketplace"


@pytest.mark.asyncio
class TestRevokeMarketplaceAccessUseCase:
    """Test revoke marketplace access use case."""

    async def test_either_party_can_revoke_active_grant(self):
        """Inventory owner or operator can revoke an active grant."""
        from prosell.application.use_cases.organization.approve_marketplace_access import (
            ApproveMarketplaceAccessUseCase,
        )
        from prosell.application.use_cases.organization.revoke_marketplace_access import (
            RevokeMarketplaceAccessUseCase,
        )

        repo = InMemoryMarketplaceAccessRepository()
        request_uc = RequestMarketplaceAccessUseCase(repo)
        approve_uc = ApproveMarketplaceAccessUseCase(repo)
        revoke_uc = RevokeMarketplaceAccessUseCase(repo)

        inventory_owner_org_id = uuid4()
        operator_org_id = uuid4()
        requester_user_id = uuid4()
        approver_user_id = uuid4()
        revoker_user_id = uuid4()

        # Create and approve
        grant = await request_uc.execute(
            inventory_owner_organization_id=inventory_owner_org_id,
            operator_organization_id=operator_org_id,
            requested_by_user_id=requester_user_id,
            can_publish_marketplace=True,
        )
        approved = await approve_uc.execute(
            grant_id=grant.id,
            approved_by_user_id=approver_user_id,
        )

        # Revoke it
        revoked = await revoke_uc.execute(
            grant_id=approved.id,
            revoked_by_user_id=revoker_user_id,
            reason="No longer needed",
        )

        assert revoked.status.value == "revoked"
        assert revoked.revoked_by_user_id == revoker_user_id
        assert revoked.revoked_at is not None
        assert revoked.revocation_reason == "No longer needed"
