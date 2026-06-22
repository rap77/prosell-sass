"""Integration tests for SqlAlchemyOrganizationInvitationRepository."""

from uuid import uuid4

import pytest

from prosell.domain.entities.organization_invitation import OrganizationInvitation
from prosell.infrastructure.repositories.organization_invitation_repository_impl import (
    SqlAlchemyOrganizationInvitationRepository,
)


@pytest.mark.asyncio
async def test_create_and_get_by_id(db_session, test_organization):
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
async def test_get_by_token(db_session, test_organization):
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
    db_session, test_organization
):
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
async def test_get_pending_by_org_and_email_returns_none_when_absent(db_session, test_organization):
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    result = await repo.get_pending_by_org_and_email(
        test_organization.id, "nobody@x.com", test_organization.tenant_id
    )
    assert result is None


@pytest.mark.asyncio
async def test_update_persists_status_change(db_session, test_organization):
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
