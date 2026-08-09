"""Persistence for approved Facebook credential migrations."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class FBCredentialMigrationTokenModel(Base):
    """A short-lived, single-use authorization for a bot credential batch.

    The plaintext token is returned only when generated and is never persisted.
    """

    __tablename__ = "fb_credential_migration_tokens"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    account_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    batch_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class FBCredentialMigrationAuthorizationModel(Base):
    """A bot-created migration batch awaiting tenant-admin approval."""

    __tablename__ = "fb_credential_migration_authorizations"
    __table_args__ = (
        CheckConstraint(
            "account_count >= 1 AND account_count <= 100",
            name="ck_fb_migration_auth_count",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    pairing_code: Mapped[str] = mapped_column(String(9), unique=True, nullable=False)
    account_count: Mapped[int] = mapped_column(Integer, nullable=False)
    batch_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    approved_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    migration_token_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("fb_credential_migration_tokens.id", ondelete="SET NULL"), nullable=True
    )
    migration_token_encrypted: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    token_delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
