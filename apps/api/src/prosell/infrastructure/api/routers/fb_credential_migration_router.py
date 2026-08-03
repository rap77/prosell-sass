"""Approved migration flow for Facebook bot credentials."""

import secrets
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.role import Permission
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_token_hasher,
    verify_bot_token,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.fb_account_model import FBAccountModel
from prosell.infrastructure.models.fb_credential_migration_model import (
    FBCredentialMigrationTokenModel,
)
from prosell.infrastructure.security.token_hasher import TokenHasher
from prosell.infrastructure.services.fb_encryption_service import get_fb_encryption_service

router = APIRouter(prefix="/fb-sync/migrations", tags=["fb-credential-migrations"])

DbSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[User, Depends(get_current_auth_user_from_cookie)]
TokenHasherDep = Annotated[TokenHasher, Depends(get_token_hasher)]


class CreateMigrationTokenRequest(BaseModel):
    """Lifetime configuration for an approved migration authorization."""

    expires_in_minutes: int = Field(default=15, ge=1, le=60)


class CreateMigrationTokenResponse(BaseModel):
    """Plaintext token returned once to the tenant administrator."""

    token: str
    expires_at: datetime


class ImportAccountRequest(BaseModel):
    """One credential in the approved migration batch."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=1024)
    alias: str | None = Field(default=None, max_length=100)
    browser: str = Field(default="chrome", max_length=20)
    language: str = Field(default="es", max_length=10)
    time_to_sleep: Decimal = Field(default=Decimal("0.7"), ge=Decimal("0.0"), le=Decimal("9.9"))


class ImportCredentialsRequest(BaseModel):
    """Tenant-claimed bot batch, bound and verified against the migration token."""

    migration_token: str = Field(min_length=32, max_length=512)
    tenant_id: UUID
    accounts: list[ImportAccountRequest] = Field(min_length=1, max_length=100)


class ImportedCredentialResponse(BaseModel):
    """Safe account reference for subsequent verification reporting."""

    account_id: UUID
    status: str


class ImportCredentialsResponse(BaseModel):
    """Result of an idempotent credential import batch."""

    accounts: list[ImportedCredentialResponse]


class VerificationReportRequest(BaseModel):
    """Verification result produced by the migration bot."""

    status: Literal["verified", "failed"]
    error: str | None = Field(default=None, max_length=2000)


class VerificationReportResponse(BaseModel):
    """Current credential verification state."""

    account_id: UUID
    status: str
    verified_at: datetime | None


def _require_migration_admin(current_user: User) -> UUID:
    """Authorize a tenant administrator without accepting a client tenant ID."""
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant context is required for credential migration",
        )
    if not current_user.has_permission(Permission.SETTINGS_UPDATE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission 'settings:update' required",
        )
    return current_user.tenant_id


@router.post(
    "/tokens",
    response_model=CreateMigrationTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_migration_token(
    request: CreateMigrationTokenRequest,
    db: DbSession,
    current_user: CurrentUser,
    token_hasher: TokenHasherDep,
) -> CreateMigrationTokenResponse:
    """Issue a one-time credential migration token for the current tenant."""
    tenant_id = _require_migration_admin(current_user)
    plaintext_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(minutes=request.expires_in_minutes)
    db.add(
        FBCredentialMigrationTokenModel(
            tenant_id=tenant_id,
            created_by_user_id=current_user.id,
            token_hash=token_hasher.hash(plaintext_token),
            expires_at=expires_at,
        )
    )
    await db.commit()
    return CreateMigrationTokenResponse(token=plaintext_token, expires_at=expires_at)


@router.post(
    "/accounts",
    response_model=ImportCredentialsResponse,
    dependencies=[Depends(verify_bot_token)],
)
async def import_credentials(
    request: ImportCredentialsRequest,
    db: DbSession,
    token_hasher: TokenHasherDep,
) -> ImportCredentialsResponse:
    """Import an encrypted credential batch under the tenant encoded by its token."""
    token_result = await db.execute(
        select(FBCredentialMigrationTokenModel)
        .where(
            FBCredentialMigrationTokenModel.token_hash == token_hasher.hash(request.migration_token)
        )
        .with_for_update()
    )
    migration_token = token_result.scalar_one_or_none()
    if migration_token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Migration token not found",
        )

    now = datetime.now(UTC)
    if migration_token.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Migration token expired")
    if request.tenant_id != migration_token.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Migration tenant mismatch",
        )

    emails = [str(account.email) for account in request.accounts]
    if len(emails) != len(set(emails)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Duplicate emails",
        )

    if migration_token.used_at is not None:
        existing_result = await db.execute(
            select(FBAccountModel)
            .where(FBAccountModel.migration_token_id == migration_token.id)
            .order_by(FBAccountModel.created_at)
        )
        accounts = existing_result.scalars().all()
        if {account.email for account in accounts} != set(emails):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Migration token already used",
            )
        accounts_by_email = {account.email: account for account in accounts}
        return ImportCredentialsResponse(
            accounts=[
                ImportedCredentialResponse(
                    account_id=accounts_by_email[email].id,
                    status=accounts_by_email[email].status,
                )
                for email in emails
            ]
        )

    # Find existing accounts - skip them instead of failing
    existing_result = await db.execute(
        select(FBAccountModel).where(
            FBAccountModel.tenant_id == migration_token.tenant_id,
            FBAccountModel.email.in_(emails),
        )
    )
    existing_accounts = {acc.email: acc for acc in existing_result.scalars().all()}

    # Filter to only new accounts
    new_imports = [acc for acc in request.accounts if str(acc.email) not in existing_accounts]

    encryption = get_fb_encryption_service()
    new_accounts = [
        FBAccountModel(
            tenant_id=migration_token.tenant_id,
            migration_token_id=migration_token.id,
            email=str(import_account.email),
            password_encrypted=encryption.encrypt(
                import_account.password, str(migration_token.tenant_id)
            ),
            alias=import_account.alias,
            browser=import_account.browser,
            language=import_account.language,
            time_to_sleep=import_account.time_to_sleep,
            status="pending_verification",
        )
        for import_account in new_imports
    ]
    if new_accounts:
        db.add_all(new_accounts)
        await db.flush()
    migration_token.used_at = now
    await db.commit()

    # Return all: existing (skipped) + new (created)
    response_accounts = [
        ImportedCredentialResponse(account_id=acc.id, status=f"skipped:{acc.status}")
        for acc in existing_accounts.values()
    ] + [ImportedCredentialResponse(account_id=acc.id, status=acc.status) for acc in new_accounts]
    return ImportCredentialsResponse(accounts=response_accounts)


@router.post(
    "/accounts/{account_id}/verification",
    response_model=VerificationReportResponse,
    dependencies=[Depends(verify_bot_token)],
)
async def report_credential_verification(
    account_id: UUID,
    request: VerificationReportRequest,
    db: DbSession,
) -> VerificationReportResponse:
    """Advance a migrated credential from pending to verified or failed."""
    account_result = await db.execute(
        select(FBAccountModel)
        .where(FBAccountModel.id == account_id, FBAccountModel.migration_token_id.is_not(None))
        .with_for_update()
    )
    account = account_result.scalar_one_or_none()
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Migrated account not found",
        )

    if account.status == "active" and request.status == "verified":
        return VerificationReportResponse(
            account_id=account.id,
            status=account.status,
            verified_at=account.credential_verified_at,
        )
    if account.status == "verification_failed" and request.status == "failed":
        return VerificationReportResponse(
            account_id=account.id,
            status=account.status,
            verified_at=None,
        )
    if account.status != "pending_verification":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account cannot be verified",
        )

    now = datetime.now(UTC)
    if request.status == "verified":
        account.status = "active"
        account.last_error = None
        account.last_error_at = None
        account.credential_verified_at = now
    else:
        account.status = "verification_failed"
        account.last_error = request.error or "Credential verification failed"
        account.last_error_at = now
    account.updated_at = now
    await db.commit()
    return VerificationReportResponse(
        account_id=account.id,
        status=account.status,
        verified_at=account.credential_verified_at,
    )
