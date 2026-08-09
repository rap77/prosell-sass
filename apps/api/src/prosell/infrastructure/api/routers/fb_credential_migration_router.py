"""Approved migration flow for Facebook bot credentials."""

import hashlib
import json
import re
import secrets
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.core.config import settings
from prosell.domain.entities.role import RoleType
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_token_hasher,
    verify_bot_token,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.fb_account_model import FBAccountModel
from prosell.infrastructure.models.fb_credential_migration_model import (
    FBCredentialMigrationAuthorizationModel,
    FBCredentialMigrationTokenModel,
)
from prosell.infrastructure.security.token_hasher import TokenHasher
from prosell.infrastructure.services.fb_encryption_service import get_fb_encryption_service

router = APIRouter(prefix="/fb-sync/migrations", tags=["fb-credential-migrations"])

DbSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[User, Depends(get_current_auth_user_from_cookie)]
TokenHasherDep = Annotated[TokenHasher, Depends(get_token_hasher)]
MIGRATION_AUTHORIZATION_TTL = timedelta(minutes=15)
PAIRING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


class CreateMigrationTokenRequest(BaseModel):
    """Lifetime configuration for an approved migration authorization."""

    expires_in_minutes: int = Field(default=15, ge=1, le=60)
    account_count: int = Field(ge=1, le=100)
    batch_fingerprint: str = Field(pattern=r"^[0-9a-fA-F]{64}$")


class CreateMigrationTokenResponse(BaseModel):
    """Plaintext token returned once to the tenant administrator."""

    token: str
    expires_at: datetime


class CreateMigrationAuthorizationRequest(BaseModel):
    """Non-secret summary of the batch a bot needs a human to approve."""

    model_config = ConfigDict(extra="forbid")

    account_count: int = Field(ge=1, le=100)
    batch_fingerprint: str = Field(pattern=r"^[0-9a-fA-F]{64}$")


class ApproveMigrationAuthorizationRequest(BaseModel):
    """Human-entered pairing proof for a pending bot authorization."""

    model_config = ConfigDict(extra="forbid")

    pairing_code: str = Field(pattern=r"^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$")


class MigrationAuthorizationResponse(BaseModel):
    """Safe state shared with the bot and the approving administrator."""

    authorization_id: UUID
    expires_at: datetime
    status: Literal["pending", "approved", "expired"]
    account_count: int
    batch_fingerprint: str


class CreateMigrationAuthorizationResponse(MigrationAuthorizationResponse):
    """New authorization paired with a short code for human confirmation."""

    pairing_code: str


class PollMigrationAuthorizationResponse(MigrationAuthorizationResponse):
    """Bot authorization state with a migration token delivered at most once."""

    migration_token: str | None = None


class ImportAccountRequest(BaseModel):
    """One credential in the approved migration batch."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=1024)
    alias: str | None = Field(default=None, max_length=100)
    groups: str | None = Field(default=None, max_length=2000)
    browser: str = Field(default="chrome", max_length=20)
    language: str = Field(default="es", max_length=10)
    time_to_sleep: Decimal = Field(default=Decimal("0.7"), ge=Decimal("0.0"), le=Decimal("9.9"))


class ImportCredentialsRequest(BaseModel):
    """Bot batch whose tenant ownership is derived exclusively from its token."""

    model_config = ConfigDict(extra="forbid")

    migration_token: str = Field(min_length=32, max_length=512)
    batch_fingerprint: str = Field(pattern=r"^[0-9a-fA-F]{64}$")
    accounts: list[ImportAccountRequest] = Field(min_length=1, max_length=100)


class ImportedCredentialResponse(BaseModel):
    """Safe account reference for subsequent verification reporting."""

    account_id: UUID
    email: EmailStr
    status: str


class ImportCredentialsResponse(BaseModel):
    """Result of an idempotent credential import batch."""

    accounts: list[ImportedCredentialResponse]


class PendingVerificationAccount(BaseModel):
    """Migrated account available to the credential verifier."""

    id: UUID
    email: EmailStr
    status: str


class PendingVerificationAccountsResponse(BaseModel):
    """Pending migrated credentials for the bot verifier."""

    accounts: list[PendingVerificationAccount]


class VerificationReportRequest(BaseModel):
    """Verification result produced by the migration bot."""

    status: Literal["verified", "failed"]
    error: str | None = Field(default=None, max_length=2000)


class VerificationReportResponse(BaseModel):
    """Current credential verification state."""

    account_id: UUID
    status: str
    verified_at: datetime | None


def _require_migration_admin(current_user: User) -> None:
    """Credential migration is a ProSell platform-super-admin operation."""
    if not current_user.has_role(RoleType.SUPER_ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role 'super_admin' required",
        )


def _require_service_organization() -> UUID:
    """Require the centrally owned tenant before any credential migration operation."""
    if settings.service_organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Migration service organization is not configured",
        )
    return settings.service_organization_id


def _new_pairing_code() -> str:
    """Generate a readable correlation code without ambiguous characters."""
    code = "".join(secrets.choice(PAIRING_CODE_ALPHABET) for _ in range(8))
    return f"{code[:4]}-{code[4:]}"


def _normalize_groups(groups: str | None) -> str | None:
    """Match the bot's stable legacy-group normalization for batch binding."""
    if groups is None:
        return None
    parts: list[str] = []
    for segment in re.split(r"[\s,]+", groups):
        segment = segment.strip()
        if not segment:
            continue
        if "-" in segment and not segment.startswith("-"):
            try:
                start, end = segment.split("-", 1)
                parts.extend(str(index) for index in range(int(start), int(end) + 1))
            except ValueError:
                parts.append(segment)
        else:
            parts.append(segment)
    return ",".join(sorted(set(parts), key=lambda value: int(value) if value.isdigit() else 0))


def _batch_fingerprint(accounts: list[ImportAccountRequest]) -> str:
    """Recompute the non-secret canonical batch identity submitted by the bot."""
    identities = [
        {
            "email": str(account.email).strip().lower(),
            "alias": account.alias.strip().casefold() if account.alias else "",
            "groups": _normalize_groups(account.groups),
        }
        for account in accounts
    ]
    identities.sort(
        key=lambda identity: json.dumps(identity, separators=(",", ":"), sort_keys=True)
    )
    canonical = json.dumps(identities, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _authorization_status(
    authorization: FBCredentialMigrationAuthorizationModel, now: datetime
) -> Literal["pending", "approved", "expired"]:
    """Expose expiration without mutating an unapproved audit record."""
    if authorization.expires_at <= now:
        return "expired"
    return authorization.status  # type: ignore[return-value]


def _authorization_response(
    authorization: FBCredentialMigrationAuthorizationModel, now: datetime
) -> MigrationAuthorizationResponse:
    """Build a safe authorization state response."""
    return MigrationAuthorizationResponse(
        authorization_id=authorization.id,
        expires_at=authorization.expires_at,
        status=_authorization_status(authorization, now),
        account_count=authorization.account_count,
        batch_fingerprint=authorization.batch_fingerprint,
    )


@router.post(
    "/authorization-requests",
    response_model=CreateMigrationAuthorizationResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_bot_token)],
)
async def create_migration_authorization(
    request: CreateMigrationAuthorizationRequest,
    db: DbSession,
) -> CreateMigrationAuthorizationResponse:
    """Create a short-lived, non-secret batch authorization for platform approval."""
    _require_service_organization()
    expires_at = datetime.now(UTC) + MIGRATION_AUTHORIZATION_TTL
    authorization = FBCredentialMigrationAuthorizationModel(
        pairing_code=_new_pairing_code(),
        account_count=request.account_count,
        batch_fingerprint=request.batch_fingerprint,
        expires_at=expires_at,
    )
    db.add(authorization)
    await db.commit()
    return CreateMigrationAuthorizationResponse(
        authorization_id=authorization.id,
        pairing_code=authorization.pairing_code,
        expires_at=authorization.expires_at,
        status="pending",
        account_count=authorization.account_count,
        batch_fingerprint=authorization.batch_fingerprint,
    )


@router.post(
    "/authorization-requests/approve",
    response_model=MigrationAuthorizationResponse,
)
async def approve_migration_authorization(
    request: ApproveMigrationAuthorizationRequest,
    db: DbSession,
    current_user: CurrentUser,
    token_hasher: TokenHasherDep,
) -> MigrationAuthorizationResponse:
    """Approve a bot batch and create its one-time token for the service organization."""
    _require_migration_admin(current_user)
    service_organization_id = _require_service_organization()
    result = await db.execute(
        select(FBCredentialMigrationAuthorizationModel)
        .where(FBCredentialMigrationAuthorizationModel.pairing_code == request.pairing_code)
        .with_for_update()
    )
    authorization = result.scalar_one_or_none()
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Migration authorization pairing code not found",
        )

    now = datetime.now(UTC)
    if authorization.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Migration authorization expired",
        )
    if authorization.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Migration authorization already approved",
        )
    plaintext_token = secrets.token_urlsafe(32)
    migration_token = FBCredentialMigrationTokenModel(
        tenant_id=service_organization_id,
        created_by_user_id=current_user.id,
        token_hash=token_hasher.hash(plaintext_token),
        expires_at=authorization.expires_at,
        account_count=authorization.account_count,
        batch_fingerprint=authorization.batch_fingerprint,
    )
    db.add(migration_token)
    await db.flush()
    authorization.status = "approved"
    authorization.approved_by_user_id = current_user.id
    authorization.approved_at = now
    authorization.migration_token_id = migration_token.id
    authorization.migration_token_encrypted = get_fb_encryption_service().encrypt(
        plaintext_token, str(service_organization_id)
    )
    await db.commit()
    return _authorization_response(authorization, now)


@router.get(
    "/authorization-requests/{authorization_id}",
    response_model=PollMigrationAuthorizationResponse,
    dependencies=[Depends(verify_bot_token)],
)
async def poll_migration_authorization(
    authorization_id: UUID,
    db: DbSession,
) -> PollMigrationAuthorizationResponse:
    """Return authorization state and atomically deliver an approved token once."""
    service_organization_id = _require_service_organization()
    result = await db.execute(
        select(FBCredentialMigrationAuthorizationModel)
        .where(FBCredentialMigrationAuthorizationModel.id == authorization_id)
        .with_for_update()
    )
    authorization = result.scalar_one_or_none()
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Migration authorization not found",
        )

    now = datetime.now(UTC)
    response = _authorization_response(authorization, now)
    plaintext_token = None
    if response.status == "approved" and authorization.migration_token_encrypted is not None:
        plaintext_token = get_fb_encryption_service().decrypt(
            authorization.migration_token_encrypted, str(service_organization_id)
        )
        authorization.migration_token_encrypted = None
        authorization.token_delivered_at = now
        await db.commit()

    return PollMigrationAuthorizationResponse(
        **response.model_dump(), migration_token=plaintext_token
    )


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
    """Issue a one-time credential migration token for the service organization."""
    _require_migration_admin(current_user)
    service_organization_id = _require_service_organization()
    plaintext_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(minutes=request.expires_in_minutes)
    db.add(
        FBCredentialMigrationTokenModel(
            tenant_id=service_organization_id,
            created_by_user_id=current_user.id,
            token_hash=token_hasher.hash(plaintext_token),
            expires_at=expires_at,
            account_count=request.account_count,
            batch_fingerprint=request.batch_fingerprint.lower(),
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
    service_organization_id = _require_service_organization()
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
    if migration_token.tenant_id != service_organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Migration token is not authorized for the service organization",
        )

    now = datetime.now(UTC)
    if migration_token.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Migration token expired")
    emails = [str(account.email).lower() for account in request.accounts]
    if len(emails) != len(set(emails)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Duplicate emails",
        )
    if migration_token.account_count != len(request.accounts) or (
        migration_token.batch_fingerprint is None
        or migration_token.batch_fingerprint.lower() != request.batch_fingerprint.lower()
        or request.batch_fingerprint.lower() != _batch_fingerprint(request.accounts)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Migration batch does not match its authorization",
        )

    if migration_token.used_at is not None:
        existing_result = await db.execute(
            select(FBAccountModel)
            .where(FBAccountModel.migration_token_id == migration_token.id)
            .order_by(FBAccountModel.created_at)
        )
        accounts = existing_result.scalars().all()
        if {account.email.lower() for account in accounts} != set(emails):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Migration token already used",
            )
        accounts_by_email = {account.email.lower(): account for account in accounts}
        return ImportCredentialsResponse(
            accounts=[
                ImportedCredentialResponse(
                    account_id=accounts_by_email[email].id,
                    email=email,
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
    existing_accounts = {acc.email.lower(): acc for acc in existing_result.scalars().all()}

    # Filter to only new accounts
    new_imports = [
        account
        for account in request.accounts
        if str(account.email).lower() not in existing_accounts
    ]

    encryption = get_fb_encryption_service()
    new_accounts = [
        FBAccountModel(
            tenant_id=migration_token.tenant_id,
            migration_token_id=migration_token.id,
            email=str(import_account.email).lower(),
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

    accounts_by_email = {
        **existing_accounts,
        **{account.email.lower(): account for account in new_accounts},
    }
    response_accounts = [
        ImportedCredentialResponse(
            account_id=accounts_by_email[email].id,
            email=email,
            status=(
                f"skipped:{accounts_by_email[email].status}"
                if email in existing_accounts
                else accounts_by_email[email].status
            ),
        )
        for email in emails
    ]
    return ImportCredentialsResponse(accounts=response_accounts)


@router.get(
    "/accounts/pending-verification",
    response_model=PendingVerificationAccountsResponse,
    dependencies=[Depends(verify_bot_token)],
)
async def list_pending_verification_accounts(
    db: DbSession,
) -> PendingVerificationAccountsResponse:
    """List migrated credentials that require initial verification or a retry."""
    service_organization_id = _require_service_organization()
    result = await db.execute(
        select(FBAccountModel)
        .where(
            FBAccountModel.migration_token_id.is_not(None),
            FBAccountModel.tenant_id == service_organization_id,
            FBAccountModel.status.in_(["pending_verification", "verification_failed"]),
        )
        .order_by(FBAccountModel.created_at)
    )
    accounts = result.scalars().all()
    return PendingVerificationAccountsResponse(
        accounts=[
            PendingVerificationAccount(
                id=account.id,
                email=account.email,
                status=account.status,
            )
            for account in accounts
        ]
    )


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
    service_organization_id = _require_service_organization()
    account_result = await db.execute(
        select(FBAccountModel)
        .where(
            FBAccountModel.id == account_id,
            FBAccountModel.migration_token_id.is_not(None),
            FBAccountModel.tenant_id == service_organization_id,
        )
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
    if account.status not in {"pending_verification", "verification_failed"}:
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
