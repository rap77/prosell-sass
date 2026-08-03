"""Integration tests for approved Facebook credential migration."""

from collections.abc import AsyncGenerator
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.fb_account_model import FBAccountModel
from prosell.infrastructure.models.fb_credential_migration_model import (
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
) -> AsyncGenerator[tuple[AsyncClient, AsyncSession, UUID, User]]:
    """Provide an admin tenant, transactional database, and protected client."""
    tenant_id = uuid4()
    user_id = uuid4()
    test_db_session.add(
        OrganizationModel(
            id=tenant_id,
            tenant_id=tenant_id,
            name="Migration Tenant",
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
            tenant_id=tenant_id,
        )
    )
    await test_db_session.flush()

    admin = User(
        id=user_id,
        email="migration-admin@example.com",
        full_name="Migration Admin",
        tenant_id=tenant_id,
    )
    admin.roles = [Role(id=uuid4(), role_type=RoleType.ADMIN, name="Admin")]

    async def override_session() -> AsyncGenerator[AsyncSession]:
        yield test_db_session

    app.dependency_overrides[get_async_session] = override_session
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: admin
    monkeypatch.setattr(
        "prosell.infrastructure.api.dependencies.settings.fb_bot_api_key",
        BOT_TOKEN,
    )
    encryption = FBEncryptionService("test-migration-encryption-key")
    monkeypatch.setattr(
        "prosell.infrastructure.api.routers.fb_credential_migration_router.get_fb_encryption_service",
        lambda: encryption,
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client, test_db_session, tenant_id, admin

    app.dependency_overrides.clear()


async def _create_migration_token(client: AsyncClient) -> str:
    response = await client.post("/api/v1/fb-sync/migrations/tokens", json={})
    assert response.status_code == 201, response.text
    return response.json()["token"]


@pytest.mark.asyncio
async def test_import_uses_token_tenant_encrypts_password_and_is_idempotent(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, User],
) -> None:
    """Bot imports a batch only when its tenant claim matches the token tenant."""
    client, db, tenant_id, _admin = migration_context
    token = await _create_migration_token(client)
    payload = {
        "migration_token": token,
        "accounts": [
            {"email": "migrated@example.com", "password": "secret-password"},
            {"email": "second@example.com", "password": "another-password"},
        ],
        "tenant_id": str(uuid4()),
    }

    mismatch_response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json=payload,
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    assert mismatch_response.status_code == 403

    payload["tenant_id"] = str(tenant_id)
    response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json=payload,
        headers={"X-Bot-Token": BOT_TOKEN},
    )

    assert response.status_code == 200, response.text
    imported_accounts = response.json()["accounts"]
    assert len(imported_accounts) == 2
    account_id = UUID(imported_accounts[0]["account_id"])
    assert imported_accounts[0]["status"] == "pending_verification"
    account = await db.get(FBAccountModel, account_id)
    assert account is not None
    assert account.tenant_id == tenant_id
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
    assert token not in token_record.token_hash
    assert token_record.used_at is not None


@pytest.mark.asyncio
async def test_import_rejects_expired_token_and_verification_report_advances_status(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, User],
) -> None:
    """Expired tokens fail closed and verified reports activate only migrated credentials."""
    client, db, tenant_id, _admin = migration_context
    expired_token = await _create_migration_token(client)
    token_record = await db.scalar(select(FBCredentialMigrationTokenModel))
    assert token_record is not None
    from datetime import UTC, datetime, timedelta

    token_record.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await db.commit()

    expired_response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json={
            "migration_token": expired_token,
            "tenant_id": str(tenant_id),
            "accounts": [{"email": "expired@example.com", "password": "secret-password"}],
        },
        headers={"X-Bot-Token": BOT_TOKEN},
    )
    assert expired_response.status_code == 410

    token = await _create_migration_token(client)
    import_response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json={
            "migration_token": token,
            "tenant_id": str(tenant_id),
            "accounts": [{"email": "verified@example.com", "password": "secret-password"}],
        },
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

    failure_token = await _create_migration_token(client)
    failed_import_response = await client.post(
        "/api/v1/fb-sync/migrations/accounts",
        json={
            "migration_token": failure_token,
            "tenant_id": str(tenant_id),
            "accounts": [{"email": "failed@example.com", "password": "secret-password"}],
        },
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


@pytest.mark.asyncio
async def test_token_generation_requires_tenant_admin(
    migration_context: tuple[AsyncClient, AsyncSession, UUID, User],
) -> None:
    """Cookie-authenticated users without admin permission cannot issue migration tokens."""
    client, _db, _tenant_id, admin = migration_context
    admin.roles = [Role(id=uuid4(), role_type=RoleType.VIEWER, name="Viewer")]

    response = await client.post("/api/v1/fb-sync/migrations/tokens", json={})

    assert response.status_code == 403
