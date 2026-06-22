"""Tests for OrganizationInvitation domain entity."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from prosell.domain.entities.organization_invitation import (
    OrganizationInvitation,
    OrganizationInvitationStatus,
)


def test_create_generates_pending_invitation_with_hashed_token():
    org_id = uuid4()
    tenant_id = uuid4()
    staff_id = uuid4()

    invitation = OrganizationInvitation.create(
        organization_id=org_id,
        email="Owner@Example.com",
        tenant_id=tenant_id,
        created_by_user_id=staff_id,
    )

    assert invitation.organization_id == org_id
    assert invitation.email == "owner@example.com"  # normalized lowercase
    assert invitation.tenant_id == tenant_id
    assert invitation.created_by_user_id == staff_id
    assert invitation.accepted_by_user_id is None
    assert invitation.status == OrganizationInvitationStatus.PENDING
    assert len(invitation.token) == 64  # SHA256 hex digest
    assert not invitation.is_expired()


def test_create_defaults_to_7_day_expiry():
    invitation = OrganizationInvitation.create(
        organization_id=uuid4(), email="a@b.com", tenant_id=uuid4(), created_by_user_id=uuid4()
    )
    delta = invitation.expires_at - datetime.now(UTC)
    assert timedelta(days=6, hours=23) < delta <= timedelta(days=7)


def test_is_expired_true_after_expiry():
    invitation = OrganizationInvitation.create(
        organization_id=uuid4(),
        email="a@b.com",
        tenant_id=uuid4(),
        created_by_user_id=uuid4(),
        expires_in_days=-1,
    )
    assert invitation.is_expired()


def test_accept_sets_accepted_status_and_acceptor():
    invitation = OrganizationInvitation.create(
        organization_id=uuid4(), email="a@b.com", tenant_id=uuid4(), created_by_user_id=uuid4()
    )
    acceptor_id = uuid4()

    invitation.accept(acceptor_id)

    assert invitation.status == OrganizationInvitationStatus.ACCEPTED
    assert invitation.accepted_by_user_id == acceptor_id


def test_accept_raises_if_expired():
    invitation = OrganizationInvitation.create(
        organization_id=uuid4(),
        email="a@b.com",
        tenant_id=uuid4(),
        created_by_user_id=uuid4(),
        expires_in_days=-1,
    )
    with pytest.raises(ValueError, match="expired"):
        invitation.accept(uuid4())


def test_accept_raises_if_already_accepted():
    invitation = OrganizationInvitation.create(
        organization_id=uuid4(), email="a@b.com", tenant_id=uuid4(), created_by_user_id=uuid4()
    )
    invitation.accept(uuid4())
    with pytest.raises(ValueError, match="already accepted"):
        invitation.accept(uuid4())


def test_cancel_sets_cancelled_status():
    invitation = OrganizationInvitation.create(
        organization_id=uuid4(), email="a@b.com", tenant_id=uuid4(), created_by_user_id=uuid4()
    )
    invitation.cancel()
    assert invitation.status == OrganizationInvitationStatus.CANCELLED


def test_cancel_raises_if_already_accepted():
    invitation = OrganizationInvitation.create(
        organization_id=uuid4(), email="a@b.com", tenant_id=uuid4(), created_by_user_id=uuid4()
    )
    invitation.accept(uuid4())
    with pytest.raises(ValueError, match="Cannot cancel accepted"):
        invitation.cancel()


def test_mark_expired_sets_expired_status():
    invitation = OrganizationInvitation.create(
        organization_id=uuid4(), email="a@b.com", tenant_id=uuid4(), created_by_user_id=uuid4()
    )
    invitation.mark_expired()
    assert invitation.status == OrganizationInvitationStatus.EXPIRED
