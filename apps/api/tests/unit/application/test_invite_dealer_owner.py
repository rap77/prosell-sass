"""Tests for InviteDealerOwnerUseCase."""

from hashlib import sha256
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.organization.invite_dealer_owner import (
    InviteDealerOwnerUseCase,
)
from prosell.domain.entities.organization_invitation import OrganizationInvitation


@pytest.fixture
def use_case():
    invitation_repository = AsyncMock()
    email_service = AsyncMock()
    uc = InviteDealerOwnerUseCase(invitation_repository, email_service)
    return uc, invitation_repository, email_service


@pytest.mark.asyncio
async def test_creates_new_invitation_and_sends_email_when_none_pending(use_case):
    uc, invitation_repository, email_service = use_case
    invitation_repository.get_pending_by_org_and_email.return_value = None
    org_id, tenant_id, staff_id = uuid4(), uuid4(), uuid4()
    invitation_repository.create.side_effect = lambda inv: inv

    result = await uc.execute(
        organization_id=org_id,
        organization_name="Acme Motors",
        email="owner@x.com",
        tenant_id=tenant_id,
        inviter_name="Staff",
        created_by_user_id=staff_id,
    )

    assert result.organization_id == org_id
    invitation_repository.create.assert_called_once()
    email_service.send_org_invitation.assert_called_once()


@pytest.mark.asyncio
async def test_reuses_existing_unexpired_pending_invitation_with_a_fresh_token(use_case):
    uc, invitation_repository, email_service = use_case
    org_id, tenant_id, staff_id = uuid4(), uuid4(), uuid4()
    existing = OrganizationInvitation.create(
        organization_id=org_id,
        email="owner@x.com",
        tenant_id=tenant_id,
        created_by_user_id=staff_id,
    )
    stale_token_hash = existing.token
    invitation_repository.get_pending_by_org_and_email.return_value = existing

    result = await uc.execute(
        organization_id=org_id,
        organization_name="Acme Motors",
        email="owner@x.com",
        tenant_id=tenant_id,
        inviter_name="Staff",
        created_by_user_id=staff_id,
    )

    assert result.id == existing.id
    # Same row reused, but with a freshly-issued token — the original raw
    # token was never persisted anywhere, so resending must always reissue.
    assert existing.token != stale_token_hash
    invitation_repository.create.assert_not_called()
    invitation_repository.update.assert_called_once()
    email_service.send_org_invitation.assert_called_once()
    sent_token = email_service.send_org_invitation.call_args.kwargs["invitation_token"]
    assert sha256(sent_token.encode()).hexdigest() == existing.token


@pytest.mark.asyncio
async def test_expires_stale_pending_invitation_and_creates_new_one(use_case):
    uc, invitation_repository, _email_service = use_case
    org_id, tenant_id, staff_id = uuid4(), uuid4(), uuid4()
    stale = OrganizationInvitation.create(
        organization_id=org_id,
        email="owner@x.com",
        tenant_id=tenant_id,
        created_by_user_id=staff_id,
        expires_in_days=-1,
    )
    invitation_repository.get_pending_by_org_and_email.return_value = stale
    invitation_repository.create.side_effect = lambda inv: inv

    result = await uc.execute(
        organization_id=org_id,
        organization_name="Acme Motors",
        email="owner@x.com",
        tenant_id=tenant_id,
        inviter_name="Staff",
        created_by_user_id=staff_id,
    )

    invitation_repository.update.assert_called_once()
    assert stale.status.value == "expired"
    assert result.id != stale.id
    invitation_repository.create.assert_called_once()
