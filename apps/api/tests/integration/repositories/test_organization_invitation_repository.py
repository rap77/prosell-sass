"""Integration tests for SqlAlchemyOrganizationInvitationRepository."""

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.organization_invitation import OrganizationInvitation
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.organization_invitation_repository_impl import (
    SqlAlchemyOrganizationInvitationRepository,
)


@pytest.mark.asyncio
async def test_create_and_get_by_id(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    tenant_id, staff_id = test_organization.tenant_id, uuid4()
    invitation = OrganizationInvitation.create(
        organization_id=test_organization.id,
        email="owner@x.com",
        tenant_id=tenant_id,
        created_by_user_id=staff_id,
    )

    created = await repo.create(invitation)
    fetched = await repo.get_by_id(created.id, tenant_id)

    assert fetched is not None
    assert fetched.email == "owner@x.com"
    assert fetched.organization_id == test_organization.id


@pytest.mark.asyncio
async def test_get_by_token(db_session: AsyncSession, test_organization: OrganizationModel) -> None:
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    tenant_id = test_organization.tenant_id
    invitation = OrganizationInvitation.create(
        organization_id=test_organization.id,
        email="owner@x.com",
        tenant_id=tenant_id,
        created_by_user_id=uuid4(),
    )
    created = await repo.create(invitation)

    fetched = await repo.get_by_token(created.token, tenant_id)

    assert fetched is not None
    assert fetched.id == created.id


@pytest.mark.asyncio
async def test_get_by_token_unscoped_finds_invitation_regardless_of_tenant(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    invitation = OrganizationInvitation.create(
        organization_id=test_organization.id,
        email="owner@x.com",
        tenant_id=test_organization.tenant_id,
        created_by_user_id=uuid4(),
    )
    created = await repo.create(invitation)

    fetched = await repo.get_by_token_unscoped(created.token)

    assert fetched is not None
    assert fetched.id == created.id


@pytest.mark.asyncio
async def test_get_pending_by_org_and_email_returns_none_when_absent(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    result = await repo.get_pending_by_org_and_email(
        test_organization.id, "nobody@x.com", test_organization.tenant_id
    )
    assert result is None


@pytest.mark.asyncio
async def test_update_persists_status_change(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    tenant_id, staff_id = test_organization.tenant_id, uuid4()
    invitation = OrganizationInvitation.create(
        organization_id=test_organization.id,
        email="owner@x.com",
        tenant_id=tenant_id,
        created_by_user_id=staff_id,
    )
    created = await repo.create(invitation)

    created.accept(staff_id)
    await repo.update(created)

    fetched = await repo.get_by_id(created.id, tenant_id)
    assert fetched is not None
    assert fetched.status.value == "accepted"
    assert fetched.accepted_by_user_id == staff_id


@pytest.mark.asyncio
async def test_update_persists_token_and_expiry_after_regenerate(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    """Bug found while implementing T12: update() only wrote status/accepted_by_user_id.

    InviteOrganizationOwnerUseCase's reuse branch calls `regenerate_token()` (which
    mutates `token` and `expires_at` in memory) then `repository.update()`,
    expecting the new hash to be persisted. Without this, a resent invitation
    emails a raw token whose hash never matches what's stored -- the
    accept-invitation flow would 404 on a freshly "resent" link.
    """
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    tenant_id = test_organization.tenant_id
    invitation, _old_raw = OrganizationInvitation.build_pending(
        organization_id=test_organization.id,
        email="owner@x.com",
        tenant_id=tenant_id,
        created_by_user_id=uuid4(),
    )
    created = await repo.create(invitation)
    old_token = created.token
    old_expires_at = created.expires_at

    created.regenerate_token()
    await repo.update(created)

    fetched = await repo.get_by_id(created.id, tenant_id)
    assert fetched is not None
    assert fetched.token != old_token
    assert fetched.token == created.token
    assert fetched.expires_at > old_expires_at

    by_new_token = await repo.get_by_token_unscoped(created.token)
    assert by_new_token is not None
    assert by_new_token.id == created.id


@pytest.mark.asyncio
async def test_get_latest_by_organization_returns_most_recent(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    org_id, tenant_id = test_organization.id, test_organization.tenant_id
    older = OrganizationInvitation.create(
        organization_id=org_id, email="typo@x.com", tenant_id=tenant_id, created_by_user_id=uuid4()
    )
    await repo.create(older)
    newer = OrganizationInvitation.create(
        organization_id=org_id,
        email="correct@x.com",
        tenant_id=tenant_id,
        created_by_user_id=uuid4(),
    )
    await repo.create(newer)

    latest = await repo.get_latest_by_organization(org_id, tenant_id)

    assert latest is not None
    assert latest.email == "correct@x.com"


@pytest.mark.asyncio
async def test_get_latest_by_organization_returns_none_when_absent(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    result = await repo.get_latest_by_organization(
        test_organization.id, test_organization.tenant_id
    )
    assert result is None
