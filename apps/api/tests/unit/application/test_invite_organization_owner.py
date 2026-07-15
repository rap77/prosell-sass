"""Tests for InviteOrganizationOwnerUseCase."""

from datetime import UTC, datetime, timedelta
from hashlib import sha256
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.organization.invite_organization_owner import (
    InviteOrganizationOwnerUseCase,
)
from prosell.domain.entities.organization_invitation import OrganizationInvitation


@pytest.fixture
def use_case():
    invitation_repository = AsyncMock()
    email_service = AsyncMock()
    uc = InviteOrganizationOwnerUseCase(invitation_repository, email_service)
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
async def test_reused_pending_invitation_gets_a_fresh_expiry_window(use_case):
    """Resend must reset expires_at so the new owner gets a full 7-day window.

    Without this, a 'resend' on day 6 of an invitation still produces a link
    that expires in 1 day — the new email's link should be just as valid as
    a first-time invitation.
    """
    uc, invitation_repository, _email_service = use_case
    org_id, tenant_id, staff_id = uuid4(), uuid4(), uuid4()
    existing = OrganizationInvitation.create(
        organization_id=org_id,
        email="owner@x.com",
        tenant_id=tenant_id,
        created_by_user_id=staff_id,
    )
    # Force the existing invitation to expire in 6 days (simulating "almost
    # expired — admin hits resend").
    near_expiry = datetime.now(UTC) + timedelta(days=6)
    existing.expires_at = near_expiry
    invitation_repository.get_pending_by_org_and_email.return_value = existing

    before_resend = datetime.now(UTC)

    await uc.execute(
        organization_id=org_id,
        organization_name="Acme Motors",
        email="owner@x.com",
        tenant_id=tenant_id,
        inviter_name="Staff",
        created_by_user_id=staff_id,
    )

    # The entity passed to update() must have a fresh 7-day window.
    updated_invitation = invitation_repository.update.call_args.args[0]
    delta = updated_invitation.expires_at - before_resend
    # Allow ~1s slack: `before_resend` is captured right before execute(), but
    # the actual datetime.now(UTC) inside the use case runs slightly later.
    assert timedelta(days=6, hours=23, minutes=59) < delta < timedelta(days=7, seconds=1), (
        f"resend should reset expires_at to ~7 days from now; got delta={delta}"
    )
    # Sanity: the original near-expiry was NOT preserved.
    assert updated_invitation.expires_at > near_expiry


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
