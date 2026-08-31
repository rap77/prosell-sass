"""Integration tests for approved Facebook credential migration."""

import hashlib
import importlib
import json
from collections.abc import AsyncGenerator
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.core.config import settings as global_settings
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.fb_account_model import FBAccountModel
from prosell.infrastructure.models.fb_credential_migration_model import (
    FBCredentialMigrationAuthorizationModel,
    FBCredentialMigrationTokenModel,
)
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.user_model import UserModel
from prosell.infrastructure.services.fb_encryption_service import FBEncryptionService

BOT_TOKEN = "credential-migration-bot-token"


@pytest.fixture
async def migration_context(
    test_db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> AsyncGenerator[tuple[AsyncClient, AsyncSession, UUID, UUID, User]]:
    """Provide separate admin and service tenants plus a protected client."""
    admin_tenant_id = uuid4()
    service_organization_id = uuid4()
    user_id = uuid4()
    test_db_session.add(
        OrganizationModel(
            id=admin_tenant_id,
            tenant_id=admin_tenant_id,
            name="Admin Tenant",
            status="active",
            settings={},
        )
    )
    test_db_session.add(
        OrganizationModel(
            id=service_organization_id,
            tenant_id=service_organization_id,
            name="ProSell Service Organization",
            status="active",
            settings={},
        )
    )
    test_db_session.add(
        UserModel(
            id=user_id,
            email="migration-admin@example.com",
            full_name="Migration Admin",
            status="active",
            email_verified=True,
            tenant_id=admin_tenant_id,
        )
    )
    await test_db_session.flush()

    admin = User(
        id=user_id,
        email="migration-admin@example.com",
        full_name="Migration Admin",
        tenant_id=admin_tenant_id,
    )
    admin.roles = [Role(id=uuid4(), role_type=RoleType.SUPER_ADMIN, name="Super Admin")]

    async def override_session() -> AsyncGenerator[AsyncSession]:
        yield test_db_session

    app.dependency_overrides[get_async_session] = override_session
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: admin
    monkeypatch.setattr(
        "prosell.infrastructure.api.dependencies.settings.fb_bot_api_key",
        BOT_TOKEN,
    )
    # `routers/__init__.py` does `from .fb_credential_migration_router import
    # router as fb_credential_migration_router`, which shadows the module name
    # on the `routers` package with the APIRouter instance. Both a dotted
    # monkeypatch string and a plain `import a.b.c as x` resolve that shadowed
    # package attribute instead of the real module (Python's `import a.b.c`
    # walks attribute access on each parent package, it does not read
    # sys.modules directly), so fetch the actual module via importlib and
    # patch the real objects directly.
    fb_credential_migration_router_module = importlib.import_module(
        "prosell.infrastructure.api.routers.fb_credential_migration_router"
    )
    monkeypatch.setattr(global_settings, "service_organization_id", service_organization_id)
    encryption = FBEncryptionService("test-migration-encryption-key")
    monkeypatch.setattr(
        fb_credential_migration_router_module, "get_fb_encryption_service", lambda: encryption
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client, test_db_session, admin_tenant_id, service_organization_id, admin

    app.dependency_overrides.clear()


def _batch_fingerprint(accounts: list[dict[str, str]]) -> str:
    identities = [
        {
            "email": account["email"].lower(),
            "alias": account.get("alias", "").strip().casefold(),
            "groups": account.get("groups"),
        }
        for account in accounts
    ]
    identities.sort(
        key=lambda identity: json.dumps(identity, separators=(",", ":"), sort_keys=True)
    )
    return hashlib.sha256(
        json.dumps(identities, separators=(",", ":"), sort_keys=True).encode("utf-8")
    ).hexdigest()


async def _create_migration_token(client: AsyncClient, accounts: list[dict[str, str]]) -> str:
    response = await client.post(
        "/api/v1/fb-sync/migrations/tokens",
        json={"account_count": len(accounts), "batch_fingerprint": _batch_fingerprint(accounts)},
    )
    assert response.status_code == 201, response.text
    return response.json()["token"]


def _migration_payload(token: str, accounts: list[dict[str, str]]) -> dict[str, object]:
    return {
        "migration_token": token,
        "batch_fingerprint": _batch_fingerprint(accounts),
        "accounts": accounts,
    }


async def _create_migration_authorization(client: AsyncClient) -> dict[str, str | int]:
    response = await client.post(
        "/api/v1/fb-sync/migrations/authorization-requests",
        json={"account_count": 2, "batch_fingerprint": "a" * 64},
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
async def test_bot_authorization_is_approved_and_delivers_its_token_once(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, UUID, User],
) -> None:
    """Approval records the bot batch audit and exposes its token only to one poll."""
    client, db, _admin_tenant_id, service_organization_id, admin = migration_context
    created = await _create_migration_authorization(client)

    assert created["status"] == "pending"
    assert created["account_count"] == 2
    assert created["batch_fingerprint"] == "a" * 64
    assert isinstance(created["authorization_id"], str)
    assert isinstance(created["pairing_code"], str)
    assert len(created["pairing_code"]) == 9

    authorization_id = UUID(str(created["authorization_id"]))
    pending_poll = await client.get(
        f"/api/v1/fb-sync/migrations/authorization-requests/{authorization_id}",
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    assert pending_poll.status_code == 200, pending_poll.text
    assert pending_poll.json()["status"] == "pending"
    assert pending_poll.json()["migration_token"] is None

    approval = await client.post(
        "/api/v1/fb-sync/migrations/authorization-requests/approve",
        json={"pairing_code": created["pairing_code"]},
    )
    assert approval.status_code == 200, approval.text
    assert approval.json()["status"] == "approved"

    authorization = await db.get(FBCredentialMigrationAuthorizationModel, authorization_id)
    assert authorization is not None
    assert authorization.account_count == 2
    assert authorization.batch_fingerprint == "a" * 64
    assert authorization.approved_by_user_id == admin.id
    assert authorization.approved_at is not None
    assert authorization.migration_token_id is not None
    assert authorization.migration_token_encrypted is not None
    migration_token = await db.get(
        FBCredentialMigrationTokenModel, authorization.migration_token_id
    )
    assert migration_token is not None
    assert migration_token.tenant_id == service_organization_id
    assert migration_token.created_by_user_id == admin.id
    assert migration_token.account_count == authorization.account_count
    assert migration_token.batch_fingerprint == authorization.batch_fingerprint

    approved_poll = await client.get(
        f"/api/v1/fb-sync/migrations/authorization-requests/{authorization_id}",
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    assert approved_poll.status_code == 200, approved_poll.text
    delivered_token = approved_poll.json()["migration_token"]
    assert isinstance(delivered_token, str)
    assert len(delivered_token) >= 32
    assert migration_token.token_hash != delivered_token

    repeat_poll = await client.get(
        f"/api/v1/fb-sync/migrations/authorization-requests/{authorization_id}",
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    assert repeat_poll.status_code == 200, repeat_poll.text
    assert repeat_poll.json()["status"] == "approved"
    assert repeat_poll.json()["migration_token"] is None
    assert authorization.migration_token_encrypted is None
    assert authorization.token_delivered_at is not None


@pytest.mark.asyncio
async def test_expired_authorization_cannot_be_approved_and_bot_sees_expired(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, UUID, User],
) -> None:
    """Expired requests do not mint migration tokens."""
    from datetime import UTC, datetime, timedelta

    client, db, _admin_tenant_id, _service_organization_id, _admin = migration_context
    created = await _create_migration_authorization(client)
    authorization_id = UUID(str(created["authorization_id"]))
    authorization = await db.get(FBCredentialMigrationAuthorizationModel, authorization_id)
    assert authorization is not None
    authorization.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await db.commit()

    poll = await client.get(
        f"/api/v1/fb-sync/migrations/authorization-requests/{authorization_id}",
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    assert poll.status_code == 200, poll.text
    assert poll.json()["status"] == "expired"
    assert poll.json()["migration_token"] is None

    approval = await client.post(
        "/api/v1/fb-sync/migrations/authorization-requests/approve",
        json={"pairing_code": created["pairing_code"]},
    )
    assert approval.status_code == 410
    assert await db.scalar(select(FBCredentialMigrationTokenModel)) is None


@pytest.mark.asyncio
async def test_expired_approved_authorization_never_delivers_or_consumes_its_token(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, UUID, User],
) -> None:
    """A stale approved pairing reports expired without exposing its one-time token."""
    from datetime import UTC, datetime, timedelta

    client, db, _admin_tenant_id, _service_organization_id, _admin = migration_context
    created = await _create_migration_authorization(client)
    authorization_id = UUID(str(created["authorization_id"]))
    approved = await client.post(
        "/api/v1/fb-sync/migrations/authorization-requests/approve",
        json={"pairing_code": created["pairing_code"]},
    )
    assert approved.status_code == 200
    authorization = await db.get(FBCredentialMigrationAuthorizationModel, authorization_id)
    assert authorization is not None
    authorization.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    encrypted_token = authorization.migration_token_encrypted
    await db.commit()

    poll = await client.get(
        f"/api/v1/fb-sync/migrations/authorization-requests/{authorization_id}",
        headers={"X-Bot-Token": BOT_TOKEN},
    )

    assert poll.status_code == 200
    assert poll.json()["status"] == "expired"
    assert poll.json()["migration_token"] is None
    assert authorization.migration_token_encrypted == encrypted_token
    assert authorization.token_delivered_at is None


@pytest.mark.asyncio
async def test_authorization_cannot_be_approved_twice(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, UUID, User],
) -> None:
    """A pairing code approves its pending authorization exactly once."""
    client, db, _admin_tenant_id, _service_organization_id, _admin = migration_context
    created = await _create_migration_authorization(client)

    first_approval = await client.post(
        "/api/v1/fb-sync/migrations/authorization-requests/approve",
        json={"pairing_code": created["pairing_code"]},
    )
    assert first_approval.status_code == 200, first_approval.text

    repeated_approval = await client.post(
        "/api/v1/fb-sync/migrations/authorization-requests/approve",
        json={"pairing_code": created["pairing_code"]},
    )
    assert repeated_approval.status_code == 409
    assert await db.scalar(select(FBCredentialMigrationTokenModel)) is not None


@pytest.mark.asyncio
async def test_authorization_approval_requires_platform_super_admin(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, UUID, User],
) -> None:
    """A tenant admin cannot approve a central migration pairing code."""
    client, _db, _admin_tenant_id, _service_organization_id, admin = migration_context
    created = await _create_migration_authorization(client)
    admin.roles = [Role(id=uuid4(), role_type=RoleType.ADMIN, name="Admin")]

    response = await client.post(
        "/api/v1/fb-sync/migrations/authorization-requests/approve",
        json={"pairing_code": created["pairing_code"]},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_import_uses_token_tenant_encrypts_password_and_is_idempotent(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, UUID, User],
) -> None:
    """Token binds imported credentials to the configured service organization."""
    client, db, admin_tenant_id, service_organization_id, admin = migration_context
    accounts = [
        {"email": "migrated@example.com", "password": "secret-password"},
        {"email": "second@example.com", "password": "another-password"},
    ]
    token = await _create_migration_token(client, accounts)
    payload = _migration_payload(token, accounts)

    rejected_claim_response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json={**payload, "tenant_id": str(admin_tenant_id)},
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    assert rejected_claim_response.status_code == 422

    response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json=payload,
        headers={"X-Bot-Token": BOT_TOKEN},
    )

    assert response.status_code == 200, response.text
    imported_accounts = response.json()["accounts"]
    assert len(imported_accounts) == 2
    assert [account["email"] for account in imported_accounts] == [
        "migrated@example.com",
        "second@example.com",
    ]
    account_id = UUID(imported_accounts[0]["account_id"])
    assert imported_accounts[0]["status"] == "pending_verification"
    account = await db.get(FBAccountModel, account_id)
    assert account is not None
    assert account.tenant_id == service_organization_id
    assert account.password_encrypted != b"secret-password"

    retry_response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json=payload,
        headers={"X-Bot-Token": BOT_TOKEN},
    )

    assert retry_response.status_code == 200, retry_response.text
    assert retry_response.json()["accounts"][0]["account_id"] == str(account_id)
    token_record = await db.scalar(select(FBCredentialMigrationTokenModel))
    assert token_record is not None
    assert token_record.tenant_id == service_organization_id
    assert token_record.created_by_user_id == admin.id
    assert token not in token_record.token_hash
    assert token_record.used_at is not None


@pytest.mark.asyncio
async def test_import_rejects_a_batch_that_differs_from_its_approved_summary(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, UUID, User],
) -> None:
    """A token approved for one safe batch cannot import another credential set."""
    client, db, _admin_tenant_id, _service_organization_id, _admin = migration_context
    created = await _create_migration_authorization(client)
    approval = await client.post(
        "/api/v1/fb-sync/migrations/authorization-requests/approve",
        json={"pairing_code": created["pairing_code"]},
    )
    assert approval.status_code == 200
    token_response = await client.get(
        f"/api/v1/fb-sync/migrations/authorization-requests/{created['authorization_id']}",
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    token = token_response.json()["migration_token"]
    accounts = [
        {"email": "first@example.com", "password": "secret-password"},
        {"email": "second@example.com", "password": "secret-password"},
    ]

    response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json=_migration_payload(token, accounts),
        headers={"X-Bot-Token": BOT_TOKEN},
    )

    assert response.status_code == 403
    assert await db.scalar(select(FBAccountModel)) is None


@pytest.mark.asyncio
async def test_import_rejects_expired_token_and_verification_report_advances_status(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, UUID, User],
) -> None:
    """Expired tokens fail closed and verified reports activate only migrated credentials."""
    client, db, _admin_tenant_id, _service_organization_id, _admin = migration_context
    expired_accounts = [{"email": "expired@example.com", "password": "secret-password"}]
    expired_token = await _create_migration_token(client, expired_accounts)
    token_record = await db.scalar(select(FBCredentialMigrationTokenModel))
    assert token_record is not None
    from datetime import UTC, datetime, timedelta

    token_record.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await db.commit()

    expired_response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json=_migration_payload(expired_token, expired_accounts),
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    assert expired_response.status_code == 410

    verified_accounts = [{"email": "verified@example.com", "password": "secret-password"}]
    token = await _create_migration_token(client, verified_accounts)
    import_response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json=_migration_payload(token, verified_accounts),
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    assert import_response.status_code == 200, import_response.text

    account_id = import_response.json()["accounts"][0]["account_id"]
    verification_response = await client.post(
        f"/api/v1/fb-sync/migrations/accounts/{account_id}/verification",
        json={"status": "verified"},
        headers={"X-Bot-Token": BOT_TOKEN},
    )

    assert verification_response.status_code == 200, verification_response.text
    assert verification_response.json()["status"] == "active"
    account = await db.get(FBAccountModel, UUID(account_id))
    assert account is not None
    assert account.status == "active"
    assert account.credential_verified_at is not None

    failed_accounts = [{"email": "failed@example.com", "password": "secret-password"}]
    failure_token = await _create_migration_token(client, failed_accounts)
    failed_import_response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json=_migration_payload(failure_token, failed_accounts),
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    assert failed_import_response.status_code == 200, failed_import_response.text

    failed_response = await client.post(
        "/api/v1/fb-sync/migrations/accounts/"
        f"{failed_import_response.json()['accounts'][0]['account_id']}/verification",
        json={"status": "failed", "error": "Two-factor authentication required"},
        headers={"X-Bot-Token": BOT_TOKEN},
    )

    assert failed_response.status_code == 200, failed_response.text
    assert failed_response.json()["status"] == "verification_failed"
    failed_account = await db.get(
        FBAccountModel,
        UUID(failed_import_response.json()["accounts"][0]["account_id"]),
    )
    assert failed_account is not None
    assert failed_account.last_error == "Two-factor authentication required"

    retry_response = await client.post(
        f"/api/v1/fb-sync/migrations/accounts/{failed_account.id}/verification",
        json={"status": "verified"},
        headers={"X-Bot-Token": BOT_TOKEN},
    )

    assert retry_response.status_code == 200, retry_response.text
    assert retry_response.json()["status"] == "active"


@pytest.mark.asyncio
async def test_bot_lists_only_migrated_accounts_pending_verification(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, UUID, User],
) -> None:
    """The verifier discovers pending migrated accounts without seeing active ones."""
    client, _db, _admin_tenant_id, _service_organization_id, _admin = migration_context
    verified_accounts = [{"email": "pending@example.com", "password": "secret-password"}]
    token = await _create_migration_token(client, verified_accounts)
    import_response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json=_migration_payload(token, verified_accounts),
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    assert import_response.status_code == 200, import_response.text
    account_id = import_response.json()["accounts"][0]["account_id"]

    await client.post(
        f"/api/v1/fb-sync/migrations/accounts/{account_id}/verification",
        json={"status": "verified"},
        headers={"X-Bot-Token": BOT_TOKEN},
    )

    pending_accounts = [{"email": "still-pending@example.com", "password": "secret-password"}]
    pending_token = await _create_migration_token(client, pending_accounts)
    await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json=_migration_payload(pending_token, pending_accounts),
        headers={"X-Bot-Token": BOT_TOKEN},
    )

    response = await client.get(
        "/api/v1/fb-sync/migrations/accounts/pending-verification",
        headers={"X-Bot-Token": BOT_TOKEN},
    )

    assert response.status_code == 200, response.text
    accounts = response.json()["accounts"]
    assert [account["email"] for account in accounts] == ["still-pending@example.com"]


@pytest.mark.asyncio
async def test_pending_and_verification_routes_reject_migrated_accounts_outside_service_org(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, UUID, User],
) -> None:
    """The bot cannot discover or verify a migrated credential from another organization."""
    from datetime import UTC, datetime, timedelta

    client, db, admin_tenant_id, _service_organization_id, admin = migration_context
    foreign_token = FBCredentialMigrationTokenModel(
        tenant_id=admin_tenant_id,
        created_by_user_id=admin.id,
        token_hash="f" * 64,
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )
    db.add(foreign_token)
    await db.flush()
    foreign_account = FBAccountModel(
        tenant_id=admin_tenant_id,
        migration_token_id=foreign_token.id,
        email="foreign@example.com",
        password_encrypted=b"encrypted",
        status="pending_verification",
    )
    db.add(foreign_account)
    await db.commit()

    pending = await client.get(
        "/api/v1/fb-sync/migrations/accounts/pending-verification",
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    report = await client.post(
        f"/api/v1/fb-sync/migrations/accounts/{foreign_account.id}/verification",
        json={"status": "verified"},
        headers={"X-Bot-Token": BOT_TOKEN},
    )

    assert pending.status_code == 200
    assert pending.json()["accounts"] == []
    assert report.status_code == 404
    assert foreign_account.status == "pending_verification"


@pytest.mark.asyncio
async def test_token_generation_requires_platform_super_admin(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, UUID, User],
) -> None:
    """A tenant admin cannot issue a central migration token."""
    client, _db, _admin_tenant_id, _service_organization_id, admin = migration_context
    admin.roles = [Role(id=uuid4(), role_type=RoleType.ADMIN, name="Admin")]

    response = await client.post(
        "/api/v1/fb-sync/migrations/tokens",
        json={"account_count": 1, "batch_fingerprint": "a" * 64},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_token_generation_fails_closed_without_service_organization(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, UUID, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Migration operations require an explicitly configured service organization."""
    client, _db, _admin_tenant_id, _service_organization_id, _admin = migration_context
    # See migration_context: dotted-string monkeypatch resolution is broken
    # for this module by the routers/__init__.py re-export shadow.
    monkeypatch.setattr(global_settings, "service_organization_id", None)

    response = await client.post(
        "/api/v1/fb-sync/migrations/tokens",
        json={"account_count": 1, "batch_fingerprint": "a" * 64},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Migration service organization is not configured"
