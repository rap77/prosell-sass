"""Integration tests for auth_router.py -- Task 13: POST /auth/accept-org-invitation."""

from collections.abc import AsyncGenerator
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.organization import Organization
from prosell.domain.entities.organization_invitation import OrganizationInvitation
from prosell.domain.entities.user import User
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.organization_invitation_repository_impl import (
    SqlAlchemyOrganizationInvitationRepository,
)
from prosell.infrastructure.repositories.organization_repository_impl import (
    SqlAlchemyOrganizationRepository,
)
from prosell.infrastructure.repositories.user_repository_impl import SqlAlchemyUserRepository


@pytest_asyncio.fixture
async def unauthenticated_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient]:
    """AsyncClient with the real DB wired in but no auth override -- this
    endpoint creates the caller's account, so there is no caller to mock yet.
    """

    async def override_get_async_session() -> AsyncGenerator:
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_async_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def pending_dealer_invitation(
    db_session: AsyncSession,
) -> tuple[str, OrganizationInvitation]:
    """A real PENDING_VERIFICATION Organization + a real pending invitation for it.

    Organization.create() defaults to PENDING_VERIFICATION (not the generic
    `test_organization` fixture, which is seeded as already "active") --
    accept_org_invitation calls organization.verify(), which raises unless
    the org starts PENDING_VERIFICATION.
    """
    staff_id = uuid4()
    tenant_id = uuid4()
    organization = Organization.create(name="Acme Motors", tenant_id=tenant_id, creator_id=staff_id)
    org_repo = SqlAlchemyOrganizationRepository(db_session)
    organization = await org_repo.create(organization)

    invitation, raw_token = OrganizationInvitation.build_pending(
        organization_id=organization.id,
        email="owner@example.com",
        tenant_id=organization.tenant_id,
        created_by_user_id=staff_id,
    )
    invitation_repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    created = await invitation_repo.create(invitation)
    await db_session.flush()
    return raw_token, created


@pytest.mark.asyncio
async def test_accept_org_invitation_rejects_invalid_token(
    unauthenticated_client: AsyncClient,
) -> None:
    response = await unauthenticated_client.post(
        "/api/v1/auth/accept-org-invitation",
        json={
            "token": "bogus",
            "password": "Aa1!aaaa",
            "first_name": "Owner",
            "last_name": "Name",
        },
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_accept_org_invitation_happy_path_sets_cookies(
    unauthenticated_client: AsyncClient,
    pending_dealer_invitation: tuple[str, OrganizationInvitation],
) -> None:
    raw_token, invitation = pending_dealer_invitation
    response = await unauthenticated_client.post(
        "/api/v1/auth/accept-org-invitation",
        json={
            "token": raw_token,
            "password": "Aa1!aaaa",
            "first_name": "Owner",
            "last_name": "Name",
        },
    )
    assert response.status_code == 200
    # response.cookies (httpx's parsed jar) drops these: Set-Cookie's
    # Domain=localhost doesn't match the ASGITransport's "test" host, so
    # httpx's RFC-6265 domain match silently discards them. The raw
    # Set-Cookie headers are unaffected by that and are what actually
    # matters here.
    set_cookie_headers = response.headers.get_list("set-cookie")
    assert any(h.startswith("access_token=") for h in set_cookie_headers)
    assert any(h.startswith("refresh_token=") for h in set_cookie_headers)
    body = response.json()
    assert body["user"]["email"] == invitation.email


@pytest.mark.asyncio
async def test_accept_org_invitation_rejects_weak_password(
    unauthenticated_client: AsyncClient,
    pending_dealer_invitation: tuple[str, OrganizationInvitation],
) -> None:
    """Gap G3: the backend must reject a weak password itself, not trust the
    frontend Zod schema -- a direct POST bypasses the frontend entirely."""
    raw_token, _invitation = pending_dealer_invitation
    response = await unauthenticated_client.post(
        "/api/v1/auth/accept-org-invitation",
        json={
            "token": raw_token,
            "password": "weak",
            "first_name": "Owner",
            "last_name": "Name",
        },
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_accept_org_invitation_conflicts_on_email_race(
    unauthenticated_client: AsyncClient,
    pending_dealer_invitation: tuple[str, OrganizationInvitation],
    db_session: AsyncSession,
) -> None:
    """Gap G6: if a User with the invitation's email is created between
    invite-time and accept-time (race), the unique constraint on users.email
    fires an IntegrityError on user_repository.create(). This must surface as
    409, not an unhandled 500 -- exercised here via the existing global
    integrity_error_handler, not new endpoint-level code.
    """
    raw_token, invitation = pending_dealer_invitation
    existing_user = User.create(
        email=invitation.email,
        password_hash="irrelevant-hash",
        full_name="Race Winner",
        tenant_id=uuid4(),
    )
    user_repo = SqlAlchemyUserRepository(db_session)
    await user_repo.create(existing_user)
    await db_session.flush()

    response = await unauthenticated_client.post(
        "/api/v1/auth/accept-org-invitation",
        json={
            "token": raw_token,
            "password": "Aa1!aaaa",
            "first_name": "Owner",
            "last_name": "Name",
        },
    )
    assert response.status_code == 409
