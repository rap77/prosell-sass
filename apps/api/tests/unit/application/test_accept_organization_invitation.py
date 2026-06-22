"""Tests for AcceptOrganizationInvitationUseCase."""

from datetime import UTC, datetime, timedelta
from hashlib import sha256
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.organization.accept_organization_invitation import (
    AcceptOrganizationInvitationUseCase,
)
from prosell.domain.entities.organization import Organization
from prosell.domain.entities.organization_invitation import OrganizationInvitation
from prosell.domain.entities.role import Role, RoleType


def _raw_token_and_invitation(organization_id, tenant_id) -> tuple[str, OrganizationInvitation]:
    raw_token = "raw-token-value"
    invitation = OrganizationInvitation(
        id=uuid4(),
        organization_id=organization_id,
        email="owner@x.com",
        token=sha256(raw_token.encode()).hexdigest(),
        expires_at=datetime.now(UTC) + timedelta(days=7),
        tenant_id=tenant_id,
        created_by_user_id=uuid4(),
    )
    return raw_token, invitation


@pytest.fixture
def collaborators():
    return {
        "invitation_repository": AsyncMock(),
        "organization_repository": AsyncMock(),
        "user_repository": AsyncMock(),
        "role_repository": AsyncMock(),
        "password_service": MagicMock(),
        "issue_session_use_case": AsyncMock(),
    }


@pytest.fixture
def use_case(collaborators):
    return AcceptOrganizationInvitationUseCase(**collaborators)


@pytest.mark.asyncio
async def test_raises_for_unknown_token(use_case, collaborators):
    collaborators["invitation_repository"].get_by_token_unscoped.return_value = None
    with pytest.raises(ValueError, match="Invalid invitation token"):
        await use_case.execute(token="nope", password="Aa1!aaaa", first_name="A", last_name="B")


@pytest.mark.asyncio
async def test_raises_and_marks_expired_for_expired_invitation(use_case, collaborators):
    org_id, tenant_id = uuid4(), uuid4()
    raw_token, invitation = _raw_token_and_invitation(org_id, tenant_id)
    invitation.expires_at = datetime.now(UTC) - timedelta(days=1)
    collaborators["invitation_repository"].get_by_token_unscoped.return_value = invitation

    with pytest.raises(ValueError, match="expired"):
        await use_case.execute(token=raw_token, password="Aa1!aaaa", first_name="A", last_name="B")

    collaborators["invitation_repository"].update.assert_called_once()
    assert invitation.status.value == "expired"


@pytest.mark.asyncio
async def test_raises_for_already_accepted_invitation(use_case, collaborators):
    org_id, tenant_id = uuid4(), uuid4()
    raw_token, invitation = _raw_token_and_invitation(org_id, tenant_id)
    invitation.accept(uuid4())
    collaborators["invitation_repository"].get_by_token_unscoped.return_value = invitation

    with pytest.raises(ValueError, match="already accepted"):
        await use_case.execute(token=raw_token, password="Aa1!aaaa", first_name="A", last_name="B")


@pytest.mark.asyncio
async def test_happy_path_creates_admin_user_activates_org_and_issues_session(
    use_case, collaborators
):
    org_id, tenant_id = uuid4(), uuid4()
    raw_token, invitation = _raw_token_and_invitation(org_id, tenant_id)
    collaborators["invitation_repository"].get_by_token_unscoped.return_value = invitation
    collaborators["organization_repository"].get_by_id.return_value = Organization.create(
        name="Acme Motors", tenant_id=tenant_id
    )
    collaborators["password_service"].hash_password.return_value = "hashed"
    admin_role = Role(
        id=uuid4(), role_type=RoleType.ADMIN, name="Admin", is_system_role=True, tenant_id=None
    )
    collaborators["role_repository"].get_by_type.return_value = admin_role
    collaborators["user_repository"].create.side_effect = lambda u: u

    await use_case.execute(
        token=raw_token, password="Aa1!aaaa", first_name="Owner", last_name="Name"
    )

    created_user = collaborators["user_repository"].create.call_args.args[0]
    assert created_user.email == invitation.email
    assert created_user.tenant_id == tenant_id
    assert created_user.status.value == "active"

    collaborators["role_repository"].assign_role_to_user.assert_called_once_with(
        created_user.id, admin_role.id
    )
    collaborators["organization_repository"].update.assert_called_once()
    updated_org = collaborators["organization_repository"].update.call_args.args[0]
    assert updated_org.status.value == "active"

    collaborators["invitation_repository"].update.assert_called_once()
    assert invitation.status.value == "accepted"
    assert invitation.accepted_by_user_id == created_user.id

    collaborators["issue_session_use_case"].execute.assert_called_once()


@pytest.mark.asyncio
async def test_happy_path_records_last_login_on_the_new_user(use_case, collaborators):
    """Accepting an invitation is the owner's first 'login' — must stamp last_login_at.

    Without this, the owner's first session shows last_login_at=None until their
    NEXT normal login. LoginUserUseCase already does it; AcceptOrgInvitation has
    to do it too because IssueUserSessionUseCase (extracted in T6) does not.
    """
    org_id, tenant_id = uuid4(), uuid4()
    raw_token, invitation = _raw_token_and_invitation(org_id, tenant_id)
    collaborators["invitation_repository"].get_by_token_unscoped.return_value = invitation
    collaborators["organization_repository"].get_by_id.return_value = Organization.create(
        name="Acme Motors", tenant_id=tenant_id
    )
    collaborators["password_service"].hash_password.return_value = "hashed"
    admin_role = Role(
        id=uuid4(), role_type=RoleType.ADMIN, name="Admin", is_system_role=True, tenant_id=None
    )
    collaborators["role_repository"].get_by_type.return_value = admin_role
    collaborators["user_repository"].create.side_effect = lambda u: u

    await use_case.execute(
        token=raw_token,
        password="Aa1!aaaa",
        first_name="Owner",
        last_name="Name",
        ip_address="203.0.113.7",
        user_agent="pytest",
    )

    # user_repository.update is called at least once with a user whose
    # last_login_at is set. (There may be other update calls; the assertion is
    # that AT LEAST ONE passes through a user with last_login_at populated.)
    update_calls = collaborators["user_repository"].update.call_args_list
    assert update_calls, "expected user_repository.update to be called at least once"
    users_with_login = [c.args[0] for c in update_calls if c.args[0].last_login_at is not None]
    assert users_with_login, (
        "expected at least one user_repository.update call with last_login_at set; "
        f"got calls for users with last_login_at={[c.args[0].last_login_at for c in update_calls]}"
    )
    assert users_with_login[0].last_login_ip == "203.0.113.7"
