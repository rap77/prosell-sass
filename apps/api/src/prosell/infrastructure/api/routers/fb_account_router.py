"""FB Account management router (admin CRUD)."""

from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from prosell.infrastructure.api.dependencies import get_current_auth_user
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.fb_account_model import (
    FBAccountGroupModel,
    FBAccountModel,
    FBGroupCategory,
)
from prosell.infrastructure.models.user_model import UserModel
from prosell.infrastructure.services.fb_encryption_service import get_fb_encryption_service

router = APIRouter(prefix="/fb-accounts", tags=["fb-accounts"])

DbSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[UserModel, Depends(get_current_auth_user)]


# =============================================================================
# DTOs
# =============================================================================


class FBGroupInput(BaseModel):
    """Group input for create/update."""

    position: int
    fb_group_id: str | None = None
    name: str | None = None
    category: str = "general"
    is_active: bool = True


class FBAccountCreate(BaseModel):
    """Create account request."""

    email: EmailStr
    password: str
    alias: str | None = None
    broker_id: UUID | None = None
    browser: str = "chrome"
    language: str = "es"
    time_to_sleep: Decimal = Decimal("0.7")
    groups: list[FBGroupInput] = []


class FBAccountUpdate(BaseModel):
    """Update account request (password excluded)."""

    alias: str | None = None
    broker_id: UUID | None = None
    browser: str | None = None
    language: str | None = None
    time_to_sleep: Decimal | None = None
    status: str | None = None


class FBGroupOut(BaseModel):
    """Group output."""

    id: UUID
    position: int
    fb_group_id: str | None
    name: str | None
    category: str
    is_active: bool
    total_posts: int
    last_post_at: datetime | None


class FBAccountOut(BaseModel):
    """Account output (no password)."""

    id: UUID
    email: str
    alias: str | None
    broker_id: UUID | None
    browser: str
    language: str
    time_to_sleep: Decimal
    status: str
    groups_count: int
    total_publications: int
    total_failures: int
    last_used_at: datetime | None
    last_error: str | None
    created_at: datetime


class FBAccountDetail(FBAccountOut):
    """Account with groups."""

    groups: list[FBGroupOut]


# =============================================================================
# ENDPOINTS
# =============================================================================


@router.get("", response_model=list[FBAccountOut])
async def list_accounts(
    db: DbSession,
    user: CurrentUser,
) -> list[FBAccountOut]:
    """List all FB accounts for current tenant."""
    query = (
        select(FBAccountModel)
        .where(FBAccountModel.tenant_id == user.tenant_id)
        .where(FBAccountModel.status != "deleted")
        .options(selectinload(FBAccountModel.groups))
        .order_by(FBAccountModel.created_at.desc())
    )
    result = await db.execute(query)
    accounts = result.scalars().all()

    return [
        FBAccountOut(
            id=a.id,
            email=a.email,
            alias=a.alias,
            broker_id=a.broker_id,
            browser=a.browser,
            language=a.language,
            time_to_sleep=a.time_to_sleep,
            status=a.status,
            groups_count=len([g for g in a.groups if g.is_active]),
            total_publications=a.total_publications,
            total_failures=a.total_failures,
            last_used_at=a.last_used_at,
            last_error=a.last_error,
            created_at=a.created_at,
        )
        for a in accounts
    ]


@router.post("", response_model=FBAccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(
    request: FBAccountCreate,
    db: DbSession,
    user: CurrentUser,
) -> FBAccountOut:
    """Create a new FB account."""
    # Check duplicate email
    existing = await db.execute(
        select(FBAccountModel)
        .where(FBAccountModel.tenant_id == user.tenant_id)
        .where(FBAccountModel.email == request.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Account with email {request.email} already exists",
        )

    # Encrypt password
    encryption = get_fb_encryption_service()
    password_encrypted = encryption.encrypt(request.password, str(user.tenant_id))

    account = FBAccountModel(
        tenant_id=user.tenant_id,
        email=request.email,
        alias=request.alias,
        broker_id=request.broker_id,
        password_encrypted=password_encrypted,
        browser=request.browser,
        language=request.language,
        time_to_sleep=request.time_to_sleep,
    )

    # Add groups
    for g in request.groups:
        account.groups.append(
            FBAccountGroupModel(
                position=g.position,
                fb_group_id=g.fb_group_id,
                name=g.name,
                category=FBGroupCategory(g.category),
                is_active=g.is_active,
            )
        )

    db.add(account)
    await db.commit()
    await db.refresh(account)

    return FBAccountOut(
        id=account.id,
        email=account.email,
        alias=account.alias,
        broker_id=account.broker_id,
        browser=account.browser,
        language=account.language,
        time_to_sleep=account.time_to_sleep,
        status=account.status,
        groups_count=len(account.groups),
        total_publications=account.total_publications,
        total_failures=account.total_failures,
        last_used_at=account.last_used_at,
        last_error=account.last_error,
        created_at=account.created_at,
    )


@router.get("/{account_id}", response_model=FBAccountDetail)
async def get_account(
    account_id: UUID,
    db: DbSession,
    user: CurrentUser,
) -> FBAccountDetail:
    """Get account details with groups."""
    query = (
        select(FBAccountModel)
        .where(FBAccountModel.id == account_id)
        .where(FBAccountModel.tenant_id == user.tenant_id)
        .options(selectinload(FBAccountModel.groups))
    )
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    return FBAccountDetail(
        id=account.id,
        email=account.email,
        alias=account.alias,
        broker_id=account.broker_id,
        browser=account.browser,
        language=account.language,
        time_to_sleep=account.time_to_sleep,
        status=account.status,
        groups_count=len([g for g in account.groups if g.is_active]),
        total_publications=account.total_publications,
        total_failures=account.total_failures,
        last_used_at=account.last_used_at,
        last_error=account.last_error,
        created_at=account.created_at,
        groups=[
            FBGroupOut(
                id=g.id,
                position=g.position,
                fb_group_id=g.fb_group_id,
                name=g.name,
                category=g.category.value,
                is_active=g.is_active,
                total_posts=g.total_posts,
                last_post_at=g.last_post_at,
            )
            for g in sorted(account.groups, key=lambda x: x.position)
        ],
    )


@router.patch("/{account_id}", response_model=FBAccountOut)
async def update_account(
    account_id: UUID,
    request: FBAccountUpdate,
    db: DbSession,
    user: CurrentUser,
) -> FBAccountOut:
    """Update account (except password)."""
    query = (
        select(FBAccountModel)
        .where(FBAccountModel.id == account_id)
        .where(FBAccountModel.tenant_id == user.tenant_id)
        .options(selectinload(FBAccountModel.groups))
    )
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
    account.updated_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(account)

    return FBAccountOut(
        id=account.id,
        email=account.email,
        alias=account.alias,
        broker_id=account.broker_id,
        browser=account.browser,
        language=account.language,
        time_to_sleep=account.time_to_sleep,
        status=account.status,
        groups_count=len([g for g in account.groups if g.is_active]),
        total_publications=account.total_publications,
        total_failures=account.total_failures,
        last_used_at=account.last_used_at,
        last_error=account.last_error,
        created_at=account.created_at,
    )


class ChangePasswordRequest(BaseModel):
    """Change password request."""

    new_password: str


@router.post("/{account_id}/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    account_id: UUID,
    request: ChangePasswordRequest,
    db: DbSession,
    user: CurrentUser,
) -> dict[str, str]:
    """Change account password."""
    query = (
        select(FBAccountModel)
        .where(FBAccountModel.id == account_id)
        .where(FBAccountModel.tenant_id == user.tenant_id)
    )
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    encryption = get_fb_encryption_service()
    account.password_encrypted = encryption.encrypt(request.new_password, str(user.tenant_id))
    account.updated_at = datetime.now(UTC)

    await db.commit()

    return {"status": "password_changed"}


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: UUID,
    db: DbSession,
    user: CurrentUser,
) -> None:
    """Soft delete account."""
    query = (
        select(FBAccountModel)
        .where(FBAccountModel.id == account_id)
        .where(FBAccountModel.tenant_id == user.tenant_id)
    )
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    account.status = "deleted"
    account.updated_at = datetime.now(UTC)
    await db.commit()


# =============================================================================
# GROUP MANAGEMENT
# =============================================================================


@router.post("/{account_id}/groups", response_model=FBGroupOut, status_code=status.HTTP_201_CREATED)
async def add_group(
    account_id: UUID,
    request: FBGroupInput,
    db: DbSession,
    user: CurrentUser,
) -> FBGroupOut:
    """Add a group to account."""
    query = (
        select(FBAccountModel)
        .where(FBAccountModel.id == account_id)
        .where(FBAccountModel.tenant_id == user.tenant_id)
    )
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    group = FBAccountGroupModel(
        fb_account_id=account_id,
        position=request.position,
        fb_group_id=request.fb_group_id,
        name=request.name,
        category=FBGroupCategory(request.category),
        is_active=request.is_active,
    )
    db.add(group)
    await db.commit()
    await db.refresh(group)

    return FBGroupOut(
        id=group.id,
        position=group.position,
        fb_group_id=group.fb_group_id,
        name=group.name,
        category=group.category.value,
        is_active=group.is_active,
        total_posts=group.total_posts,
        last_post_at=group.last_post_at,
    )


@router.patch("/{account_id}/groups/{group_id}", response_model=FBGroupOut)
async def update_group(
    account_id: UUID,
    group_id: UUID,
    request: FBGroupInput,
    db: DbSession,
    user: CurrentUser,
) -> FBGroupOut:
    """Update a group."""
    # Verify account ownership
    account_query = (
        select(FBAccountModel)
        .where(FBAccountModel.id == account_id)
        .where(FBAccountModel.tenant_id == user.tenant_id)
    )
    account_result = await db.execute(account_query)
    if not account_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    group = await db.get(FBAccountGroupModel, group_id)
    if not group or group.fb_account_id != account_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    group.position = request.position
    group.fb_group_id = request.fb_group_id
    group.name = request.name
    group.category = FBGroupCategory(request.category)
    group.is_active = request.is_active

    await db.commit()
    await db.refresh(group)

    return FBGroupOut(
        id=group.id,
        position=group.position,
        fb_group_id=group.fb_group_id,
        name=group.name,
        category=group.category.value,
        is_active=group.is_active,
        total_posts=group.total_posts,
        last_post_at=group.last_post_at,
    )


__all__ = ["router"]
