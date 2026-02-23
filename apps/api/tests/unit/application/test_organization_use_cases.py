"""Unit tests for Organization use cases."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.application.dto.org import (
    CreateOrganizationRequest,
    UpdateOrganizationRequest,
)
from prosell.application.use_cases.org import (
    CreateOrganizationUseCase,
    GetOrganizationByTenantUseCase,
    GetOrganizationUseCase,
    ListOrganizationsUseCase,
    RejectOrganizationUseCase,
    SuspendOrganizationUseCase,
    UpdateOrganizationUseCase,
    VerifyOrganizationUseCase,
)
from prosell.domain.entities.organization import Organization
from prosell.domain.entities.wallet import Wallet
from prosell.domain.exceptions.org_exceptions import (
    OrganizationAlreadyExistsException,
    OrganizationNotFoundException,
    OrganizationVerificationException,
)
from prosell.domain.value_objects.organization_status import OrganizationStatus

# =============================================================================
# HELPERS
# =============================================================================


def make_org(
    name: str = "Acme Corp",
    status: OrganizationStatus = OrganizationStatus.PENDING_VERIFICATION,
) -> Organization:
    tenant_id = uuid4()
    org = Organization.create(name=name, tenant_id=tenant_id)
    org.status = status
    return org


def make_wallet(org: Organization) -> Wallet:
    return Wallet.create(org_id=org.id, tenant_id=org.tenant_id)


def make_org_repo() -> MagicMock:
    repo = MagicMock()
    repo.exists_by_name = AsyncMock(return_value=False)
    repo.create = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=None)
    repo.get_by_tenant_id = AsyncMock(return_value=None)
    repo.get_all = AsyncMock(return_value=[])
    repo.update = AsyncMock()
    repo.count = AsyncMock(return_value=0)
    return repo


def make_wallet_repo() -> MagicMock:
    repo = MagicMock()
    repo.create = AsyncMock()
    return repo


# =============================================================================
# CreateOrganizationUseCase
# =============================================================================


class TestCreateOrganizationUseCase:
    async def test_create_success(self) -> None:
        """Creates org + wallet and returns response."""
        org = make_org()
        wallet = make_wallet(org)
        org_repo = make_org_repo()
        wallet_repo = make_wallet_repo()

        org_repo.exists_by_name.return_value = False
        org_repo.create.return_value = org
        wallet_repo.create.return_value = wallet
        # After linking wallet_id, update is called
        linked_org = Organization.model_validate(org.model_dump())
        linked_org.wallet_id = wallet.id
        org_repo.update.return_value = linked_org

        request = CreateOrganizationRequest(name=org.name, tenant_id=org.tenant_id)
        use_case = CreateOrganizationUseCase(org_repo, wallet_repo)

        result = await use_case.execute(request, creator_id=uuid4())

        assert result.name == org.name
        assert result.tenant_id == org.tenant_id
        assert result.status == OrganizationStatus.PENDING_VERIFICATION.value
        org_repo.create.assert_awaited_once()
        wallet_repo.create.assert_awaited_once()
        org_repo.update.assert_awaited_once()

    async def test_create_raises_when_name_exists(self) -> None:
        """Raises OrganizationAlreadyExistsException when name is taken."""
        org_repo = make_org_repo()
        wallet_repo = make_wallet_repo()
        org_repo.exists_by_name.return_value = True

        request = CreateOrganizationRequest(name="Existing Corp", tenant_id=uuid4())
        use_case = CreateOrganizationUseCase(org_repo, wallet_repo)

        with pytest.raises(OrganizationAlreadyExistsException):
            await use_case.execute(request, creator_id=uuid4())

        org_repo.create.assert_not_awaited()
        wallet_repo.create.assert_not_awaited()


# =============================================================================
# GetOrganizationUseCase
# =============================================================================


class TestGetOrganizationUseCase:
    async def test_get_success(self) -> None:
        """Returns response when org exists."""
        org = make_org()
        org_repo = make_org_repo()
        org_repo.get_by_id.return_value = org

        use_case = GetOrganizationUseCase(org_repo)
        result = await use_case.execute(org_id=org.id, tenant_id=org.tenant_id)

        assert result.id == org.id
        assert result.name == org.name
        org_repo.get_by_id.assert_awaited_once_with(org.id, org.tenant_id)

    async def test_get_raises_when_not_found(self) -> None:
        """Raises OrganizationNotFoundException when org missing."""
        org_repo = make_org_repo()
        org_repo.get_by_id.return_value = None

        use_case = GetOrganizationUseCase(org_repo)

        with pytest.raises(OrganizationNotFoundException):
            await use_case.execute(org_id=uuid4(), tenant_id=uuid4())


# =============================================================================
# GetOrganizationByTenantUseCase
# =============================================================================


class TestGetOrganizationByTenantUseCase:
    async def test_get_by_tenant_success(self) -> None:
        """Returns response when org found by tenant_id."""
        org = make_org()
        org_repo = make_org_repo()
        org_repo.get_by_tenant_id.return_value = org

        use_case = GetOrganizationByTenantUseCase(org_repo)
        result = await use_case.execute(tenant_id=org.tenant_id)

        assert result.tenant_id == org.tenant_id
        org_repo.get_by_tenant_id.assert_awaited_once_with(org.tenant_id)

    async def test_get_by_tenant_raises_when_not_found(self) -> None:
        """Raises OrganizationNotFoundException when tenant has no org."""
        org_repo = make_org_repo()
        org_repo.get_by_tenant_id.return_value = None

        use_case = GetOrganizationByTenantUseCase(org_repo)

        with pytest.raises(OrganizationNotFoundException):
            await use_case.execute(tenant_id=uuid4())


# =============================================================================
# ListOrganizationsUseCase
# =============================================================================


class TestListOrganizationsUseCase:
    async def test_list_all(self) -> None:
        """Returns paginated list with total count."""
        orgs = [make_org("Org A"), make_org("Org B")]
        org_repo = make_org_repo()
        org_repo.get_all.return_value = orgs
        org_repo.count.return_value = 2

        use_case = ListOrganizationsUseCase(org_repo)
        result = await use_case.execute(skip=0, limit=10)

        assert result.total == 2
        assert len(result.organizations) == 2
        assert result.skip == 0
        assert result.limit == 10

    async def test_list_filtered_by_tenant(self) -> None:
        """Filters by tenant_id when provided."""
        tenant_id = uuid4()
        org = make_org()
        org_repo = make_org_repo()
        org_repo.get_all.return_value = [org]
        org_repo.count.return_value = 1

        use_case = ListOrganizationsUseCase(org_repo)
        result = await use_case.execute(tenant_id=tenant_id, skip=0, limit=10)

        assert result.total == 1
        org_repo.get_all.assert_awaited_once_with(tenant_id=tenant_id, skip=0, limit=10)
        org_repo.count.assert_awaited_once_with(tenant_id=tenant_id)

    async def test_list_empty(self) -> None:
        """Returns empty list when no orgs exist."""
        org_repo = make_org_repo()
        org_repo.get_all.return_value = []
        org_repo.count.return_value = 0

        use_case = ListOrganizationsUseCase(org_repo)
        result = await use_case.execute()

        assert result.total == 0
        assert result.organizations == []


# =============================================================================
# UpdateOrganizationUseCase
# =============================================================================


class TestUpdateOrganizationUseCase:
    async def test_update_success(self) -> None:
        """Updates org fields and returns updated response."""
        org = make_org()
        org_repo = make_org_repo()
        org_repo.get_by_id.return_value = org

        updated_org = Organization.model_validate(org.model_dump())
        updated_org.name = "Updated Name"
        org_repo.update.return_value = updated_org

        request = UpdateOrganizationRequest(name="Updated Name")
        use_case = UpdateOrganizationUseCase(org_repo)
        result = await use_case.execute(
            org_id=org.id,
            tenant_id=org.tenant_id,
            request=request,
        )

        assert result.name == "Updated Name"
        org_repo.update.assert_awaited_once()

    async def test_update_raises_when_not_found(self) -> None:
        """Raises OrganizationNotFoundException when org missing."""
        org_repo = make_org_repo()
        org_repo.get_by_id.return_value = None

        request = UpdateOrganizationRequest(name="New Name")
        use_case = UpdateOrganizationUseCase(org_repo)

        with pytest.raises(OrganizationNotFoundException):
            await use_case.execute(
                org_id=uuid4(),
                tenant_id=uuid4(),
                request=request,
            )

        org_repo.update.assert_not_awaited()


# =============================================================================
# VerifyOrganizationUseCase
# =============================================================================


class TestVerifyOrganizationUseCase:
    async def test_verify_pending_org_succeeds(self) -> None:
        """Verifies a PENDING_VERIFICATION org and returns ACTIVE."""
        org = make_org(status=OrganizationStatus.PENDING_VERIFICATION)
        org_repo = make_org_repo()
        org_repo.get_by_id.return_value = org

        verifier_id = uuid4()
        verified_org = Organization.model_validate(org.model_dump())
        verified_org.verify(verifier_id)
        org_repo.update.return_value = verified_org

        use_case = VerifyOrganizationUseCase(org_repo)
        result = await use_case.execute(
            org_id=org.id,
            verifier_id=verifier_id,
            tenant_id=org.tenant_id,
        )

        assert result.status == OrganizationStatus.ACTIVE.value
        assert result.verified_at is not None
        org_repo.update.assert_awaited_once()

    async def test_verify_raises_when_not_found(self) -> None:
        """Raises OrganizationNotFoundException when org missing."""
        org_repo = make_org_repo()
        org_repo.get_by_id.return_value = None
        org_repo.get_by_tenant_id.return_value = None

        use_case = VerifyOrganizationUseCase(org_repo)

        with pytest.raises(OrganizationNotFoundException):
            await use_case.execute(org_id=uuid4(), verifier_id=uuid4(), tenant_id=uuid4())

    async def test_verify_already_active_raises(self) -> None:
        """Raises OrganizationVerificationException for already ACTIVE org."""
        org = make_org(status=OrganizationStatus.ACTIVE)
        org_repo = make_org_repo()
        org_repo.get_by_id.return_value = org

        use_case = VerifyOrganizationUseCase(org_repo)

        with pytest.raises(OrganizationVerificationException):
            await use_case.execute(
                org_id=org.id,
                verifier_id=uuid4(),
                tenant_id=org.tenant_id,
            )


# =============================================================================
# RejectOrganizationUseCase
# =============================================================================


class TestRejectOrganizationUseCase:
    async def test_reject_pending_org_succeeds(self) -> None:
        """Rejects a PENDING org and returns REJECTED status."""
        org = make_org(status=OrganizationStatus.PENDING_VERIFICATION)
        org_repo = make_org_repo()
        org_repo.get_by_id.return_value = org

        verifier_id = uuid4()
        rejected_org = Organization.model_validate(org.model_dump())
        rejected_org.reject(verifier_id)
        org_repo.update.return_value = rejected_org

        use_case = RejectOrganizationUseCase(org_repo)
        result = await use_case.execute(
            org_id=org.id,
            verifier_id=verifier_id,
            tenant_id=org.tenant_id,
        )

        assert result.status == OrganizationStatus.REJECTED.value
        org_repo.update.assert_awaited_once()

    async def test_reject_raises_when_not_found(self) -> None:
        """Raises OrganizationNotFoundException when org missing."""
        org_repo = make_org_repo()
        org_repo.get_by_id.return_value = None
        org_repo.get_by_tenant_id.return_value = None

        use_case = RejectOrganizationUseCase(org_repo)

        with pytest.raises(OrganizationNotFoundException):
            await use_case.execute(org_id=uuid4(), verifier_id=uuid4(), tenant_id=uuid4())


# =============================================================================
# SuspendOrganizationUseCase
# =============================================================================


class TestSuspendOrganizationUseCase:
    async def test_suspend_active_org_succeeds(self) -> None:
        """Suspends an ACTIVE org."""
        org = make_org(status=OrganizationStatus.ACTIVE)
        org_repo = make_org_repo()
        org_repo.get_by_id.return_value = org

        suspended_org = Organization.model_validate(org.model_dump())
        suspended_org.suspend()
        org_repo.update.return_value = suspended_org

        use_case = SuspendOrganizationUseCase(org_repo)
        result = await use_case.execute(org_id=org.id, tenant_id=org.tenant_id)

        assert result.status == OrganizationStatus.SUSPENDED.value
        org_repo.update.assert_awaited_once()

    async def test_suspend_raises_when_not_found(self) -> None:
        """Raises OrganizationNotFoundException when org missing."""
        org_repo = make_org_repo()
        org_repo.get_by_id.return_value = None

        use_case = SuspendOrganizationUseCase(org_repo)

        with pytest.raises(OrganizationNotFoundException):
            await use_case.execute(org_id=uuid4(), tenant_id=uuid4())

        org_repo.update.assert_not_awaited()
