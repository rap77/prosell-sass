"""Tests for CreateDealerOrganizationUseCase."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.organization.create_dealer_organization import (
    CreateDealerOrganizationUseCase,
)
from prosell.domain.entities.organization_invitation import OrganizationInvitation

UseCaseFixture = tuple[
    CreateDealerOrganizationUseCase, AsyncMock, AsyncMock, AsyncMock, AsyncMock, AsyncMock
]


@pytest.fixture
def use_case() -> UseCaseFixture:
    org_repository = AsyncMock()
    vertical_repository = AsyncMock()
    user_repository = AsyncMock()
    category_repository = AsyncMock()
    # Default: every vertical_id resolves to a real category. Tests that
    # need an unknown id override get_by_id_any_tenant.return_value.
    category_repository.get_by_id_any_tenant.return_value = object()
    invite_use_case = AsyncMock()
    uc = CreateDealerOrganizationUseCase(
        org_repository, vertical_repository, user_repository, category_repository, invite_use_case
    )
    return (
        uc,
        org_repository,
        vertical_repository,
        user_repository,
        category_repository,
        invite_use_case,
    )


@pytest.mark.asyncio
async def test_raises_when_no_verticals_given(use_case: UseCaseFixture) -> None:
    uc, *_ = use_case
    with pytest.raises(ValueError, match="vertical"):
        await uc.execute(
            name="Acme Motors",
            vertical_ids=[],
            owner_email="owner@x.com",
            inviter_name="Staff",
            created_by_user_id=uuid4(),
        )


@pytest.mark.asyncio
async def test_raises_when_owner_email_already_registered(use_case: UseCaseFixture) -> None:
    uc, *_, user_repository, _category_repository, _invite_use_case = use_case
    existing_user = AsyncMock(deleted_at=None)
    user_repository.get_by_email.return_value = existing_user

    with pytest.raises(ValueError, match="already registered"):
        await uc.execute(
            name="Acme Motors",
            vertical_ids=[uuid4()],
            owner_email="owner@x.com",
            inviter_name="Staff",
            created_by_user_id=uuid4(),
        )


@pytest.mark.asyncio
async def test_raises_when_a_vertical_id_does_not_resolve_to_a_real_category(
    use_case: UseCaseFixture,
) -> None:
    """Gap G4: a vertical_id that doesn't reference a real root category must
    400, not silently enable() a dangling M2M row (enable() has no FK to
    validate against -- it would otherwise succeed and corrupt state)."""
    (
        uc,
        _org_repository,
        _vertical_repository,
        user_repository,
        category_repository,
        _invite_use_case,
    ) = use_case
    user_repository.get_by_email.return_value = None
    unknown_id = uuid4()
    category_repository.get_by_id_any_tenant.return_value = None

    with pytest.raises(ValueError, match=str(unknown_id)):
        await uc.execute(
            name="Acme Motors",
            vertical_ids=[unknown_id],
            owner_email="owner@x.com",
            inviter_name="Staff",
            created_by_user_id=uuid4(),
        )


@pytest.mark.asyncio
async def test_allows_email_that_belongs_only_to_a_soft_deleted_user(
    use_case: UseCaseFixture,
) -> None:
    (
        uc,
        org_repository,
        _vertical_repository,
        user_repository,
        _category_repository,
        invite_use_case,
    ) = use_case
    deleted_user = AsyncMock(deleted_at="2026-01-01T00:00:00Z")
    user_repository.get_by_email.return_value = deleted_user
    org_repository.create.side_effect = lambda org: org
    invite_use_case.execute.return_value = OrganizationInvitation.create(
        organization_id=uuid4(), email="owner@x.com", tenant_id=uuid4(), created_by_user_id=uuid4()
    )

    await uc.execute(
        name="Acme Motors",
        vertical_ids=[uuid4()],
        owner_email="owner@x.com",
        inviter_name="Staff",
        created_by_user_id=uuid4(),
    )

    org_repository.create.assert_called_once()


@pytest.mark.asyncio
async def test_happy_path_creates_org_enables_verticals_and_invites_owner(
    use_case: UseCaseFixture,
) -> None:
    (
        uc,
        org_repository,
        vertical_repository,
        user_repository,
        _category_repository,
        invite_use_case,
    ) = use_case
    user_repository.get_by_email.return_value = None
    org_repository.create.side_effect = lambda org: org
    staff_id = uuid4()
    vertical_ids = [uuid4(), uuid4()]
    invite_use_case.execute.return_value = OrganizationInvitation.create(
        organization_id=uuid4(), email="owner@x.com", tenant_id=uuid4(), created_by_user_id=staff_id
    )

    result = await uc.execute(
        name="Acme Motors",
        vertical_ids=vertical_ids,
        owner_email="Owner@X.com",
        inviter_name="Staff",
        created_by_user_id=staff_id,
    )

    org_repository.create.assert_called_once()
    created_org = org_repository.create.call_args.args[0]
    assert created_org.name == "Acme Motors"
    assert created_org.created_by_user_id == staff_id

    assert vertical_repository.enable.call_count == 2
    enabled_root_ids = {
        call.kwargs["root_category_id"] for call in vertical_repository.enable.call_args_list
    }
    assert enabled_root_ids == set(vertical_ids)

    invite_use_case.execute.assert_called_once()
    invite_call_kwargs = invite_use_case.execute.call_args.kwargs
    assert invite_call_kwargs["email"] == "owner@x.com"  # lowercased before passing through
    assert result is invite_use_case.execute.return_value
