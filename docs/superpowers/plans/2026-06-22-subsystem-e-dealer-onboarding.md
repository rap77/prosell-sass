# Subsystem E — Dealer Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let internal staff (SUPER_ADMIN/ADMIN) create a dealer organization, pick its enabled verticals, and invite an owner (who has no account yet) — who lands on a self-service form, sets a password, and is auto-logged-in into their own org as ADMIN.

**Architecture:** New `OrganizationInvitation` entity (separate from `TeamInvitation`, no shared table). `CreateDealerOrganizationUseCase` does org+verticals+invite atomically, delegating the invite step to `InviteDealerOwnerUseCase` (also reusable for resend). `AcceptOrganizationInvitationUseCase` creates the `User`, assigns the existing `ADMIN` role, activates the org, and issues a session via an extracted `IssueUserSessionUseCase` shared with `LoginUserUseCase`.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 async + Alembic (backend), Next.js 16 + React 19 + Zustand + TanStack Query + Zod (frontend), pytest + Vitest (tests).

## Global Constraints

- TDD strict: write the failing test before any production code, for every task below.
- Conventional commits, no `Co-Authored-By`, commit after every task passes.
- Mirror existing patterns exactly where one exists — cited file:line in each task. Don't improve adjacent code.
- `DomainModel`/`Field` come from `prosell.domain.base`, never import `pydantic` directly in domain entities.
- All new endpoints reuse `Permission.DEALER_ADMIN_VIEW_ALL` (not `ORG_CREATE`) for staff actions, and the existing `_require_dealer_admin_view_all()` helper in `admin_dealers_router.py`.
- Full spec: `docs/superpowers/specs/2026-06-21-subsystem-e-dealer-onboarding-design.md` — read it before Task 1 if anything below is ambiguous.

---

## Task 1: `OrganizationInvitation` domain entity

**Files:**

- Create: `apps/api/src/prosell/domain/entities/organization_invitation.py`
- Test: `apps/api/tests/unit/domain/test_organization_invitation.py`

**Interfaces:**

- Produces: `OrganizationInvitation` (DomainModel), `OrganizationInvitationStatus` (StrEnum: `PENDING`/`ACCEPTED`/`EXPIRED`/`CANCELLED`), classmethod `OrganizationInvitation.create(organization_id: UUID, email: str, tenant_id: UUID, created_by_user_id: UUID, expires_in_days: int = 7) -> OrganizationInvitation`, methods `is_expired() -> bool`, `accept(accepted_by_user_id: UUID) -> None`, `cancel() -> None`, `mark_expired() -> None`.

Mirrors `apps/api/src/prosell/domain/entities/team_invitation.py:1-157` exactly, with two field additions (`created_by_user_id`, `accepted_by_user_id`) and `organization_id` instead of `team_id`/`role`.

- [ ] **Step 1: Write the failing tests**

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/unit/domain/test_organization_invitation.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'prosell.domain.entities.organization_invitation'`

- [ ] **Step 3: Write the implementation**

```python
"""OrganizationInvitation entity - Pure domain logic with no external dependencies."""

import secrets
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from hashlib import sha256
from uuid import UUID, uuid4

from prosell.domain.base import DomainModel, Field


class OrganizationInvitationStatus(StrEnum):
    """Organization invitation lifecycle status.

    - PENDING: Initial state when invitation is created
    - ACCEPTED: Invitee accepted and a User was created for them
    - EXPIRED: Invitation expired (7 days default)
    - CANCELLED: Invitation was cancelled by the inviting staff member
    """

    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class OrganizationInvitation(DomainModel):
    """Invitation for a new dealer owner to claim an Organization staff created."""

    id: UUID
    organization_id: UUID
    email: str = Field(..., min_length=1, max_length=255)
    token: str = Field(..., min_length=64, max_length=64)  # SHA256 hash
    expires_at: datetime
    status: OrganizationInvitationStatus = Field(default=OrganizationInvitationStatus.PENDING)
    tenant_id: UUID
    created_by_user_id: UUID
    accepted_by_user_id: UUID | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        organization_id: UUID,
        email: str,
        tenant_id: UUID,
        created_by_user_id: UUID,
        expires_in_days: int = 7,
    ) -> "OrganizationInvitation":
        """Factory method for a new dealer-owner invitation, with a secure token."""
        random_token = secrets.token_urlsafe(32)
        token_hash = sha256(random_token.encode()).hexdigest()

        now = datetime.now(UTC)
        return cls(
            id=uuid4(),
            organization_id=organization_id,
            email=email.lower().strip(),
            token=token_hash,
            expires_at=now + timedelta(days=expires_in_days),
            status=OrganizationInvitationStatus.PENDING,
            tenant_id=tenant_id,
            created_by_user_id=created_by_user_id,
            accepted_by_user_id=None,
            created_at=now,
            updated_at=now,
        )

    def is_expired(self) -> bool:
        """Check if the invitation's expiry has passed."""
        return datetime.now(UTC) > self.expires_at

    def accept(self, accepted_by_user_id: UUID) -> None:
        """Accept the invitation.

        Raises:
            ValueError: If invitation is expired or already accepted.
        """
        if self.is_expired():
            raise ValueError("Cannot accept expired invitation")
        if self.status == OrganizationInvitationStatus.ACCEPTED:
            raise ValueError("Invitation already accepted")

        self.status = OrganizationInvitationStatus.ACCEPTED
        self.accepted_by_user_id = accepted_by_user_id
        self.updated_at = datetime.now(UTC)

    def cancel(self) -> None:
        """Cancel the invitation.

        Raises:
            ValueError: If invitation was already accepted.
        """
        if self.status == OrganizationInvitationStatus.ACCEPTED:
            raise ValueError("Cannot cancel accepted invitation")

        self.status = OrganizationInvitationStatus.CANCELLED
        self.updated_at = datetime.now(UTC)

    def mark_expired(self) -> None:
        """Mark the invitation as expired."""
        self.status = OrganizationInvitationStatus.EXPIRED
        self.updated_at = datetime.now(UTC)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/unit/domain/test_organization_invitation.py -v`
Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/domain/entities/organization_invitation.py apps/api/tests/unit/domain/test_organization_invitation.py
git commit -m "feat(api): add OrganizationInvitation domain entity"
```

---

## Task 2: Wire `Organization.created_by_user_id`

**Files:**

- Modify: `apps/api/src/prosell/domain/entities/organization.py:11-80`
- Test: `apps/api/tests/unit/domain/test_organization.py` (create if it doesn't exist; check first with `fd test_organization.py apps/api/tests`)

**Interfaces:**

- Consumes: nothing new.
- Produces: `Organization.created_by_user_id: UUID | None` field; `Organization.create(name, tenant_id, creator_id=None)` (the existing `_creator_id` param is renamed to `creator_id` and actually stored, instead of being accepted-and-discarded).

The entity already has a `_creator_id: UUID | None = None` param marked `# Reserved for audit trail (unused)` at `organization.py:54` — this task finishes wiring it instead of adding new logic from scratch.

- [ ] **Step 1: Write the failing test**

```python
"""Tests for Organization entity."""

from uuid import uuid4

from prosell.domain.entities.organization import Organization


def test_create_stores_creator_id():
    creator_id = uuid4()
    tenant_id = uuid4()

    org = Organization.create(name="Acme Motors", tenant_id=tenant_id, creator_id=creator_id)

    assert org.created_by_user_id == creator_id


def test_create_allows_no_creator_id():
    org = Organization.create(name="Acme Motors", tenant_id=uuid4())
    assert org.created_by_user_id is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/unit/domain/test_organization.py -v`
Expected: FAIL — `TypeError: Organization.create() got an unexpected keyword argument 'creator_id'` (or `AttributeError` on `created_by_user_id` if the kwarg happens to match `_creator_id` positionally — either way, fails before the fix)

- [ ] **Step 3: Implement**

In `organization.py`, add the field near `setup_complete` (line 40):

```python
    # Onboarding
    setup_complete: bool = False
    created_by_user_id: UUID | None = None  # Staff who created this org (audit trail)
```

Replace the `create()` classmethod (lines 49-80):

```python
    @classmethod
    def create(
        cls,
        name: str,
        tenant_id: UUID,
        creator_id: UUID | None = None,
    ) -> "Organization":
        """
        Factory method for new organization creation.

        Creates a new organization in PENDING_VERIFICATION status.
        The tenant_id is the same as the organization id (self-referential).

        Args:
            name: Organization name
            tenant_id: Unique tenant identifier (same as org id for multi-tenant)
            creator_id: User ID who created the org (for audit trail)

        Returns:
            New Organization entity
        """
        return cls(
            id=tenant_id,  # Self-referential: org_id == tenant_id
            name=name,
            tenant_id=tenant_id,
            status=OrganizationStatus.PENDING_VERIFICATION,
            verified_at=None,
            verified_by=None,
            wallet_id=None,
            created_by_user_id=creator_id,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && uv run pytest tests/unit/domain/test_organization.py -v`
Expected: 2 passed

- [ ] **Step 5: Run the full existing Organization test suite to confirm no regression**

Run: `cd apps/api && uv run pytest tests/ -k organization -v`
Expected: all pass (no caller passed positional `_creator_id` before, since it was unused — check with `rg "_creator_id|Organization.create\("  apps/api/src apps/api/tests` if any test fails unexpectedly)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/prosell/domain/entities/organization.py apps/api/tests/unit/domain/test_organization.py
git commit -m "feat(api): wire Organization.created_by_user_id (was reserved, unused)"
```

---

## Task 3: Extend `User.create()` with `tenant_id` and `pre_verified`

**Files:**

- Modify: `apps/api/src/prosell/domain/entities/user.py:66-99`
- Test: `apps/api/tests/unit/domain/test_user.py` (check first with `fd test_user.py apps/api/tests` — append if it exists)

**Interfaces:**

- Produces: `User.create(email, password_hash, full_name, tenant_id: UUID | None = None, pre_verified: bool = False) -> User`. Defaults preserve every existing caller's behavior exactly (`tenant_id=None`, `status=PENDING_VERIFICATION`, `email_verified=False`).

- [ ] **Step 1: Write the failing tests**

```python
def test_create_default_behavior_unchanged():
    user = User.create(email="a@b.com", password_hash="hash", full_name="A B")
    assert user.tenant_id is None
    assert user.status == UserStatus.PENDING_VERIFICATION
    assert user.email_verified is False


def test_create_pre_verified_with_tenant_id():
    from uuid import uuid4

    tenant_id = uuid4()
    user = User.create(
        email="owner@dealer.com",
        password_hash="hash",
        full_name="Owner Name",
        tenant_id=tenant_id,
        pre_verified=True,
    )
    assert user.tenant_id == tenant_id
    assert user.status == UserStatus.ACTIVE
    assert user.email_verified is True
    assert user.email_verified_at is not None
```

Add these to the existing `test_user.py` (if it exists) preserving its imports, or create it with:

```python
from prosell.domain.entities.user import User, UserStatus
```

at the top.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/unit/domain/test_user.py -v -k pre_verified`
Expected: FAIL — `TypeError: User.create() got an unexpected keyword argument 'tenant_id'`

- [ ] **Step 3: Implement**

Replace `User.create()` (lines 66-99 of `user.py`):

```python
    @classmethod
    def create(
        cls,
        email: str,
        password_hash: str,
        full_name: str,
        tenant_id: UUID | None = None,
        pre_verified: bool = False,
    ) -> "User":
        """
        Factory method for new user registration.

        By default creates a new user in PENDING_VERIFICATION status with no
        tenant (the public /auth/register flow). Pass `tenant_id` and
        `pre_verified=True` for a user created via an already-verified path
        (e.g. accepting an organization invitation) — skips the
        PENDING_VERIFICATION/email-verification step entirely.
        """
        now = datetime.now(UTC)
        return cls(
            id=uuid4(),
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            avatar_url=None,
            status=UserStatus.ACTIVE if pre_verified else UserStatus.PENDING_VERIFICATION,
            email_verified=pre_verified,
            email_verified_at=now if pre_verified else None,
            is_2fa_enabled=False,
            totp_secret=None,
            backup_codes=None,
            last_login_at=None,
            last_login_ip=None,
            failed_login_attempts=0,
            locked_until=None,
            tenant_id=tenant_id,
            created_at=now,
            updated_at=now,
            deleted_at=None,
            roles=None,
        )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/unit/domain/test_user.py -v`
Expected: all pass, including the 2 new ones

- [ ] **Step 5: Run the full User + RegisterUserUseCase test suites to confirm no regression**

Run: `cd apps/api && uv run pytest tests/ -k "user or register" -v`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/prosell/domain/entities/user.py apps/api/tests/unit/domain/test_user.py
git commit -m "feat(api): extend User.create() with tenant_id + pre_verified kwargs"
```

---

## Task 4: `organization_invitations` table — migration, ORM model, repository

**Files:**

- Create: `apps/api/alembic/versions/<new_revision>_add_organization_invitations_table.py`
- Modify: `apps/api/src/prosell/infrastructure/models/organization_model.py` (add `OrganizationInvitationModel`, or create a sibling `organization_invitation_model.py` if `organization_model.py` only holds `OrganizationModel` — check first with `rg "^class" apps/api/src/prosell/infrastructure/models/organization_model.py`)
- Create: `apps/api/src/prosell/domain/repositories/organization_invitation_repository.py`
- Create: `apps/api/src/prosell/infrastructure/repositories/organization_invitation_repository_impl.py`
- Test: `apps/api/tests/integration/repositories/test_organization_invitation_repository.py`

**Interfaces:**

- Produces: `AbstractOrganizationInvitationRepository` with `create`, `get_by_id`, `get_by_token`, `get_pending_by_org_and_email`, `update`, `count`. `SqlAlchemyOrganizationInvitationRepository` implementing it. `OrganizationInvitationModel` ORM class, table `organization_invitations`.

Mirrors `team_invitation_repository.py`/`team_invitation_repository_impl.py`/`TeamInvitationModel` (`team_model.py:12-55`) exactly, minus `get_by_team`/`get_by_email`/`delete` (not needed — no endpoint deletes or lists by raw email), plus the partial unique index from the design doc.

- [ ] **Step 1: Find the current Alembic head revision**

Run: `cd apps/api && uv run alembic heads`
Note the revision id — use it as `down_revision` below.

- [ ] **Step 2: Write the failing integration test**

```python
"""Integration tests for SqlAlchemyOrganizationInvitationRepository."""

from uuid import uuid4

import pytest

from prosell.domain.entities.organization_invitation import OrganizationInvitation
from prosell.infrastructure.repositories.organization_invitation_repository_impl import (
    SqlAlchemyOrganizationInvitationRepository,
)


@pytest.mark.asyncio
async def test_create_and_get_by_id(db_session):
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    org_id, tenant_id, staff_id = uuid4(), uuid4(), uuid4()
    invitation = OrganizationInvitation.create(
        organization_id=org_id, email="owner@x.com", tenant_id=tenant_id, created_by_user_id=staff_id
    )

    created = await repo.create(invitation)
    fetched = await repo.get_by_id(created.id, tenant_id)

    assert fetched is not None
    assert fetched.email == "owner@x.com"
    assert fetched.organization_id == org_id


@pytest.mark.asyncio
async def test_get_by_token(db_session):
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    tenant_id = uuid4()
    invitation = OrganizationInvitation.create(
        organization_id=uuid4(), email="owner@x.com", tenant_id=tenant_id, created_by_user_id=uuid4()
    )
    created = await repo.create(invitation)

    fetched = await repo.get_by_token(created.token, tenant_id)

    assert fetched is not None
    assert fetched.id == created.id


@pytest.mark.asyncio
async def test_get_by_token_unscoped_finds_invitation_regardless_of_tenant(db_session):
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    invitation = OrganizationInvitation.create(
        organization_id=uuid4(), email="owner@x.com", tenant_id=uuid4(), created_by_user_id=uuid4()
    )
    created = await repo.create(invitation)

    fetched = await repo.get_by_token_unscoped(created.token)

    assert fetched is not None
    assert fetched.id == created.id


@pytest.mark.asyncio
async def test_get_pending_by_org_and_email_returns_none_when_absent(db_session):
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    result = await repo.get_pending_by_org_and_email(uuid4(), "nobody@x.com", uuid4())
    assert result is None


@pytest.mark.asyncio
async def test_update_persists_status_change(db_session):
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    tenant_id, staff_id = uuid4(), uuid4()
    invitation = OrganizationInvitation.create(
        organization_id=uuid4(), email="owner@x.com", tenant_id=tenant_id, created_by_user_id=staff_id
    )
    created = await repo.create(invitation)

    created.accept(staff_id)
    await repo.update(created)

    fetched = await repo.get_by_id(created.id, tenant_id)
    assert fetched is not None
    assert fetched.status.value == "accepted"
    assert fetched.accepted_by_user_id == staff_id
```

Check `apps/api/tests/integration/repositories/` for an existing test's `db_session` fixture (likely from a shared `conftest.py` in that directory or `tests/integration/conftest.py`) and match its import/usage exactly — do not invent a new fixture.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/integration/repositories/test_organization_invitation_repository.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Write the migration**

```python
"""add organization_invitations table

Revision ID: <generate with: uv run alembic revision --autogenerate -m "x" then take the id>
Revises: <head from Step 1>
Create Date: 2026-06-22 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "<fill in>"
down_revision: str | Sequence[str] | None = "<fill in from Step 1>"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "organization_invitations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=False),
        sa.Column("accepted_by_user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default="now()", nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default="now()",
            onupdate="now()",
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )

    op.create_index(
        op.f("ix_organization_invitations_organization_id"),
        "organization_invitations",
        ["organization_id"],
        unique=False,
        if_not_exists=True,
    )
    op.create_index(
        op.f("ix_organization_invitations_tenant_id"),
        "organization_invitations",
        ["tenant_id"],
        unique=False,
        if_not_exists=True,
    )
    # Partial unique index: only one PENDING invitation per (org, email) at a
    # time — stricter than team_invitations, which has no such constraint.
    op.create_index(
        "ux_organization_invitations_org_email_pending",
        "organization_invitations",
        ["organization_id", "email"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_index("ux_organization_invitations_org_email_pending", table_name="organization_invitations")
    op.drop_index(
        op.f("ix_organization_invitations_tenant_id"), table_name="organization_invitations"
    )
    op.drop_index(
        op.f("ix_organization_invitations_organization_id"), table_name="organization_invitations"
    )
    op.drop_table("organization_invitations")
```

Run: `cd apps/api && uv run alembic upgrade head` to apply it against the local test DB.

- [ ] **Step 5: Write the ORM model**

Check `rg "^class" apps/api/src/prosell/infrastructure/models/organization_model.py` first. Add to that file (or create `organization_invitation_model.py` importing the same `Base` if the existing file is already large — follow whichever the check shows is the established convention for this directory):

```python
class OrganizationInvitationModel(Base):
    """SQLAlchemy model for organization_invitations table."""

    __tablename__ = "organization_invitations"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    created_by_user_id: Mapped[UUID] = mapped_column(nullable=False)
    accepted_by_user_id: Mapped[UUID | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", onupdate=text("now()"), nullable=False
    )
```

Add the matching imports (`Mapped`, `mapped_column`, `ForeignKey`, `String`, `DateTime`, `text`, `UUID`, `datetime`) at the top if not already present in the file you're editing.

- [ ] **Step 6: Write the repository interface**

```python
"""Organization invitation repository interface."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.organization_invitation import OrganizationInvitation


class AbstractOrganizationInvitationRepository(ABC):
    """Repository interface for OrganizationInvitation entities."""

    @abstractmethod
    async def create(self, invitation: OrganizationInvitation) -> OrganizationInvitation:
        """Create a new organization invitation."""

    @abstractmethod
    async def get_by_id(
        self, invitation_id: UUID, tenant_id: UUID
    ) -> OrganizationInvitation | None:
        """Get invitation by ID (with tenant isolation)."""

    @abstractmethod
    async def get_by_token(self, token: str, tenant_id: UUID) -> OrganizationInvitation | None:
        """Get invitation by token (with tenant isolation)."""

    @abstractmethod
    async def get_by_token_unscoped(self, token: str) -> OrganizationInvitation | None:
        """Get invitation by token with NO tenant filter.

        Used only by the public accept-invitation flow (Task 10), where the
        caller does not yet know which tenant the token belongs to — that's
        precisely what this lookup determines, before any tenant-scoped
        work can happen.
        """

    @abstractmethod
    async def get_pending_by_org_and_email(
        self, organization_id: UUID, email: str, tenant_id: UUID
    ) -> OrganizationInvitation | None:
        """Get the pending invitation for an org+email pair, if any."""

    @abstractmethod
    async def update(self, invitation: OrganizationInvitation) -> OrganizationInvitation:
        """Update an existing invitation."""

    @abstractmethod
    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count total invitations."""
```

- [ ] **Step 7: Write the SQLAlchemy implementation**

```python
"""SQLAlchemy implementation of OrganizationInvitation repository."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.organization_invitation import (
    OrganizationInvitation,
    OrganizationInvitationStatus,
)
from prosell.domain.repositories.organization_invitation_repository import (
    AbstractOrganizationInvitationRepository,
)
from prosell.infrastructure.models.organization_model import OrganizationInvitationModel


class SqlAlchemyOrganizationInvitationRepository(AbstractOrganizationInvitationRepository):
    """SQLAlchemy implementation of OrganizationInvitationRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, invitation: OrganizationInvitation) -> OrganizationInvitation:
        model = OrganizationInvitationModel(
            id=invitation.id,
            organization_id=invitation.organization_id,
            email=invitation.email,
            token=invitation.token,
            expires_at=invitation.expires_at,
            status=invitation.status.value,
            tenant_id=invitation.tenant_id,
            created_by_user_id=invitation.created_by_user_id,
            accepted_by_user_id=invitation.accepted_by_user_id,
            created_at=invitation.created_at,
            updated_at=invitation.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(
        self, invitation_id: UUID, tenant_id: UUID
    ) -> OrganizationInvitation | None:
        stmt = select(OrganizationInvitationModel).where(
            OrganizationInvitationModel.id == invitation_id,
            OrganizationInvitationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_token(self, token: str, tenant_id: UUID) -> OrganizationInvitation | None:
        stmt = select(OrganizationInvitationModel).where(
            OrganizationInvitationModel.token == token,
            OrganizationInvitationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_token_unscoped(self, token: str) -> OrganizationInvitation | None:
        stmt = select(OrganizationInvitationModel).where(
            OrganizationInvitationModel.token == token
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_pending_by_org_and_email(
        self, organization_id: UUID, email: str, tenant_id: UUID
    ) -> OrganizationInvitation | None:
        stmt = select(OrganizationInvitationModel).where(
            OrganizationInvitationModel.organization_id == organization_id,
            OrganizationInvitationModel.email == email.lower(),
            OrganizationInvitationModel.tenant_id == tenant_id,
            OrganizationInvitationModel.status == "pending",
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def update(self, invitation: OrganizationInvitation) -> OrganizationInvitation:
        stmt = select(OrganizationInvitationModel).where(
            OrganizationInvitationModel.id == invitation.id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            raise ValueError(f"Invitation not found: {invitation.id}")

        model.status = invitation.status.value
        model.accepted_by_user_id = invitation.accepted_by_user_id
        model.updated_at = invitation.updated_at

        await self.session.flush()
        return self._to_entity(model)

    async def count(self, tenant_id: UUID | None = None) -> int:
        stmt = select(func.count(OrganizationInvitationModel.id))
        if tenant_id is not None:
            stmt = stmt.where(OrganizationInvitationModel.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one()

    def _to_entity(self, model: OrganizationInvitationModel) -> OrganizationInvitation:
        return OrganizationInvitation(
            id=model.id,
            organization_id=model.organization_id,
            email=model.email,
            token=model.token,
            expires_at=model.expires_at,
            status=OrganizationInvitationStatus(model.status),
            tenant_id=model.tenant_id,
            created_by_user_id=model.created_by_user_id,
            accepted_by_user_id=model.accepted_by_user_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd apps/api && uv run pytest tests/integration/repositories/test_organization_invitation_repository.py -v`
Expected: 5 passed

- [ ] **Step 9: Commit**

```bash
git add apps/api/alembic/versions/ apps/api/src/prosell/infrastructure/models/organization_model.py apps/api/src/prosell/domain/repositories/organization_invitation_repository.py apps/api/src/prosell/infrastructure/repositories/organization_invitation_repository_impl.py apps/api/tests/integration/repositories/test_organization_invitation_repository.py
git commit -m "feat(api): organization_invitations table + repository"
```

---

## Task 5: `organizations.created_by_user_id` column migration

**Files:**

- Create: `apps/api/alembic/versions/<new_revision>_add_organizations_created_by_user_id.py`
- Modify: `apps/api/src/prosell/infrastructure/models/organization_model.py`

**Interfaces:**

- Consumes: `Organization.created_by_user_id` from Task 2.
- Produces: `organizations.created_by_user_id` nullable column; `OrganizationModel.created_by_user_id: Mapped[UUID | None]`.

- [ ] **Step 1: Find current Alembic head**

Run: `cd apps/api && uv run alembic heads` (will now be Task 4's revision)

- [ ] **Step 2: Write the migration**

```python
"""add organizations.created_by_user_id

Revision ID: <fill in>
Revises: <Task 4's revision>
Create Date: 2026-06-22 00:00:01.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "<fill in>"
down_revision: str | Sequence[str] | None = "<fill in>"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "organizations", sa.Column("created_by_user_id", sa.UUID(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("organizations", "created_by_user_id")
```

- [ ] **Step 3: Add the ORM column**

In `OrganizationModel` (find with `rg "class OrganizationModel" apps/api/src/prosell/infrastructure/models/organization_model.py`), add next to its other nullable columns:

```python
    created_by_user_id: Mapped[UUID | None] = mapped_column(nullable=True)
```

- [ ] **Step 4: Verify the repository round-trips the new field**

Run: `cd apps/api && uv run alembic upgrade head`
Then: `cd apps/api && uv run pytest tests/integration/repositories/test_organization_repository.py -v` (find the real filename first with `fd test_organization_repository apps/api/tests`)
Expected: existing tests still pass (column is nullable, no existing test sets it, so `None` round-trips fine — if any assertion explicitly checks the full field set and breaks, add `created_by_user_id` to that assertion, don't change behavior)

- [ ] **Step 5: Check whether `SqlAlchemyOrganizationRepository._to_entity`/`create` already pass every `OrganizationModel` field through 1:1**

Run: `rg "created_by_user_id|_to_entity" apps/api/src/prosell/infrastructure/repositories/organization_repository_impl.py`
If `_to_entity` and `create`/`update` construct the model/entity field-by-field (not via `model_validate(model, from_attributes=True)`), add `created_by_user_id=organization.created_by_user_id` / `created_by_user_id=model.created_by_user_id` to the relevant spots, mirroring how every other field in that file is already passed through.

- [ ] **Step 6: Commit**

```bash
git add apps/api/alembic/versions/ apps/api/src/prosell/infrastructure/models/organization_model.py apps/api/src/prosell/infrastructure/repositories/organization_repository_impl.py
git commit -m "feat(api): add organizations.created_by_user_id column"
```

---

## Task 6: Extract `IssueUserSessionUseCase` from `LoginUserUseCase`

**Files:**

- Create: `apps/api/src/prosell/application/use_cases/auth/issue_user_session.py`
- Modify: `apps/api/src/prosell/application/use_cases/auth/login_user.py:144-190`
- Modify: `apps/api/src/prosell/infrastructure/api/dependencies.py` (the `get_login_user_use_case` factory)
- Test: `apps/api/tests/unit/application/test_issue_user_session.py`
- Test: existing `apps/api/tests/unit/application/test_login_user.py` (or real filename — `fd test_login_user apps/api/tests`) must still pass unchanged

**Interfaces:**

- Produces: `IssueUserSessionUseCase.execute(user: User, ip_address: str | None = None, user_agent: str | None = None) -> LoginUserResponse`. This is the exact tail of `LoginUserUseCase.execute()` (steps 8-10 of `login_user.py:144-190`), made reusable so `AcceptOrganizationInvitationUseCase` (Task 9) doesn't duplicate it.
- Consumes (injected): `AbstractUserRepository`, `IJWTService`, `AbstractSessionRepository`, `ITokenHasher` — the same 4 dependencies `LoginUserUseCase` already has, minus `IPasswordService` (not needed once past credential verification).

This is a pure refactor — `LoginUserUseCase`'s behavior must be byte-for-byte identical before and after.

- [ ] **Step 1: Write the failing test for the new use case**

```python
"""Tests for IssueUserSessionUseCase."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.auth.issue_user_session import IssueUserSessionUseCase
from prosell.domain.entities.user import User


@pytest.fixture
def user() -> User:
    return User.create(email="owner@dealer.com", password_hash="hash", full_name="Owner Name")


@pytest.fixture
def use_case() -> tuple[IssueUserSessionUseCase, MagicMock, MagicMock, AsyncMock, MagicMock]:
    user_repository = AsyncMock()
    jwt_service = MagicMock()
    jwt_service.generate_access_token.return_value = "access-token-value"
    jwt_service.generate_refresh_token.return_value = "refresh-token-value"
    session_repository = AsyncMock()
    token_hasher = MagicMock()
    token_hasher.hash.return_value = "hashed-refresh-token"

    uc = IssueUserSessionUseCase(
        user_repository=user_repository,
        jwt_service=jwt_service,
        session_repository=session_repository,
        token_hasher=token_hasher,
    )
    return uc, jwt_service, session_repository, user_repository, token_hasher


@pytest.mark.asyncio
async def test_returns_login_response_with_tokens(user, use_case):
    uc, jwt_service, session_repository, user_repository, token_hasher = use_case
    user_repository.get_user_roles.return_value = []

    result = await uc.execute(user)

    assert result.access_token == "access-token-value"
    assert result.refresh_token == "refresh-token-value"
    assert result.user.email == user.email
    assert result.requires_2fa is False


@pytest.mark.asyncio
async def test_persists_a_session(user, use_case):
    uc, jwt_service, session_repository, user_repository, token_hasher = use_case
    user_repository.get_user_roles.return_value = []

    await uc.execute(user, ip_address="1.2.3.4", user_agent="pytest")

    session_repository.create.assert_called_once()
    created_session = session_repository.create.call_args.args[0]
    assert created_session.user_id == user.id
    assert created_session.token_hash == "hashed-refresh-token"
```

Check the real fixture style in `test_login_user.py` first (`fd test_login_user apps/api/tests` then read it) and match its mocking conventions (some of this codebase's tests use `pytest-mock`'s `mocker` fixture instead of `unittest.mock` directly — mirror whichever that file uses).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/unit/application/test_issue_user_session.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
"""Issue a session (tokens + persisted Session row) for an already-authenticated user.

Extracted from LoginUserUseCase's tail end (steps 8-10) so any flow that
ends in "this user is now logged in" — password login, accepting an
organization invitation — issues a session the exact same way once.
"""

import logging

from prosell.application.dto.auth import LoginUserResponse, UserInfo
from prosell.domain.entities.session import Session
from prosell.domain.entities.user import User
from prosell.domain.ports import IJWTService, ITokenHasher
from prosell.domain.repositories.session_repository import AbstractSessionRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository

logger = logging.getLogger(__name__)


class IssueUserSessionUseCase:
    """Issue JWT tokens and persist a Session for a user who is now logged in."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
        jwt_service: IJWTService,
        session_repository: AbstractSessionRepository,
        token_hasher: ITokenHasher,
    ) -> None:
        self.user_repository = user_repository
        self.jwt_service = jwt_service
        self.session_repository = session_repository
        self.token_hasher = token_hasher

    async def execute(
        self,
        user: User,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> LoginUserResponse:
        """Generate tokens for `user` and persist a Session row for them."""
        logger.debug(f"Fetching roles for user {user.id}")
        user_roles = await self.user_repository.get_user_roles(user.id)

        name_parts = user.full_name.split(" ", 1) if user.full_name else ["", ""]
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        access_token = self.jwt_service.generate_access_token(
            user.id,
            user_roles,
            email=user.email,
            first_name=first_name,
            last_name=last_name,
        )
        refresh_token = self.jwt_service.generate_refresh_token(user.id)

        token_hash = self.token_hasher.hash(refresh_token)
        session = Session.create(
            user_id=user.id,
            token_hash=token_hash,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        await self.session_repository.create(session)
        logger.debug(f"Session created for user {user.id}")

        return LoginUserResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserInfo(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                roles=user_roles,
                tenant_id=str(user.tenant_id),
            ),
            requires_2fa=False,
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && uv run pytest tests/unit/application/test_issue_user_session.py -v`
Expected: 2 passed

- [ ] **Step 5: Refactor `LoginUserUseCase` to call it instead of duplicating**

Replace steps 8-10 + the final return in `login_user.py` (lines 144-190) with:

```python
        # 8-10. Issue tokens + persist session (extracted — see issue_user_session.py)
        logger.info(f"Login successful for user: {request.email}")
        return await self.issue_session_use_case.execute(
            user, ip_address=request.ip_address, user_agent=request.user_agent
        )
```

Update `LoginUserUseCase.__init__` (lines 24-36) to accept the new collaborator instead of constructing tokens itself:

```python
    def __init__(
        self,
        user_repository: AbstractUserRepository,
        password_service: IPasswordService,
        issue_session_use_case: "IssueUserSessionUseCase",
    ) -> None:
        self.user_repository = user_repository
        self.password_service = password_service
        self.issue_session_use_case = issue_session_use_case
```

Add the import at the top of `login_user.py`:

```python
from prosell.application.use_cases.auth.issue_user_session import IssueUserSessionUseCase
```

and remove the now-unused `IJWTService`, `AbstractSessionRepository`, `ITokenHasher`, `Session` imports from that file if nothing else in it still uses them (`rg "jwt_service|session_repository|token_hasher|Session\(" apps/api/src/prosell/application/use_cases/auth/login_user.py` to check).

- [ ] **Step 6: Update the DI factory**

In `apps/api/src/prosell/infrastructure/api/dependencies.py`, find `get_login_user_use_case` (around line 426) and the imports it relies on (`get_jwt_service`, `get_session_repository`, `get_token_hasher`). Add a new factory above it:

```python
async def get_issue_user_session_use_case(
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
    session_repository: Annotated[AbstractSessionRepository, Depends(get_session_repository)],
    token_hasher: Annotated[ITokenHasher, Depends(get_token_hasher)],
) -> IssueUserSessionUseCase:
    """Get IssueUserSession use case instance."""
    from prosell.application.use_cases.auth.issue_user_session import IssueUserSessionUseCase

    return IssueUserSessionUseCase(
        user_repository, jwt_service, session_repository, token_hasher
    )
```

Then change `get_login_user_use_case` to depend on it instead of the 4 raw collaborators:

```python
async def get_login_user_use_case(
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    password_service: Annotated[IPasswordService, Depends(get_password_service)],
    issue_session_use_case: Annotated[
        IssueUserSessionUseCase, Depends(get_issue_user_session_use_case)
    ],
) -> LoginUserUseCase:
    """Get LoginUser use case instance."""
    from prosell.application.use_cases.auth.login_user import LoginUserUseCase

    return LoginUserUseCase(user_repository, password_service, issue_session_use_case)
```

- [ ] **Step 7: Run the full auth test suite to confirm zero behavior change**

Run: `cd apps/api && uv run pytest tests/ -k "login or auth_router" -v`
Expected: all pass, identical results to before this task

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/prosell/application/use_cases/auth/issue_user_session.py apps/api/src/prosell/application/use_cases/auth/login_user.py apps/api/src/prosell/infrastructure/api/dependencies.py apps/api/tests/unit/application/test_issue_user_session.py
git commit -m "refactor(api): extract IssueUserSessionUseCase out of LoginUserUseCase"
```

---

## Task 7: `send_org_invitation` email capability

**Files:**

- Modify: `apps/api/src/prosell/domain/ports/i_email_service.py` (add abstract method)
- Modify: `apps/api/src/prosell/infrastructure/services/email/service.py:97-109` area (add `send_org_invitation`)
- Modify: `apps/api/src/prosell/infrastructure/services/email/renderer.py:65-82` area (add `render_org_invitation`)
- Create: `apps/api/src/prosell/infrastructure/services/email/templates/organization_invitation.html`
- Test: `apps/api/tests/unit/services/email/test_renderer.py` (append — confirmed this file exists from earlier exploration)
- Test: `apps/api/tests/unit/services/email/test_service.py` (check with `fd test_service.py apps/api/tests/unit/services/email` — append or create matching that directory's convention)

**Interfaces:**

- Produces: `AbstractEmailService.send_org_invitation(email: str, organization_name: str, inviter_name: str, invitation_token: str) -> Awaitable[None]`; `EmailService.send_org_invitation(...)`; `EmailTemplateRenderer.render_org_invitation(...)`.

Deliberately does NOT mirror `render_team_invitation`'s `?token=`-query-string URL (`renderer.py:73`) — that pattern is a confirmed dead link (see design doc's Audit findings). Uses `/invite/org/{token}` instead, matching Task 12's actual frontend route.

- [ ] **Step 1: Write the failing renderer test**

```python
def test_render_org_invitation_builds_correct_url():
    renderer = EmailTemplateRenderer()
    message = renderer.render_org_invitation(
        email="owner@dealer.com",
        organization_name="Acme Motors",
        inviter_name="Staff Person",
        invitation_token="tok123",
    )

    assert message.to == "owner@dealer.com"
    assert "Acme Motors" in message.subject
    assert "/invite/org/tok123" in message.html_body
    assert "?token=" not in message.html_body  # not the broken team-invite pattern
```

Add this to the existing `test_renderer.py`, matching its import style for `EmailTemplateRenderer`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && uv run pytest tests/unit/services/email/test_renderer.py -v -k org_invitation`
Expected: FAIL — `AttributeError: 'EmailTemplateRenderer' object has no attribute 'render_org_invitation'`

- [ ] **Step 3: Add the template**

```html
<p>
  {{ inviter_name }} te invitó a administrar
  <strong>{{ organization_name }}</strong>
  en ProSell.
</p>
<p><a href="{{ invitation_url }}">Aceptar invitación</a></p>
<p>Esta invitación vence en 7 días.</p>
```

- [ ] **Step 4: Add `render_org_invitation` to the renderer**

Add to `EmailTemplateRenderer`, right after `render_team_invitation` (`renderer.py:65-82`):

```python
    def render_org_invitation(
        self,
        email: str,
        organization_name: str,
        inviter_name: str,
        invitation_token: str,
    ) -> EmailMessage:
        invitation_url = f"{self._base_url()}/invite/org/{invitation_token}"
        return self._render(
            "organization_invitation.html",
            f"[ProSell] You've been invited to manage {organization_name}",
            email,
            inviter_name=inviter_name,
            organization_name=organization_name,
            invitation_url=invitation_url,
        )
```

- [ ] **Step 5: Run renderer test to verify it passes**

Run: `cd apps/api && uv run pytest tests/unit/services/email/test_renderer.py -v -k org_invitation`
Expected: 1 passed

- [ ] **Step 6: Add the port method and service implementation**

In `i_email_service.py`, add after `send_team_invitation` (end of file):

```python
    @abstractmethod
    def send_org_invitation(
        self,
        email: str,
        organization_name: str,
        inviter_name: str,
        invitation_token: str,
    ) -> Awaitable[None]:
        """Send dealer-owner organization invitation email."""
        ...
```

In `service.py`, add after `send_team_invitation` (`service.py:97-109`):

```python
    async def send_org_invitation(
        self,
        email: str,
        organization_name: str,
        inviter_name: str,
        invitation_token: str,
    ) -> None:
        await self._deliver(
            self._renderer.render_org_invitation(
                email, organization_name, inviter_name, invitation_token
            )
        )
```

- [ ] **Step 7: Write and run the service-level test**

```python
@pytest.mark.asyncio
async def test_send_org_invitation_delivers_rendered_message():
    renderer = MagicMock()
    renderer.render_org_invitation.return_value = EmailMessage(
        to="owner@dealer.com", subject="subj", html_body="<p>body</p>"
    )
    sender = AsyncMock()
    service = EmailService(renderer, sender)

    await service.send_org_invitation("owner@dealer.com", "Acme Motors", "Staff", "tok123")

    renderer.render_org_invitation.assert_called_once_with(
        "owner@dealer.com", "Acme Motors", "Staff", "tok123"
    )
    sender.send.assert_called_once()
```

Match this against whatever mocking pattern the existing `test_service.py` (or equivalent) already uses for `send_team_invitation` — copy its exact fixture setup rather than inventing a new one.

Run: `cd apps/api && uv run pytest tests/unit/services/email/ -v -k org_invitation`
Expected: 2 passed (renderer + service)

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/prosell/domain/ports/i_email_service.py apps/api/src/prosell/infrastructure/services/email/ apps/api/tests/unit/services/email/
git commit -m "feat(api): add send_org_invitation email capability"
```

---

## Task 8: `InviteDealerOwnerUseCase`

**Files:**

- Create: `apps/api/src/prosell/application/use_cases/organization/invite_dealer_owner.py`
- Test: `apps/api/tests/unit/application/test_invite_dealer_owner.py`

**Interfaces:**

- Consumes: `AbstractOrganizationInvitationRepository` (Task 4), `AbstractEmailService.send_org_invitation` (Task 7).
- Produces: `InviteDealerOwnerUseCase.execute(organization_id: UUID, organization_name: str, email: str, tenant_id: UUID, inviter_name: str, created_by_user_id: UUID) -> OrganizationInvitation`. Reused by both Task 9 (creation) and Task 11 (resend endpoint).

Mirrors the dedup logic in `invite_team_member.py:62-74` exactly: reuse a still-valid PENDING invite for the same (org, email); otherwise expire any stale PENDING one and create a new one.

- [ ] **Step 1: Write the failing tests**

```python
"""Tests for InviteDealerOwnerUseCase."""

from hashlib import sha256
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.organization.invite_dealer_owner import (
    InviteDealerOwnerUseCase,
)
from prosell.domain.entities.organization_invitation import OrganizationInvitation


@pytest.fixture
def use_case():
    invitation_repository = AsyncMock()
    email_service = AsyncMock()
    uc = InviteDealerOwnerUseCase(invitation_repository, email_service)
    return uc, invitation_repository, email_service


@pytest.mark.asyncio
async def test_creates_new_invitation_and_sends_email_when_none_pending(use_case):
    uc, invitation_repository, email_service = use_case
    invitation_repository.get_pending_by_org_and_email.return_value = None
    org_id, tenant_id, staff_id = uuid4(), uuid4(), uuid4()
    invitation_repository.create.side_effect = lambda inv: inv

    result = await uc.execute(
        organization_id=org_id,
        organization_name="Acme Motors",
        email="owner@x.com",
        tenant_id=tenant_id,
        inviter_name="Staff",
        created_by_user_id=staff_id,
    )

    assert result.organization_id == org_id
    invitation_repository.create.assert_called_once()
    email_service.send_org_invitation.assert_called_once()


@pytest.mark.asyncio
async def test_reuses_existing_unexpired_pending_invitation_with_a_fresh_token(use_case):
    uc, invitation_repository, email_service = use_case
    org_id, tenant_id, staff_id = uuid4(), uuid4(), uuid4()
    existing = OrganizationInvitation.create(
        organization_id=org_id, email="owner@x.com", tenant_id=tenant_id, created_by_user_id=staff_id
    )
    stale_token_hash = existing.token
    invitation_repository.get_pending_by_org_and_email.return_value = existing

    result = await uc.execute(
        organization_id=org_id,
        organization_name="Acme Motors",
        email="owner@x.com",
        tenant_id=tenant_id,
        inviter_name="Staff",
        created_by_user_id=staff_id,
    )

    assert result.id == existing.id
    # Same row reused, but with a freshly-issued token — the original raw
    # token was never persisted anywhere, so resending must always reissue.
    assert existing.token != stale_token_hash
    invitation_repository.create.assert_not_called()
    invitation_repository.update.assert_called_once()
    email_service.send_org_invitation.assert_called_once()
    sent_token = email_service.send_org_invitation.call_args.kwargs["invitation_token"]
    assert sha256(sent_token.encode()).hexdigest() == existing.token


@pytest.mark.asyncio
async def test_expires_stale_pending_invitation_and_creates_new_one(use_case):
    uc, invitation_repository, email_service = use_case
    org_id, tenant_id, staff_id = uuid4(), uuid4(), uuid4()
    stale = OrganizationInvitation.create(
        organization_id=org_id,
        email="owner@x.com",
        tenant_id=tenant_id,
        created_by_user_id=staff_id,
        expires_in_days=-1,
    )
    invitation_repository.get_pending_by_org_and_email.return_value = stale
    invitation_repository.create.side_effect = lambda inv: inv

    result = await uc.execute(
        organization_id=org_id,
        organization_name="Acme Motors",
        email="owner@x.com",
        tenant_id=tenant_id,
        inviter_name="Staff",
        created_by_user_id=staff_id,
    )

    invitation_repository.update.assert_called_once()
    assert stale.status.value == "expired"
    assert result.id != stale.id
    invitation_repository.create.assert_called_once()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/unit/application/test_invite_dealer_owner.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
"""Invite (or resend an invitation to) a dealer organization's owner."""

from uuid import UUID

import secrets
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from uuid import UUID, uuid4

from prosell.domain.entities.organization_invitation import (
    OrganizationInvitation,
    OrganizationInvitationStatus,
)
from prosell.domain.ports.i_email_service import AbstractEmailService
from prosell.domain.repositories.organization_invitation_repository import (
    AbstractOrganizationInvitationRepository,
)


class InviteDealerOwnerUseCase:
    """Create-or-reuse a pending OrganizationInvitation and email it.

    Called both at dealer-org creation time and by the standalone resend
    endpoint — kept as its own use case so a lost/expired invite email has a
    recovery path that doesn't require recreating the organization.

    Does NOT use `OrganizationInvitation.create()` for new invitations:
    that factory hashes its token immediately and discards the raw value,
    so nothing could ever email a usable link. `invite_team_member.py:79-92`
    has the exact same constraint and solves it the same way — generate the
    raw token here, hash it for storage, keep the raw value in a local
    variable long enough to email it.
    """

    def __init__(
        self,
        invitation_repository: AbstractOrganizationInvitationRepository,
        email_service: AbstractEmailService,
    ) -> None:
        self.invitation_repository = invitation_repository
        self.email_service = email_service

    @staticmethod
    def _generate_token() -> tuple[str, str]:
        """Generate a (raw_token, token_hash) pair. Raw goes in the email link;
        only the hash is ever persisted — mirrors invite_team_member.py."""
        raw_token = secrets.token_urlsafe(32)
        return raw_token, sha256(raw_token.encode()).hexdigest()

    def _new_invitation(
        self, organization_id: UUID, email: str, tenant_id: UUID, created_by_user_id: UUID
    ) -> tuple[OrganizationInvitation, str]:
        """Build a PENDING invitation entity + the raw token for its email link."""
        raw_token, token_hash = self._generate_token()
        now = datetime.now(UTC)
        invitation = OrganizationInvitation(
            id=uuid4(),
            organization_id=organization_id,
            email=email.lower().strip(),
            token=token_hash,
            expires_at=now + timedelta(days=7),
            status=OrganizationInvitationStatus.PENDING,
            tenant_id=tenant_id,
            created_by_user_id=created_by_user_id,
            accepted_by_user_id=None,
            created_at=now,
            updated_at=now,
        )
        return invitation, raw_token

    async def execute(
        self,
        organization_id: UUID,
        organization_name: str,
        email: str,
        tenant_id: UUID,
        inviter_name: str,
        created_by_user_id: UUID,
    ) -> OrganizationInvitation:
        existing = await self.invitation_repository.get_pending_by_org_and_email(
            organization_id=organization_id, email=email, tenant_id=tenant_id
        )

        if existing is not None and not existing.is_expired():
            # Reusing an existing pending invitation — we don't have its raw
            # token (only the stored hash), so we cannot re-send the exact
            # same link. Issue a fresh token for the same invitation row
            # instead of silently resending an un-sendable one.
            raw_token, token_hash = self._generate_token()
            existing.token = token_hash
            existing.updated_at = datetime.now(UTC)
            await self.invitation_repository.update(existing)
            invitation, send_token = existing, raw_token
        else:
            if existing is not None:
                existing.mark_expired()
                await self.invitation_repository.update(existing)
            new_invitation, raw_token = self._new_invitation(
                organization_id, email, tenant_id, created_by_user_id
            )
            invitation = await self.invitation_repository.create(new_invitation)
            send_token = raw_token

        # Not caught — propagates to roll back the caller's transaction when
        # called from CreateDealerOrganizationUseCase (Task 9). Consistent
        # with invite_team_member.py, which has the same non-handling.
        await self.email_service.send_org_invitation(
            email=invitation.email,
            organization_name=organization_name,
            inviter_name=inviter_name,
            invitation_token=send_token,
        )

        return invitation
```

This also fixes a second latent issue the same root cause would have caused: reusing an existing PENDING invitation (the "already invited, not expired" branch) needs a _resend_ path too, not just a reuse-the-row path — since the original raw token was never persisted anywhere, the old email's link is the only copy that ever existed. Issuing a fresh token for the same row on every resend (rather than trying to recover the old one) is the only option, and it's what the test in Step 4 below checks for.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/unit/application/test_invite_dealer_owner.py -v`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/application/use_cases/organization/invite_dealer_owner.py apps/api/tests/unit/application/test_invite_dealer_owner.py
git commit -m "feat(api): add InviteDealerOwnerUseCase"
```

---

## Task 9: `CreateDealerOrganizationUseCase`

**Files:**

- Create: `apps/api/src/prosell/application/use_cases/organization/create_dealer_organization.py`
- Test: `apps/api/tests/unit/application/test_create_dealer_organization.py`

**Interfaces:**

- Consumes: `AbstractOrganizationRepository` (existing), `AbstractOrganizationVerticalRepository.enable()` (existing, `organization_vertical_repository.py:13`), `AbstractUserRepository.get_by_email()` (existing, for the email-registered check), `InviteDealerOwnerUseCase` (Task 8).
- Produces: `CreateDealerOrganizationUseCase.execute(name: str, vertical_ids: list[UUID], owner_email: str, inviter_name: str, created_by_user_id: UUID) -> OrganizationInvitation`. Raises `ValueError` for: empty `vertical_ids`, `owner_email` already registered (active, non-deleted).

- [ ] **Step 1: Confirm `AbstractUserRepository.get_by_email()` excludes soft-deleted users by default**

Run: `rg -n "async def get_by_email" -A 10 apps/api/src/prosell/infrastructure/repositories/user_repository_impl.py`
If the query does NOT already filter `deleted_at IS NULL`, note this for Step 3 below — the use case will need to check `user.deleted_at is None` explicitly after fetching, rather than assuming the repository already excludes soft-deleted rows.

- [ ] **Step 2: Write the failing tests**

```python
"""Tests for CreateDealerOrganizationUseCase."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.organization.create_dealer_organization import (
    CreateDealerOrganizationUseCase,
)
from prosell.domain.entities.organization_invitation import OrganizationInvitation


@pytest.fixture
def use_case():
    org_repository = AsyncMock()
    vertical_repository = AsyncMock()
    user_repository = AsyncMock()
    invite_use_case = AsyncMock()
    uc = CreateDealerOrganizationUseCase(
        org_repository, vertical_repository, user_repository, invite_use_case
    )
    return uc, org_repository, vertical_repository, user_repository, invite_use_case


@pytest.mark.asyncio
async def test_raises_when_no_verticals_given(use_case):
    uc, *_ = use_case
    with pytest.raises(ValueError, match="vertical"):
        await uc.execute(
            name="Acme Motors",
            vertical_ids=[],
            owner_email="owner@x.com",
            inviter_name="Staff",
            created_by_user_id=uuid4(),
        )


@pytest.mark.asyncio
async def test_raises_when_owner_email_already_registered(use_case):
    uc, org_repository, vertical_repository, user_repository, invite_use_case = use_case
    existing_user = AsyncMock(deleted_at=None)
    user_repository.get_by_email.return_value = existing_user

    with pytest.raises(ValueError, match="already registered"):
        await uc.execute(
            name="Acme Motors",
            vertical_ids=[uuid4()],
            owner_email="owner@x.com",
            inviter_name="Staff",
            created_by_user_id=uuid4(),
        )


@pytest.mark.asyncio
async def test_allows_email_that_belongs_only_to_a_soft_deleted_user(use_case):
    uc, org_repository, vertical_repository, user_repository, invite_use_case = use_case
    deleted_user = AsyncMock(deleted_at="2026-01-01T00:00:00Z")
    user_repository.get_by_email.return_value = deleted_user
    org_repository.create.side_effect = lambda org: org
    invite_use_case.execute.return_value = OrganizationInvitation.create(
        organization_id=uuid4(), email="owner@x.com", tenant_id=uuid4(), created_by_user_id=uuid4()
    )

    await uc.execute(
        name="Acme Motors",
        vertical_ids=[uuid4()],
        owner_email="owner@x.com",
        inviter_name="Staff",
        created_by_user_id=uuid4(),
    )

    org_repository.create.assert_called_once()


@pytest.mark.asyncio
async def test_happy_path_creates_org_enables_verticals_and_invites_owner(use_case):
    uc, org_repository, vertical_repository, user_repository, invite_use_case = use_case
    user_repository.get_by_email.return_value = None
    org_repository.create.side_effect = lambda org: org
    staff_id = uuid4()
    vertical_ids = [uuid4(), uuid4()]
    invite_use_case.execute.return_value = OrganizationInvitation.create(
        organization_id=uuid4(), email="owner@x.com", tenant_id=uuid4(), created_by_user_id=staff_id
    )

    result = await uc.execute(
        name="Acme Motors",
        vertical_ids=vertical_ids,
        owner_email="Owner@X.com",
        inviter_name="Staff",
        created_by_user_id=staff_id,
    )

    org_repository.create.assert_called_once()
    created_org = org_repository.create.call_args.args[0]
    assert created_org.name == "Acme Motors"
    assert created_org.created_by_user_id == staff_id

    assert vertical_repository.enable.call_count == 2
    enabled_root_ids = {call.kwargs["root_category_id"] for call in vertical_repository.enable.call_args_list}
    assert enabled_root_ids == set(vertical_ids)

    invite_use_case.execute.assert_called_once()
    invite_call_kwargs = invite_use_case.execute.call_args.kwargs
    assert invite_call_kwargs["email"] == "owner@x.com"  # lowercased before passing through
    assert result is invite_use_case.execute.return_value
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/unit/application/test_create_dealer_organization.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Write the implementation**

```python
"""Create a dealer organization: org + enabled verticals + owner invitation, atomically."""

from uuid import UUID, uuid4

from prosell.application.use_cases.organization.invite_dealer_owner import (
    InviteDealerOwnerUseCase,
)
from prosell.domain.entities.organization import Organization
from prosell.domain.entities.organization_invitation import OrganizationInvitation
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.organization_vertical_repository import (
    AbstractOrganizationVerticalRepository,
)
from prosell.domain.repositories.user_repository import AbstractUserRepository


class CreateDealerOrganizationUseCase:
    """Staff-only: create a new dealer org, enable its verticals, invite its owner.

    Caller (the router) is responsible for wrapping this in a DB transaction
    so a failure at any step — including email delivery inside
    InviteDealerOwnerUseCase — rolls back the org and vertical rows too.
    """

    def __init__(
        self,
        organization_repository: AbstractOrganizationRepository,
        vertical_repository: AbstractOrganizationVerticalRepository,
        user_repository: AbstractUserRepository,
        invite_dealer_owner_use_case: InviteDealerOwnerUseCase,
    ) -> None:
        self.organization_repository = organization_repository
        self.vertical_repository = vertical_repository
        self.user_repository = user_repository
        self.invite_dealer_owner_use_case = invite_dealer_owner_use_case

    async def execute(
        self,
        name: str,
        vertical_ids: list[UUID],
        owner_email: str,
        inviter_name: str,
        created_by_user_id: UUID,
    ) -> OrganizationInvitation:
        if not vertical_ids:
            raise ValueError("At least one vertical must be selected")

        normalized_email = owner_email.lower().strip()
        existing_user = await self.user_repository.get_by_email(normalized_email)
        if existing_user is not None and existing_user.deleted_at is None:
            raise ValueError("owner_email is already registered")

        tenant_id = uuid4()
        organization = Organization.create(
            name=name, tenant_id=tenant_id, creator_id=created_by_user_id
        )
        organization = await self.organization_repository.create(organization)

        for root_category_id in vertical_ids:
            await self.vertical_repository.enable(
                organization_id=organization.id, root_category_id=root_category_id
            )

        return await self.invite_dealer_owner_use_case.execute(
            organization_id=organization.id,
            organization_name=organization.name,
            email=normalized_email,
            tenant_id=tenant_id,
            inviter_name=inviter_name,
            created_by_user_id=created_by_user_id,
        )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/unit/application/test_create_dealer_organization.py -v`
Expected: 4 passed

- [ ] **Step 6: Confirm `AbstractOrganizationRepository.create()`'s real signature matches this call**

Run: `rg -n "async def create" apps/api/src/prosell/domain/repositories/organization_repository.py`
If it takes additional required args beyond the entity, adjust the call in Step 4 accordingly and re-run Step 5.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/prosell/application/use_cases/organization/create_dealer_organization.py apps/api/tests/unit/application/test_create_dealer_organization.py
git commit -m "feat(api): add CreateDealerOrganizationUseCase"
```

---

## Task 10: `AcceptOrganizationInvitationUseCase`

**Files:**

- Create: `apps/api/src/prosell/application/use_cases/organization/accept_organization_invitation.py`
- Test: `apps/api/tests/unit/application/test_accept_organization_invitation.py`

**Interfaces:**

- Consumes: `AbstractOrganizationInvitationRepository` (Task 4), `AbstractOrganizationRepository` (existing), `AbstractUserRepository` (existing), `AbstractRoleRepository.get_by_type`/`assign_role_to_user` (existing, `role_repository.py:42-73`), `IPasswordService.hash_password` (existing), `IssueUserSessionUseCase` (Task 6).
- Produces: `AcceptOrganizationInvitationUseCase.execute(token: str, password: str, first_name: str, last_name: str, ip_address: str | None = None, user_agent: str | None = None) -> LoginUserResponse`. Raises `ValueError` for: invalid token, expired (marks `EXPIRED` first), already accepted.

Error-handling order mirrors `accept_team_invitation.py:59-67` exactly: hash token → look up → expired check (mark + persist + raise) → already-accepted check → proceed.

- [ ] **Step 1: Write the failing tests**

```python
"""Tests for AcceptOrganizationInvitationUseCase."""

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
        expires_at=__import__("datetime").datetime.now(__import__("datetime").UTC)
        + __import__("datetime").timedelta(days=7),
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
    collaborators["invitation_repository"].get_by_token.return_value = None
    with pytest.raises(ValueError, match="Invalid invitation token"):
        await use_case.execute(
            token="nope", password="Aa1!aaaa", first_name="A", last_name="B"
        )


@pytest.mark.asyncio
async def test_raises_and_marks_expired_for_expired_invitation(use_case, collaborators):
    org_id, tenant_id = uuid4(), uuid4()
    raw_token, invitation = _raw_token_and_invitation(org_id, tenant_id)
    invitation.expires_at = __import__("datetime").datetime.now(
        __import__("datetime").UTC
    ) - __import__("datetime").timedelta(days=1)
    collaborators["invitation_repository"].get_by_token.return_value = invitation

    with pytest.raises(ValueError, match="expired"):
        await use_case.execute(
            token=raw_token, password="Aa1!aaaa", first_name="A", last_name="B"
        )

    collaborators["invitation_repository"].update.assert_called_once()
    assert invitation.status.value == "expired"


@pytest.mark.asyncio
async def test_raises_for_already_accepted_invitation(use_case, collaborators):
    org_id, tenant_id = uuid4(), uuid4()
    raw_token, invitation = _raw_token_and_invitation(org_id, tenant_id)
    invitation.accept(uuid4())
    collaborators["invitation_repository"].get_by_token.return_value = invitation

    with pytest.raises(ValueError, match="already accepted"):
        await use_case.execute(
            token=raw_token, password="Aa1!aaaa", first_name="A", last_name="B"
        )


@pytest.mark.asyncio
async def test_happy_path_creates_admin_user_activates_org_and_issues_session(
    use_case, collaborators
):
    org_id, tenant_id = uuid4(), uuid4()
    raw_token, invitation = _raw_token_and_invitation(org_id, tenant_id)
    collaborators["invitation_repository"].get_by_token.return_value = invitation
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/unit/application/test_accept_organization_invitation.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
"""Accept an OrganizationInvitation: create the owner's User, activate the org, log them in."""

from hashlib import sha256

from prosell.application.dto.auth import LoginUserResponse
from prosell.application.use_cases.auth.issue_user_session import IssueUserSessionUseCase
from prosell.domain.entities.role import RoleType
from prosell.domain.entities.user import User
from prosell.domain.ports import IPasswordService
from prosell.domain.repositories.organization_invitation_repository import (
    AbstractOrganizationInvitationRepository,
)
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository


class AcceptOrganizationInvitationUseCase:
    """Accept a dealer-owner invitation: create their account, log them in."""

    def __init__(
        self,
        invitation_repository: AbstractOrganizationInvitationRepository,
        organization_repository: AbstractOrganizationRepository,
        user_repository: AbstractUserRepository,
        role_repository: AbstractRoleRepository,
        password_service: IPasswordService,
        issue_session_use_case: IssueUserSessionUseCase,
    ) -> None:
        self.invitation_repository = invitation_repository
        self.organization_repository = organization_repository
        self.user_repository = user_repository
        self.role_repository = role_repository
        self.password_service = password_service
        self.issue_session_use_case = issue_session_use_case

    async def execute(
        self,
        token: str,
        password: str,
        first_name: str,
        last_name: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> LoginUserResponse:
        token_hash = sha256(token.encode()).hexdigest()
        # get_by_token_unscoped (not get_by_token) — at this point we don't
        # know which tenant the token belongs to. That's what we're
        # determining. See Task 4, Step 6 for why this method exists.
        invitation = await self.invitation_repository.get_by_token_unscoped(token_hash)
        if not invitation:
            raise ValueError("Invalid invitation token")

        if invitation.is_expired():
            invitation.mark_expired()
            await self.invitation_repository.update(invitation)
            raise ValueError("Invitation has expired")

        if invitation.status.value == "accepted":
            raise ValueError("Invitation already accepted")

        password_hash = self.password_service.hash_password(password)
        user = User.create(
            email=invitation.email,
            password_hash=password_hash,
            full_name=f"{first_name} {last_name}".strip(),
            tenant_id=invitation.tenant_id,
            pre_verified=True,
        )
        user = await self.user_repository.create(user)

        admin_role = await self.role_repository.get_by_type(RoleType.ADMIN)
        if admin_role is None:
            raise ValueError("ADMIN role is not seeded — cannot complete onboarding")
        await self.role_repository.assign_role_to_user(user.id, admin_role.id)

        organization = await self.organization_repository.get_by_id(
            invitation.organization_id, tenant_id=invitation.tenant_id
        )
        if organization is None:
            raise ValueError("Organization for this invitation no longer exists")
        organization.verify(verifier_id=user.id)
        await self.organization_repository.update(organization)

        invitation.accept(accepted_by_user_id=user.id)
        await self.invitation_repository.update(invitation)

        return await self.issue_session_use_case.execute(
            user, ip_address=ip_address, user_agent=user_agent
        )
```

`get_by_token_unscoped` is added to `AbstractOrganizationInvitationRepository` in Task 4, Step 6 (added retroactively below) — it exists specifically because this use case can't know the tenant before this lookup resolves it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/unit/application/test_accept_organization_invitation.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/prosell/application/use_cases/organization/accept_organization_invitation.py apps/api/tests/unit/application/test_accept_organization_invitation.py apps/api/src/prosell/domain/repositories/organization_invitation_repository.py apps/api/src/prosell/infrastructure/repositories/organization_invitation_repository_impl.py
git commit -m "feat(api): add AcceptOrganizationInvitationUseCase"
```

---

## Task 11: DI wiring for the 3 new use cases + `set_auth_cookies` helper

**Files:**

- Modify: `apps/api/src/prosell/infrastructure/api/dependencies.py`
- Modify: `apps/api/src/prosell/infrastructure/api/routers/auth_router.py:190-248` (extract `set_auth_cookies`)

**Interfaces:**

- Produces: `get_organization_invitation_repository`, `get_invite_dealer_owner_use_case`, `get_create_dealer_organization_use_case`, `get_accept_organization_invitation_use_case` factories. `set_auth_cookies(response: Response, result: LoginUserResponse) -> None` module-level function in `auth_router.py`.

- [ ] **Step 1: Find an existing repository factory to mirror**

Run: `rg -n "def get_organization_repository\b" -A 8 apps/api/src/prosell/infrastructure/api/dependencies.py`
Copy its exact shape (likely `Depends(get_async_session)` → constructs the SQLAlchemy repo).

- [ ] **Step 2: Add the repository factory**

```python
async def get_organization_invitation_repository(
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractOrganizationInvitationRepository:
    from prosell.infrastructure.repositories.organization_invitation_repository_impl import (
        SqlAlchemyOrganizationInvitationRepository,
    )

    return SqlAlchemyOrganizationInvitationRepository(db)
```

Add the matching import at the top with the other repository ABCs:

```python
from prosell.domain.repositories.organization_invitation_repository import (
    AbstractOrganizationInvitationRepository,
)
```

- [ ] **Step 3: Add the use case factories**

```python
async def get_invite_dealer_owner_use_case(
    invitation_repository: Annotated[
        AbstractOrganizationInvitationRepository, Depends(get_organization_invitation_repository)
    ],
    email_service: Annotated[AbstractEmailService, Depends(get_email_service)],
) -> InviteDealerOwnerUseCase:
    from prosell.application.use_cases.organization.invite_dealer_owner import (
        InviteDealerOwnerUseCase,
    )

    return InviteDealerOwnerUseCase(invitation_repository, email_service)


async def get_create_dealer_organization_use_case(
    organization_repository: Annotated[AbstractOrganizationRepository, Depends(get_organization_repository)],
    vertical_repository: Annotated[
        AbstractOrganizationVerticalRepository, Depends(get_organization_vertical_repository)
    ],
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    invite_dealer_owner_use_case: Annotated[
        InviteDealerOwnerUseCase, Depends(get_invite_dealer_owner_use_case)
    ],
) -> CreateDealerOrganizationUseCase:
    from prosell.application.use_cases.organization.create_dealer_organization import (
        CreateDealerOrganizationUseCase,
    )

    return CreateDealerOrganizationUseCase(
        organization_repository, vertical_repository, user_repository, invite_dealer_owner_use_case
    )


async def get_accept_organization_invitation_use_case(
    invitation_repository: Annotated[
        AbstractOrganizationInvitationRepository, Depends(get_organization_invitation_repository)
    ],
    organization_repository: Annotated[AbstractOrganizationRepository, Depends(get_organization_repository)],
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    role_repository: Annotated[AbstractRoleRepository, Depends(get_role_repository)],
    password_service: Annotated[IPasswordService, Depends(get_password_service)],
    issue_session_use_case: Annotated[
        IssueUserSessionUseCase, Depends(get_issue_user_session_use_case)
    ],
) -> AcceptOrganizationInvitationUseCase:
    from prosell.application.use_cases.organization.accept_organization_invitation import (
        AcceptOrganizationInvitationUseCase,
    )

    return AcceptOrganizationInvitationUseCase(
        invitation_repository,
        organization_repository,
        user_repository,
        role_repository,
        password_service,
        issue_session_use_case,
    )
```

Run `rg -n "def get_organization_repository\b|def get_organization_vertical_repository\b|def get_email_service\b|def get_role_repository\b" apps/api/src/prosell/infrastructure/api/dependencies.py` first — if any of these factory names differ slightly from what's used above, use the real names (this file has ~800 lines of established factories; don't invent new ones for things that already exist).

- [ ] **Step 4: Extract `set_auth_cookies` in `auth_router.py`**

Replace the inline cookie-setting block inside `login()` (`auth_router.py:212-246`) by extracting it to a module-level function placed above `login()`:

```python
def set_auth_cookies(response: Response, result: LoginUserResponse) -> None:
    """Set the 3 httpOnly auth cookies (access/refresh/user_data) on `response`.

    Shared by /login and /auth/accept-org-invitation — both end in
    "this user is now logged in" and must behave identically.
    """
    access_token_expiry = datetime.now(UTC) + timedelta(minutes=15)
    refresh_token_expiry = datetime.now(UTC) + timedelta(days=7)

    response.set_cookie(
        key="access_token",
        value=result.access_token,
        expires=access_token_expiry,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        domain=settings.cookie_domain,
    )
    response.set_cookie(
        key="refresh_token",
        value=result.refresh_token,
        expires=refresh_token_expiry,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        domain=settings.cookie_domain,
    )
    response.set_cookie(
        key="user_data",
        value=quote(result.user.model_dump_json()),
        expires=refresh_token_expiry,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        domain=settings.cookie_domain,
    )
```

Then replace `login()`'s body (the block this was extracted from) with:

```python
    result = await use_case.execute(uc_request)
    set_auth_cookies(response, result)
    return result
```

- [ ] **Step 5: Run the full auth test suite to confirm zero behavior change**

Run: `cd apps/api && uv run pytest tests/ -k "login or auth_router" -v`
Expected: all pass, identical to before this task

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/prosell/infrastructure/api/dependencies.py apps/api/src/prosell/infrastructure/api/routers/auth_router.py
git commit -m "feat(api): DI wiring for Subsystem E use cases + extract set_auth_cookies"
```

---

## Task 12: `POST /admin/dealers` and `POST /admin/dealers/{id}/resend-invitation`

**Files:**

- Modify: `apps/api/src/prosell/infrastructure/api/routers/admin_dealers_router.py`
- Create: `apps/api/src/prosell/application/dto/organization/create_dealer.py` (request/response DTOs)
- Test: `apps/api/tests/integration/api/test_admin_dealers_router.py` (check real filename with `fd test_admin_dealers apps/api/tests`)

**Interfaces:**

- Produces: `CreateDealerRequest` (name, vertical_ids, owner_email), `CreateDealerResponse` (invitation id, organization id, email, status). Both endpoints gated by `_require_dealer_admin_view_all()` (existing, `admin_dealers_router.py:36-41`).

- [x] **Step 1: Write the failing integration tests**

```python
@pytest.mark.asyncio
async def test_create_dealer_requires_dealer_admin_view_all(client, sales_user_token):
    response = await client.post(
        "/admin/dealers",
        json={"name": "Acme Motors", "vertical_ids": [str(uuid4())], "owner_email": "owner@x.com"},
        headers={"Authorization": f"Bearer {sales_user_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_dealer_rejects_empty_verticals(client, admin_token):
    response = await client.post(
        "/admin/dealers",
        json={"name": "Acme Motors", "vertical_ids": [], "owner_email": "owner@x.com"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_dealer_happy_path(client, admin_token, root_category_id):
    response = await client.post(
        "/admin/dealers",
        json={
            "name": "Acme Motors",
            "vertical_ids": [str(root_category_id)],
            "owner_email": "newowner@x.com",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["organization_id"]
    assert body["status"] == "pending"


@pytest.mark.asyncio
async def test_resend_invitation_requires_dealer_admin_view_all(client, sales_user_token):
    response = await client.post(
        f"/admin/dealers/{uuid4()}/resend-invitation",
        headers={"Authorization": f"Bearer {sales_user_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_resend_invitation_404s_for_unknown_dealer(client, admin_token):
    response = await client.post(
        f"/admin/dealers/{uuid4()}/resend-invitation",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404
```

Check `apps/api/tests/integration/api/` for the real `client`/`admin_token`/`sales_user_token` fixture names (`fd conftest.py apps/api/tests/integration` then read it) — these are illustrative names, match the real ones exactly. `root_category_id` likely needs to come from a fixture that seeds a global category, or from `apps/api/tests/integration/conftest.py`'s existing category fixtures — check `rg "root_category|fixture.*categor" apps/api/tests/integration/conftest.py` first.

- [x] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/integration/api/test_admin_dealers_router.py -v -k dealer`
Expected: FAIL — `404 Not Found` (routes don't exist yet) instead of the expected statuses

- [x] **Step 3: Write the request/response DTOs**

Check `apps/api/src/prosell/application/dto/organization/` exists first (`fd . apps/api/src/prosell/application/dto/organization -t d`); if not, mirror the structure of `apps/api/src/prosell/application/dto/auth/` (a package with one file per concern).

```python
"""DTOs for dealer organization creation."""

from uuid import UUID

from pydantic import BaseModel


class CreateDealerRequest(BaseModel):
    """Request body for POST /admin/dealers."""

    name: str
    vertical_ids: list[UUID]
    owner_email: str


class CreateDealerResponse(BaseModel):
    """Response body for POST /admin/dealers and the resend-invitation endpoint."""

    invitation_id: UUID
    organization_id: UUID
    email: str
    status: str
```

- [x] **Step 4: Add `get_latest_by_organization` to the invitation repository**

The resend endpoint needs to know _which email_ to resend to. `Organization` doesn't store the owner's email anywhere — only `OrganizationInvitation` rows do, and there could be an old `EXPIRED`/`CANCELLED` one for a typo'd address plus a `PENDING` one for the corrected address. Add a lookup for the most recent invitation (any status) before writing the endpoint that needs it.

Add to `AbstractOrganizationInvitationRepository` (Task 4's interface file):

```python
    @abstractmethod
    async def get_latest_by_organization(
        self, organization_id: UUID, tenant_id: UUID
    ) -> OrganizationInvitation | None:
        """Most recent invitation (any status) for an org — used to resend."""
```

Add to `SqlAlchemyOrganizationInvitationRepository` (Task 4's implementation file):

```python
    async def get_latest_by_organization(
        self, organization_id: UUID, tenant_id: UUID
    ) -> OrganizationInvitation | None:
        stmt = (
            select(OrganizationInvitationModel)
            .where(
                OrganizationInvitationModel.organization_id == organization_id,
                OrganizationInvitationModel.tenant_id == tenant_id,
            )
            .order_by(OrganizationInvitationModel.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None
```

Add to Task 4's test file:

```python
@pytest.mark.asyncio
async def test_get_latest_by_organization_returns_most_recent(db_session):
    repo = SqlAlchemyOrganizationInvitationRepository(db_session)
    org_id, tenant_id = uuid4(), uuid4()
    older = OrganizationInvitation.create(
        organization_id=org_id, email="typo@x.com", tenant_id=tenant_id, created_by_user_id=uuid4()
    )
    await repo.create(older)
    newer = OrganizationInvitation.create(
        organization_id=org_id, email="correct@x.com", tenant_id=tenant_id, created_by_user_id=uuid4()
    )
    await repo.create(newer)

    latest = await repo.get_latest_by_organization(org_id, tenant_id)

    assert latest is not None
    assert latest.email == "correct@x.com"
```

Run: `cd apps/api && uv run pytest tests/integration/repositories/test_organization_invitation_repository.py -v`
Expected: 6 passed (5 from Task 4 + this one)

- [x] **Step 5: Add the two endpoints**

Append to `admin_dealers_router.py`, after the existing `list_dealer_products` (end of file). Add these imports at the top of the file first: `CreateDealerOrganizationUseCase`, `InviteDealerOwnerUseCase`, `CreateDealerRequest`/`CreateDealerResponse` (Step 3), `get_create_dealer_organization_use_case`, `get_invite_dealer_owner_use_case`, `get_organization_invitation_repository` (Task 11), `AbstractOrganizationInvitationRepository` (Task 4).

```python
@router.post("", response_model=CreateDealerResponse, status_code=status.HTTP_201_CREATED)
async def create_dealer(
    request: CreateDealerRequest,
    current_user: CurrentUser,
    db: DbSession,
    use_case: Annotated[
        CreateDealerOrganizationUseCase, Depends(get_create_dealer_organization_use_case)
    ],
) -> CreateDealerResponse:
    """Create a new dealer org + enable its verticals + invite its owner.

    Requires DEALER_ADMIN_VIEW_ALL (same gate as every other admin/dealers
    endpoint — see the design doc for why ORG_CREATE is the wrong permission
    here: it's SUPER_ADMIN-only, this needs to also work for ADMIN staff).
    """
    _require_dealer_admin_view_all(current_user)

    try:
        invitation = await use_case.execute(
            name=request.name,
            vertical_ids=request.vertical_ids,
            owner_email=request.owner_email,
            inviter_name=current_user.full_name or current_user.email,
            created_by_user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    return CreateDealerResponse(
        invitation_id=invitation.id,
        organization_id=invitation.organization_id,
        email=invitation.email,
        status=invitation.status.value,
    )


@router.post(
    "/{dealer_id}/resend-invitation",
    response_model=CreateDealerResponse,
    status_code=status.HTTP_200_OK,
)
async def resend_dealer_invitation(
    dealer_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    invitation_repo: Annotated[
        AbstractOrganizationInvitationRepository, Depends(get_organization_invitation_repository)
    ],
    use_case: Annotated[InviteDealerOwnerUseCase, Depends(get_invite_dealer_owner_use_case)],
) -> CreateDealerResponse:
    """Resend (or freshly issue) the owner invitation for an existing dealer org."""
    _require_dealer_admin_view_all(current_user)

    org_repo = SqlAlchemyOrganizationRepository(db)
    dealer = await org_repo.get_by_id(dealer_id, tenant_id=dealer_id)
    if dealer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    latest = await invitation_repo.get_latest_by_organization(dealer.id, dealer.tenant_id)
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No invitation exists yet for this dealer",
        )

    invitation = await use_case.execute(
        organization_id=dealer.id,
        organization_name=dealer.name,
        email=latest.email,
        tenant_id=dealer.tenant_id,
        inviter_name=current_user.full_name or current_user.email,
        created_by_user_id=current_user.id,
    )

    return CreateDealerResponse(
        invitation_id=invitation.id,
        organization_id=invitation.organization_id,
        email=invitation.email,
        status=invitation.status.value,
    )
```

- [x] **Step 6: Run the endpoint tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/integration/api/test_admin_dealers_router.py -v -k dealer`
Expected: 5 passed

- [x] **Step 7: Commit**

```bash
git add apps/api/src/prosell/infrastructure/api/routers/admin_dealers_router.py apps/api/src/prosell/application/dto/organization/ apps/api/src/prosell/domain/repositories/organization_invitation_repository.py apps/api/src/prosell/infrastructure/repositories/organization_invitation_repository_impl.py apps/api/tests/integration/api/test_admin_dealers_router.py apps/api/tests/integration/repositories/test_organization_invitation_repository.py
git commit -m "feat(api): POST /admin/dealers + resend-invitation endpoints"
```

---

## Task 13: `POST /auth/accept-org-invitation`

**Files:**

- Modify: `apps/api/src/prosell/infrastructure/api/routers/auth_router.py`
- Create: `apps/api/src/prosell/application/dto/auth/accept_org_invitation.py` (or add to an existing file in that package — check `fd . apps/api/src/prosell/application/dto/auth -t f` first)
- Test: `apps/api/tests/integration/api/test_auth_router.py` (real filename — `fd test_auth_router apps/api/tests`)

**Interfaces:**

- Produces: `AcceptOrgInvitationRequest` (token, password, first_name, last_name), reuses `LoginUserResponse` for the response (same shape `/login` returns — same cookies get set).

**RESOLVED (2026-06-23):** `test_auth_router.py` did not exist yet — created fresh, not modified. Route is `/api/v1/auth/accept-org-invitation` (the literal `/auth/...` in this doc's snippets omits the `/api/v1` prefix every other router actually uses — verified against `main.py`'s `include_router(..., prefix="/api/v1/auth")`). Endpoint wired exactly per the Step 4 snippet below. 4 integration tests added (invalid token, happy path, weak password, email-race) + 6 use-case unit tests in the pre-existing `test_accept_organization_invitation.py` (5 existing + 1 new for G3). 1635 passed, ruff/pyright clean.

- [x] **Step 1: Write the failing integration tests**

```python
@pytest.mark.asyncio
async def test_accept_org_invitation_rejects_invalid_token(client):
    response = await client.post(
        "/auth/accept-org-invitation",
        json={
            "token": "bogus",
            "password": "Aa1!aaaa",
            "first_name": "Owner",
            "last_name": "Name",
        },
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_accept_org_invitation_happy_path_sets_cookies(client, pending_dealer_invitation):
    raw_token, _invitation = pending_dealer_invitation
    response = await client.post(
        "/auth/accept-org-invitation",
        json={
            "token": raw_token,
            "password": "Aa1!aaaa",
            "first_name": "Owner",
            "last_name": "Name",
        },
    )
    assert response.status_code == 200
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies
    body = response.json()
    assert body["user"]["email"] == _invitation.email
```

`pending_dealer_invitation` is a new fixture you'll need to add to whatever conftest the other `test_auth_router.py` integration tests use — it should create an `Organization` + `OrganizationInvitation` directly via the repositories (mirroring however existing fixtures in that file seed an `Organization`/`User` for other tests) and return `(raw_token, invitation)`. Check that conftest's existing fixtures first (`rg "^@pytest.fixture" -A 3 apps/api/tests/integration/conftest.py` or the local one in `tests/integration/api/`) and match its session/transaction pattern exactly.

- [x] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && uv run pytest tests/integration/api/test_auth_router.py -v -k accept_org_invitation`
Expected: FAIL — `404 Not Found`

- [x] **Step 3: Write the request DTO**

```python
"""DTO for accepting an organization invitation."""

from pydantic import BaseModel


class AcceptOrgInvitationRequest(BaseModel):
    """Request body for POST /auth/accept-org-invitation."""

    token: str
    password: str
    first_name: str
    last_name: str
```

- [x] **Step 4: Add the endpoint**

Add to `auth_router.py`, near `register`/`login` (after `login`, `auth_router.py:248`):

```python
@router.post("/accept-org-invitation", response_model=LoginUserResponse)
@smart_rate_limit("auth")
async def accept_org_invitation(
    request: Request,
    accept_request: AcceptOrgInvitationRequest,
    response: Response,
    use_case: Annotated[
        AcceptOrganizationInvitationUseCase, Depends(get_accept_organization_invitation_use_case)
    ],
) -> LoginUserResponse:
    """
    Accept a dealer-owner organization invitation.

    Creates the owner's account, assigns them ADMIN within their new org's
    tenant, activates the organization, and logs them in — same cookies
    /login sets.
    """
    try:
        result = await use_case.execute(
            token=accept_request.token,
            password=accept_request.password,
            first_name=accept_request.first_name,
            last_name=accept_request.last_name,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    set_auth_cookies(response, result)
    return result
```

Add imports: `AcceptOrgInvitationRequest`, `AcceptOrganizationInvitationUseCase`, `get_accept_organization_invitation_use_case`, and `HTTPException` (check `rg "^from fastapi import" apps/api/src/prosell/infrastructure/api/routers/auth_router.py` — `HTTPException` may not be imported yet in this file if every other endpoint raises via a different mechanism; the existing imports show `from fastapi import APIRouter, Depends, Query, Request, Response, status` with no `HTTPException` — add it to that import line).

- [x] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && uv run pytest tests/integration/api/test_auth_router.py -v -k accept_org_invitation`
Expected: 2 passed

**RESOLVED (2026-06-23):** 4 passed, not 2 — G3 and G6 each got their own dedicated integration test (weak password → 400, email race → 409) instead of folding into the happy-path/invalid-token pair this doc originally sized for.

- [x] **Step 6: Run the full backend suite to confirm zero regressions**

Run: `cd apps/api && uv run pytest -q`
Expected: all passed (compare count to the baseline before Task 1 — should be baseline + every new test added across Tasks 1-13)

Run: `cd apps/api && uv run ruff check . && uv run ruff format --check . && uv run pyright`
Expected: all clean

**RESOLVED (2026-06-23):** 1635 passed (was 1630 after T12). ruff/format/pyright all clean.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/prosell/infrastructure/api/routers/auth_router.py apps/api/src/prosell/application/dto/auth/ apps/api/tests/integration/api/test_auth_router.py
git commit -m "feat(api): POST /auth/accept-org-invitation"
```

---

## Task 14: Extract `passwordFieldSchema` to a shared module

**Files:**

- Create: `apps/web/src/lib/schemas/password.ts`
- Modify: `apps/web/src/components/auth/RegisterForm.tsx:150-157`
- Test: `apps/web/tests/unit/lib/schemas/password.test.ts`

**Interfaces:**

- Produces: `passwordFieldSchema: z.ZodString` — the exact regex/rules from `RegisterForm.tsx:154-157`, usable standalone or composed into a larger `z.object()`.

- [x] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { passwordFieldSchema } from "@/lib/schemas/password";

describe("passwordFieldSchema", () => {
  it("accepts a password with upper, lower, number, and special char", () => {
    expect(passwordFieldSchema.safeParse("Aa1!aaaa").success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = passwordFieldSchema.safeParse("Aa1!aaa");
    expect(result.success).toBe(false);
  });

  it("rejects a password with no special character", () => {
    const result = passwordFieldSchema.safeParse("Aa1aaaaa");
    expect(result.success).toBe(false);
  });

  it("rejects a password with no uppercase letter", () => {
    const result = passwordFieldSchema.safeParse("aa1!aaaa");
    expect(result.success).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run tests/unit/lib/schemas/password.test.ts`
Expected: FAIL — cannot resolve `@/lib/schemas/password`

- [x] **Step 3: Write the implementation**

```typescript
import { z } from "zod";

/** Shared password-strength rule: 8+ chars, upper, lower, number, special char.
 * Extracted from RegisterForm.tsx — also used by the org-invitation accept form. */
export const passwordFieldSchema = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    "Password must contain uppercase, lowercase, number, and special character (@$!%*?&)",
  );
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run tests/unit/lib/schemas/password.test.ts`
Expected: 4 passed

- [x] **Step 5: Update `RegisterForm.tsx` to use it**

Replace lines 150-157 of `RegisterForm.tsx`:

```typescript
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Password must contain uppercase, lowercase, number, and special character (@$!%*?&)",
      ),
```

with:

```typescript
    password: passwordFieldSchema,
```

Add the import at the top of `RegisterForm.tsx`: `import { passwordFieldSchema } from "@/lib/schemas/password";`

- [x] **Step 6: Run the RegisterForm test suite to confirm zero regression**

Run: `cd apps/web && pnpm vitest run -- --grep RegisterForm` (or the real test path — `fd RegisterForm.test apps/web/src apps/web/tests`)
Expected: all pass, identical to before

**MAJOR PLAN CORRECTION (2026-06-23): `RegisterForm.tsx` is dead code, not the live register form.** Wired the schema in per Steps 1-5, ran its test suite (35/35 passed, byte-identical), then before committing discovered via `git log --follow` that `/auth/register` (`page.tsx` → `RegisterPageContent.tsx`) has NOT rendered `<RegisterForm />` since commit `b1244527` (2026-05-21, "apply ProSell dark premium design system across entire frontend") — that commit rewrote `RegisterPageContent.tsx` inline with hand-rolled styles and dropped the `<RegisterForm />` import, without deleting the now-orphaned component. Verified `RegisterForm.tsx` had zero real consumers (only its own test + an unused barrel re-export).

Pulling that thread surfaced a **whole orphaned subtree** from the same migration, confirmed file-by-file (`rg "<ComponentName"` cross-checked against every live `*PageContent.tsx`): `RegisterForm.tsx`, `LoginForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `VerifyEmailForm.tsx`, `TwoFactorSetupForm.tsx` (non-`dynamic/` copy — a live `dynamic/TwoFactorSetupForm.tsx` exists and IS used by `Setup2FAPageContent.tsx`), `PasswordInput.tsx`, `OAuthButtons.tsx`, and `dynamic/OAuthButtons.tsx` — 9 source files (3455 lines) + 9 test files (`password-reset.test.tsx` tested two of the dead components too) covering 184 tests that exercised zero production code. Deleted all of it, trimmed the `components/auth/index.ts` barrel down to its one real survivor (`TwoFactorInput`, used by the live `dynamic/TwoFactorSetupForm.tsx`). Full suite after deletion: 881 passed (106 files), typecheck clean, lint clean. Split into a separate `chore` commit from T14's actual deliverable, per the code-review skill's "separate refactoring from feature work."

**T14's real scope, after the correction:** the live `/auth/register` page (`RegisterPageContent.tsx`) already enforces the *identical* regex inline — character-for-character the same pattern — just with Spanish messages ("Mínimo 8 caracteres" vs `passwordFieldSchema`'s English). There is no rule drift to fix. Swapping in `passwordFieldSchema` directly would inject English error text into an otherwise fully-Spanish form (mixed-language regression) for zero functional gain. Decision: leave `RegisterPageContent.tsx` untouched. `passwordFieldSchema` ships in `lib/schemas/password.ts` as planned, fully tested, with no live consumer yet — T17 (`/invite/org/[token]`, not yet built) is its intended first real caller.

- [x] **Step 7: Commit**

```bash
git add apps/web/src/lib/schemas/password.ts apps/web/tests/unit/lib/schemas/password.test.ts
git commit -m "feat(web): add shared passwordFieldSchema module (T14)"
```

Plus a separate cleanup commit for the orphaned subtree found above (`chore(web): remove orphaned pre-design-system auth components`).

---

## Task 15: `useCreateDealer()` + `useResendDealerInvitation()` mutations

**Files:**

- Modify: `apps/web/src/lib/api/schemas/dealers.ts`
- Modify: `apps/web/src/lib/api/dealers.ts`
- Test: `apps/web/tests/unit/lib/api/dealers.test.tsx` (check real path/existence first: `fd dealers.test apps/web`)

**RESOLVED note (2026-06-23):** the plan's snippets named this file `.test.ts`, but it renders `<QueryClientProvider>` JSX in its `wrapper` helper. Repo convention for any test file containing JSX is `.test.tsx` (confirmed via `tests/unit/api/products.test.tsx`/`vehicles.test.tsx`) — `.ts` files aren't parsed for JSX by this project's Vitest/esbuild config. Created as `.tsx` from the start; no rename needed.

**Interfaces:**

- Produces: `CreateDealerResponseSchema`/`CreateDealerResponse` type; `useCreateDealer(): UseMutationResult<CreateDealerResponse, Error, {name: string; vertical_ids: string[]; owner_email: string}>`; `useResendDealerInvitation(): UseMutationResult<CreateDealerResponse, Error, string>` (dealer id).

- [x] **Step 1: Add the response schema**

Add to `apps/web/src/lib/api/schemas/dealers.ts`, after `DealerProductListResponseSchema`:

```typescript
export const CreateDealerResponseSchema = z.object({
  invitation_id: z.string(),
  organization_id: z.string(),
  email: z.string(),
  status: z.string(),
});

export type CreateDealerResponse = z.infer<typeof CreateDealerResponseSchema>;
```

- [x] **Step 2: Write the failing tests**

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateDealer, useResendDealerInvitation } from "@/lib/api/dealers";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useCreateDealer", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          invitation_id: "inv-1",
          organization_id: "org-1",
          email: "owner@x.com",
          status: "pending",
        }),
      }),
    );
  });

  it("POSTs to /api/v1/admin/dealers and returns the parsed response", async () => {
    const { result } = renderHook(() => useCreateDealer(), { wrapper });

    result.current.mutate({
      name: "Acme Motors",
      vertical_ids: ["cat-1"],
      owner_email: "owner@x.com",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.organization_id).toBe("org-1");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/dealers",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("useResendDealerInvitation", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          invitation_id: "inv-2",
          organization_id: "org-1",
          email: "owner@x.com",
          status: "pending",
        }),
      }),
    );
  });

  it("POSTs to /api/v1/admin/dealers/{id}/resend-invitation", async () => {
    const { result } = renderHook(() => useResendDealerInvitation(), { wrapper });

    result.current.mutate("org-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/dealers/org-1/resend-invitation",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
```

Check the real API path prefix first — `dealers.ts`'s existing `useDealers()` calls `getJson("/api/v1/admin/dealers")` per the file already read for this design; confirm with `rg "admin/dealers" apps/web/src/lib/api/dealers.ts` and match the exact prefix used (some endpoints in this codebase go through `/api/v1/...`, others through a Next.js rewrite at a different prefix — use whatever `useDealers()` already uses, don't guess).

- [x] **Step 3: Run tests to verify they fail**

Run: `cd apps/web && pnpm vitest run tests/unit/lib/api/dealers.test.ts`
Expected: FAIL — `useCreateDealer is not a function`

- [x] **Step 4: Write the implementation**

Add to `apps/web/src/lib/api/dealers.ts`, after the existing `useDealerProducts`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateDealerResponseSchema,
  type CreateDealerResponse,
} from "@/lib/api/schemas/dealers";

interface CreateDealerInput {
  name: string;
  vertical_ids: string[];
  owner_email: string;
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const responseBody: unknown = await res.json().catch(() => null);
    throw new Error(extractErrorMessage(responseBody, "Error en la petición"));
  }

  return res.json();
}

/** Create a dealer org + enable verticals + invite its owner. */
export function useCreateDealer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: CreateDealerInput,
    ): Promise<CreateDealerResponse> => {
      const raw = await postJson("/api/v1/admin/dealers", input);
      return CreateDealerResponseSchema.parse(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dealers"] });
    },
  });
}

/** Resend (or freshly issue) the owner invitation for an existing dealer. */
export function useResendDealerInvitation() {
  return useMutation({
    mutationFn: async (dealerId: string): Promise<CreateDealerResponse> => {
      const raw = await postJson(
        `/api/v1/admin/dealers/${dealerId}/resend-invitation`,
        {},
      );
      return CreateDealerResponseSchema.parse(raw);
    },
  });
}
```

Note: `useMutation`/`useQueryClient` need to be added to the existing `import { useQuery, type UseQueryResult } from "@tanstack/react-query";` line at the top of `dealers.ts` rather than as a second import statement — check that line and merge them into one import.

- [x] **Step 5: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run tests/unit/lib/api/dealers.test.ts`
Expected: 2 passed

- [x] **Step 6: Run typecheck + lint**

Run: `cd apps/web && pnpm typecheck && pnpm eslint src/lib/api/dealers.ts src/lib/api/schemas/dealers.ts`
Expected: clean

- [x] **Step 7: Commit**

```bash
git add apps/web/src/lib/api/dealers.ts apps/web/src/lib/api/schemas/dealers.ts apps/web/tests/unit/lib/api/dealers.test.ts
git commit -m "feat(web): useCreateDealer + useResendDealerInvitation mutations"
```

---

## Task 16: `/admin/dealers/new` staff form

**Files:**

- Create: `apps/web/src/app/(admin)/admin/dealers/new/page.tsx`
- Test: `apps/web/src/app/(admin)/admin/dealers/new/page.test.tsx`

**Interfaces:**

- Consumes: `useAuth().hasPermission` (existing), `Permission.DEALER_ADMIN_VIEW_ALL` (existing), `useCategories()` (existing, `lib/api/categories.ts:27` — already returns root categories since it calls `GET /api/v1/categories` with no `parent_id`, and the backend defaults that to root-only), `useCreateDealer()` (Task 15).

This page gates on `hasPermission(Permission.DEALER_ADMIN_VIEW_ALL)` directly rather than reusing `useRequireAdmin()` — see the design doc's Architecture Decisions for why (the existing hook checks role-identity `isAdmin`, not the permission itself).

- [x] **Step 1: Write the failing test**

```typescript
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminNewDealerPage from "./page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockHasPermission = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}));

const mockMutate = vi.fn();
vi.mock("@/lib/api/dealers", () => ({
  useCreateDealer: () => ({ mutate: mockMutate, isPending: false, error: null }),
}));

vi.mock("@/lib/api/categories", () => ({
  useCategories: () => ({
    data: [{ id: "cat-1", name: "Vehicles" }, { id: "cat-2", name: "Real Estate" }],
    isLoading: false,
  }),
}));

describe("AdminNewDealerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects when the user lacks DEALER_ADMIN_VIEW_ALL", () => {
    mockHasPermission.mockReturnValue(false);
    render(<AdminNewDealerPage />);
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the form and submits with selected verticals", async () => {
    mockHasPermission.mockReturnValue(true);
    render(<AdminNewDealerPage />);

    fireEvent.change(screen.getByLabelText(/nombre/i), {
      target: { value: "Acme Motors" },
    });
    fireEvent.click(screen.getByLabelText("Vehicles"));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "owner@x.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear/i }));

    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith({
        name: "Acme Motors",
        vertical_ids: ["cat-1"],
        owner_email: "owner@x.com",
      }),
    );
  });
});
```

Check `Category`'s real field shape first (`rg "interface Category" -A 10 apps/web/src/types/category.ts`) — the mock above assumes `{id, name}`; adjust if the real type differs.

- [x] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run "src/app/(admin)/admin/dealers/new/page.test.tsx"`
Expected: FAIL — cannot resolve `./page`

- [x] **Step 3: Write the implementation**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/auth/permissions";
import { useCategories } from "@/lib/api/categories";
import { useCreateDealer } from "@/lib/api/dealers";

export default function AdminNewDealerPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(Permission.DEALER_ADMIN_VIEW_ALL);

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const createDealer = useCreateDealer();

  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [verticalIds, setVerticalIds] = useState<string[]>([]);

  useEffect(() => {
    if (!canCreate) {
      router.push("/dashboard");
    }
  }, [canCreate, router]);

  if (!canCreate) {
    return null;
  }

  const toggleVertical = (id: string) => {
    setVerticalIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDealer.mutate(
      { name, vertical_ids: verticalIds, owner_email: ownerEmail },
      {
        onSuccess: () => router.push("/admin/dealers"),
      },
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1
        style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--ps-text-primary)" }}
      >
        Nuevo concesionario
      </h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Nombre
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--ps-border-default)" }}
          />
        </label>

        <fieldset style={{ display: "flex", flexDirection: "column", gap: 8, border: "none", padding: 0 }}>
          <legend style={{ fontSize: 13.5, marginBottom: 6 }}>Verticals</legend>
          {categoriesLoading && <p>Cargando verticals…</p>}
          {categories.map((category) => (
            <label key={category.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={verticalIds.includes(category.id)}
                onChange={() => toggleVertical(category.id)}
                aria-label={category.name}
              />
              {category.name}
            </label>
          ))}
        </fieldset>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          Email del owner
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
            style={{ height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--ps-border-default)" }}
          />
        </label>

        {createDealer.error && (
          <p style={{ color: "var(--ps-error)" }}>{createDealer.error.message}</p>
        )}

        <button
          type="submit"
          disabled={createDealer.isPending || verticalIds.length === 0}
          style={{
            height: 40,
            borderRadius: 8,
            background: "var(--ps-cyan)",
            border: "none",
            color: "var(--ps-bg-base)",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Crear concesionario
        </button>
      </form>
    </div>
  );
}
```

`createDealer.error` is a JS `Error` thrown by `postJson` (Task 15) — its `.message` is already the string `extractErrorMessage` produced inside `postJson`. Rendering `.message` directly here is correct; `extractErrorMessage` itself only runs once, at the fetch layer.

- [x] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run "src/app/(admin)/admin/dealers/new/page.test.tsx"`
Expected: 2 passed

- [x] **Step 5: Run typecheck + lint**

Run: `cd apps/web && pnpm typecheck && pnpm eslint "src/app/(admin)/admin/dealers/new/page.tsx"`
Expected: clean

- [x] **Step 6: Commit**

```bash
git add "apps/web/src/app/(admin)/admin/dealers/new/"
git commit -m "feat(web): admin/dealers/new staff form"
```

---

## Task 17: `/invite/org/[token]` accept-invitation page

**Files:**

- Create: `apps/web/src/app/invite/org/[token]/page.tsx`
- Test: `apps/web/src/app/invite/org/[token]/page.test.tsx`

**Interfaces:**

- Consumes: `passwordFieldSchema` (Task 14), `PasswordInput` (existing, `components/auth/PasswordInput.tsx`), `extractErrorMessage` (existing).

Mirrors the state-machine shape of `apps/web/src/app/invite/[token]/page.tsx` (`loading`/`success`/`error`/`expired` — no `already_member` state, since accepting always creates a brand-new account). Unlike that page, `loading` does NOT auto-submit on mount — there's a form to fill in first (name + password), so `loading` here only covers the brief window of the actual POST after submit.

- [ ] **Step 1: Write the failing tests**

```typescript
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AcceptOrgInvitationPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "tok123" }),
  useRouter: () => ({ push: vi.fn() }),
}));

describe("AcceptOrgInvitationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the form and shows success on a valid token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "a",
          refresh_token: "b",
          user: { id: "1", email: "owner@x.com", full_name: "Owner Name", tenant_id: "org-1" },
          requires_2fa: false,
        }),
      }),
    );
    render(<AcceptOrgInvitationPage />);

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Owner" } });
    fireEvent.change(screen.getByLabelText(/apellido/i), { target: { value: "Name" } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "Aa1!aaaa" },
    });
    fireEvent.click(screen.getByRole("button", { name: /aceptar/i }));

    await waitFor(() => expect(screen.getByText(/bienvenido/i)).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/auth/accept-org-invitation",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows an expired message when the backend says so", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Invitation has expired" }),
      }),
    );
    render(<AcceptOrgInvitationPage />);

    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: "Owner" } });
    fireEvent.change(screen.getByLabelText(/apellido/i), { target: { value: "Name" } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "Aa1!aaaa" },
    });
    fireEvent.click(screen.getByRole("button", { name: /aceptar/i }));

    await waitFor(() => expect(screen.getByText(/venci/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm vitest run "src/app/invite/org/[token]/page.test.tsx"`
Expected: FAIL — cannot resolve `./page`

- [ ] **Step 3: Write the implementation**

```typescript
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { CheckCircle2, XCircle } from "lucide-react";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { passwordFieldSchema } from "@/lib/schemas/password";
import { extractErrorMessage } from "@/lib/api/extractErrorMessage";

type PageState = "form" | "loading" | "success" | "expired" | "error";

const formSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  password: passwordFieldSchema,
});

export default function AcceptOrgInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [state, setState] = useState<PageState>("form");
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse({ firstName, lastName, password });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setFieldError(null);
    setState("loading");

    try {
      const res = await fetch("/api/v1/auth/accept-org-invitation", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, first_name: firstName, last_name: lastName }),
      });

      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        const errorMessage = extractErrorMessage(body, "No se pudo aceptar la invitación");
        if (errorMessage.toLowerCase().includes("expired")) {
          setState("expired");
          setMessage("Esta invitación venció. Pedile al staff que te envíe una nueva.");
        } else {
          setState("error");
          setMessage(errorMessage);
        }
        return;
      }

      setState("success");
      setMessage("¡Bienvenido a ProSell! Tu cuenta y tu concesionario ya están activos.");
      setTimeout(() => router.push("/dashboard?welcome=org"), 2000);
    } catch {
      setState("error");
      setMessage("Ocurrió un error inesperado. Intentá de nuevo.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ps-bg-base)",
        padding: "32px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div
          style={{
            background: "var(--ps-bg-surface)",
            border: "1px solid var(--ps-border-default)",
            borderRadius: 14,
            padding: "28px 28px 32px",
          }}
        >
          <h1 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: "var(--ps-text-primary)" }}>
            Invitación de concesionario
          </h1>

          {state === "success" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <CheckCircle2 size={48} style={{ color: "var(--ps-success)" }} />
              <p style={{ textAlign: "center", color: "var(--ps-text-secondary)" }}>{message}</p>
            </div>
          )}

          {state === "expired" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <XCircle size={48} style={{ color: "var(--ps-error)" }} />
              <p style={{ textAlign: "center", color: "var(--ps-text-secondary)" }}>{message}</p>
            </div>
          )}

          {(state === "form" || state === "loading" || state === "error") && (
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                Nombre
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  style={{ height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--ps-border-default)" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                Apellido
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  style={{ height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid var(--ps-border-default)" }}
                />
              </label>
              <PasswordInput
                label="Contraseña"
                name="password"
                showStrength
                value={password}
                onChange={setPassword}
                error={fieldError ?? (state === "error" ? message : null)}
                required
              />
              <button
                type="submit"
                disabled={state === "loading"}
                style={{
                  height: 40,
                  borderRadius: 8,
                  background: "var(--ps-cyan)",
                  border: "none",
                  color: "var(--ps-bg-base)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Aceptar invitación
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run "src/app/invite/org/[token]/page.test.tsx"`
Expected: 2 passed

- [ ] **Step 5: Run typecheck + lint**

Run: `cd apps/web && pnpm typecheck && pnpm eslint "src/app/invite/org/[token]/page.tsx"`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/app/invite/org/"
git commit -m "feat(web): /invite/org/[token] accept-invitation page"
```

---

## Task 18: "Reenviar invitación" button on the dealer detail page

**Files:**

- Modify: `apps/web/src/app/(admin)/admin/dealers/[id]/page.tsx`
- Modify: `apps/web/src/app/(admin)/admin/dealers/[id]/page.test.tsx`

**Interfaces:**

- Consumes: `useResendDealerInvitation()` (Task 15).

Visible only when `dealer.status === "pending_verification"`.

- [ ] **Step 1: Write the failing test**

Add to the existing `page.test.tsx` for this route:

```typescript
it("shows a resend button only when status is pending_verification, and it calls the mutation", async () => {
  const mockMutate = vi.fn();
  vi.mocked(useResendDealerInvitation).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as never);
  vi.mocked(useDealer).mockReturnValue({
    dealer: { id: "org-1", name: "Acme Motors", status: "pending_verification" },
    isLoading: false,
    error: null,
  } as never);

  render(<AdminDealerDetailPage />);

  const button = screen.getByRole("button", { name: /reenviar invitación/i });
  fireEvent.click(button);

  expect(mockMutate).toHaveBeenCalledWith("org-1");
});
```

Check the existing test file's exact mocking style for `useDealer`/`useRequireAdmin` first (`page.test.tsx` for this route already exists per this session's earlier work) and match it — add `useResendDealerInvitation` to whatever `vi.mock("@/lib/api/dealers", ...)` block is already there instead of creating a second one.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run "src/app/(admin)/admin/dealers/[id]/page.test.tsx"`
Expected: FAIL — button not found

- [ ] **Step 3: Add the button**

In `page.tsx`, import `useResendDealerInvitation` from `@/lib/api/dealers` and add right after the existing "Estado: {dealer.status}" paragraph:

```tsx
const resendInvitation = useResendDealerInvitation();

// ... inside the JSX, after the existing status <p>:
{
  dealer.status === "pending_verification" && (
    <button
      type="button"
      onClick={() => resendInvitation.mutate(dealer.id)}
      disabled={resendInvitation.isPending}
      style={{
        alignSelf: "flex-start",
        height: 36,
        padding: "0 16px",
        borderRadius: 8,
        background: "var(--ps-bg-elevated)",
        border: "1px solid var(--ps-border-default)",
        color: "var(--ps-text-secondary)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {resendInvitation.isPending ? "Reenviando…" : "Reenviar invitación"}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run "src/app/(admin)/admin/dealers/[id]/page.test.tsx"`
Expected: all pass, including the new test

- [ ] **Step 5: Run typecheck + lint**

Run: `cd apps/web && pnpm typecheck && pnpm eslint "src/app/(admin)/admin/dealers/[id]/page.tsx"`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/app/(admin)/admin/dealers/[id]/page.tsx" "apps/web/src/app/(admin)/admin/dealers/[id]/page.test.tsx"
git commit -m "feat(web): resend-invitation button on dealer detail page"
```

---

## Discovered gaps to address during T12-T18

Found while reviewing T1-T11 code for the next batch. Listed by the task that should bake them in.

### B1 — FIXED in pre-T12 (already committed): `last_login_at` not stamped on invitation accept

`AcceptOrganizationInvitationUseCase.execute()` created the User and went straight to `issue_session_use_case.execute(user, ...)` without calling `user.update_last_login(ip_address)`. `IssueUserSessionUseCase` (extracted in T6) does NOT stamp `last_login_at` because `LoginUserUseCase` already does it in its step 7 — but AcceptOrgInvitation has no such upstream step. Result: the owner's first session left `last_login_at = None` in the DB until their NEXT normal login.

**Fix applied:** added `user.update_last_login(ip_address)` + `await self.user_repository.update(user)` right after `user_repository.create(user)`. Test `test_happy_path_records_last_login_on_the_new_user` covers it.

**Lesson:** `IssueUserSessionUseCase` is reusable; any caller that ends in "this user is now logged in" must have already stamped `last_login_at` first. Document this contract in the use case docstring if a third caller appears.

### G1 — T12: explicit transaction wrapping for `POST /admin/dealers`

`CreateDealerOrganizationUseCase` docstring (line 19-23) says _"Caller (the router) is responsible for wrapping this in a DB transaction so a failure at any step ... rolls back the org and vertical rows too."_ But the T12 endpoint snippets (lines 2467-2547) call `use_case.execute(...)` with no `async with db.begin():` or equivalent. Without explicit transaction scope, FastAPI's default per-request session commits after each `.flush()` in the use case — meaning `Organization.create()` + `vertical_repository.enable()` + `Invitation.create()` commit independently, and a failure in any later step leaves partial state.

**Bake into T12 Step 5:** wrap the `use_case.execute(...)` call in `async with db.begin():` (or equivalent explicit transaction boundary). Add an integration test that injects a failure mid-flow and asserts no Organization/Invitation rows persist.

**RESOLVED (2026-06-22) — premise was wrong, no transaction wrap added.** `get_async_session` (`infrastructure/database/session.py`) wraps the entire request in ONE session that commits once at the end and rolls back the whole session on any unhandled exception; every repo call in this flow uses `.flush()`, never `.commit()`. So the claimed per-step independent commits don't happen — the existing session lifecycle already gives the atomicity this gap asked for, for free. Verified with the exact test this gap requested: `tests/integration/use_cases/test_create_dealer_organization_atomicity.py` (savepoint-wrapped to coexist with the `db_session` fixture's own outer transaction) — a mid-flow `RuntimeError` from the email step leaves no `Organization` row after rollback, with zero extra code in the router. Adding an explicit `db.begin()` here would have been redundant and risky: `AsyncSession` autobegins on first use, so an explicit `begin()` later in the request can raise `InvalidRequestError: A transaction is already begun on this Session` depending on what already touched the session (e.g. an auth dependency). Lesson for future gap docs: verify session-lifecycle claims against the actual session factory before prescribing a fix.

### G2 — T12: `CreateDealerRequest.owner_email` should be `EmailStr`

DTO at line 2389-2394 has `owner_email: str` — accepts `"not-an-email"` without complaint. FastAPI/Pydantic 2 has `EmailStr` for this exact reason.

**Bake into T12 Step 3:** change to `owner_email: EmailStr` (import from `pydantic`). Add an integration test that posts `"not-an-email"` and expects 422.

**RESOLVED (2026-06-22):** `CreateDealerRequest.owner_email` is `EmailStr`. Covered by `test_create_dealer_rejects_invalid_email` (422).

### G3 — T13: backend MUST validate password strength, not trust the frontend

`AcceptOrgInvitationRequest` at line 2624-2631 has `password: str` — zero regex/strength validation. The frontend Zod schema (`passwordFieldSchema`, T14) is the only gate. Anyone POSTing directly to `/auth/accept-org-invitation` with `password="x"` would create a user whose password passes backend hashing but fails the frontend strength meter on their NEXT login.

**Bake into T13 Step 3:** replicate the exact regex from `passwordFieldSchema` as a Pydantic `Field(..., pattern=...)` on `password`. Frontend and backend must agree, but neither alone is sufficient.

**RESOLVED (2026-06-23), NOT as a DTO regex:** the codebase already had a backend-side strength gate — `IPasswordService.validate_password_strength()` (uppercase/lowercase/digit/special/length), used by `RegisterUserUseCase` and raising the existing `WeakPasswordException` (maps to 400 via the global `auth_domain_exception_handler`). Added the same call to `AcceptOrganizationInvitationUseCase.execute()` instead of duplicating the regex in a new `Field(pattern=...)` — same behavior, no new validation logic, consistent with `register_user.py`. Had to backfill `validate_password_strength.return_value = []` on the existing mocked `password_service` fixture in `test_accept_organization_invitation.py` so the 5 pre-existing happy-path unit tests didn't start failing on an unconfigured `MagicMock` return.

### G4 — T9 (now) or T12: validate that `vertical_ids` reference real root categories

`CreateDealerOrganizationUseCase.execute()` iterates `vertical_ids` and calls `vertical_repository.enable(organization_id, root_category_id=...)` without checking those IDs exist in `categories`. A request with `vertical_ids=[uuid4()]` passes the empty-list guard but the first `enable()` call raises an unhandled `IntegrityError` (FK violation) → 500.

**Bake into T9 (preferred) OR T12:** add a `vertical_repository.get_existing_ids(ids: list[UUID]) -> set[UUID]` (or just `get_by_id` in a loop with one query), reject in the use case if any are missing with `ValueError(f"Unknown vertical id: {id}")`. The router already maps `ValueError → 400`, so this turns a 500 into a clean 400.

**RESOLVED (2026-06-22), implemented in T9's use case (not T12, not a new vertical_repository method):** `CreateDealerOrganizationUseCase` now takes a `category_repository: AbstractCategoryRepository` and calls `get_by_id_any_tenant(root_category_id)` for each `vertical_id` before creating anything, raising `ValueError(f"Unknown vertical id: {id}")` on a miss. Reused the existing tenant-agnostic lookup (already used by `ListOrgVerticalsUseCase`) instead of adding a new repository method — `categories` is the real FK target `vertical_ids` must resolve against, not `organization_vertical`. Covered by `test_raises_when_a_vertical_id_does_not_resolve_to_a_real_category` (unit) and `test_create_dealer_rejects_unknown_vertical_id` (integration, 400).

### G5 — T13: confirm `@smart_rate_limit("auth")` is on `/auth/accept-org-invitation`

The plan's T13 Step 4 snippet (line 2639) already shows `@smart_rate_limit("auth")` — good. **No action needed**, just calling it out so it doesn't get accidentally dropped during implementation. Same check for T12: the create-dealer and resend-invitation endpoints should also be rate-limited (consider `@smart_rate_limit("admin")` or `"auth"`). Add it explicitly in T12 Step 5 if not already covered.

**RESOLVED (2026-06-22) for T12:** `smart_rate_limit` only has `"auth"`/`"api"`/`"public"` tiers (no `"admin"`) — used `@smart_rate_limit("auth")` on both `create_dealer` and `resend_dealer_invitation`. The decorator requires a `Request` parameter on the endpoint (it extracts it by type from the bound arguments); added `request: Request` to both signatures with `_ = request`, matching `auth_router.py`'s existing convention.

**RESOLVED (2026-06-23) for T13:** confirmed — `@smart_rate_limit("auth")` is on `accept_org_invitation`, exactly as this doc's own Step 4 snippet already showed. No change needed.

### G6 — T13: handle `IntegrityError` on `user_repository.create`

`AcceptOrganizationInvitationUseCase.execute()` line 70 does `user = await self.user_repository.create(user)`. If a race creates a User with the same email between `CreateDealerOrganizationUseCase`'s `get_by_email` check and `AcceptOrganizationInvitationUseCase`'s `create`, the unique constraint on `users.email` fires `IntegrityError` → unhandled → 500.

**Bake into T13:** wrap the user create in `try/except IntegrityError as e: raise HTTPException(409, "Email already registered")`. Equivalent to a "soft retry after race" check.

**RESOLVED (2026-06-23), NOT with a new try/except:** `main.py` already registers `app.exception_handler(IntegrityError, integrity_error_handler)` globally — it inspects the DB error message and already returns 409 "DuplicateEntry" for unique-constraint violations (and 400 for FK violations). An `IntegrityError` from `user_repository.create()` propagates uncaught through the use case and the router straight into that handler — adding a local `try/except` in the router would have been dead code shadowing infra that already exists, and worse, would've violated Clean Architecture if put in the use case (`HTTPException` is a FastAPI/infra concern, not application-layer). Verified with a new integration test that pre-seeds a `User` with the invitation's email before accepting — confirms 409 end-to-end with zero new production code.

---

## Final verification (after Task 18)

- [ ] **Step 1: Full backend suite**

Run: `cd apps/api && uv run ruff check . && uv run ruff format --check . && uv run pyright && uv run pytest -q`
Expected: all clean, all passed

- [ ] **Step 2: Full frontend suite**

Run: `cd apps/web && pnpm typecheck && pnpm eslint . --max-warnings 0 && pnpm vitest run`
Expected: all clean, all passed

- [ ] **Step 3: Manual smoke test**

1. Log in as an existing ADMIN or SUPER_ADMIN user, go to `/admin/dealers/new`, create a dealer with at least one vertical and a fresh email.
2. Check the dev email log (LoggingSender) for the rendered `organization_invitation.html` content and copy the `/invite/org/{token}` link.
3. Open that link in an incognito window, fill the form, submit.
4. Confirm redirect to `/dashboard`, confirm cookies are set, confirm the new user can see only their own org's data.
5. Go back to `/admin/dealers/{id}` and confirm status now shows `active` and the resend button is gone.
6. Create a second dealer, do NOT accept its invitation, click "Reenviar invitación" on its detail page, confirm a second email renders with a different token than the first.
