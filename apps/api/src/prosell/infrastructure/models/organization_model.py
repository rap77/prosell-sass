"""SQLAlchemy ORM model for Organization entity."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from prosell.infrastructure.database.base import Base


class OrganizationModel(Base):
    """SQLAlchemy model for organizations table."""

    __tablename__ = "organizations"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    tenant_id: Mapped[UUID] = mapped_column(unique=True, index=True, nullable=False)

    # Branding
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Verification
    status: Mapped[str] = mapped_column(
        String(50),
        default="pending_verification",
        nullable=False,
        index=True,
    )
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    verified_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Wallet ref (plain UUID to avoid circular FK)
    wallet_id: Mapped[UUID | None] = mapped_column(nullable=True)

    # Onboarding
    setup_complete: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Settings
    settings: Mapped[dict[str, object]] = mapped_column(JSON, default=dict, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        onupdate=text("now()"),
        nullable=False,
    )

    # Relationships
    teams = relationship(
        "TeamModel",
        back_populates="organization",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    wallet = relationship(
        "WalletModel",
        back_populates="organization",
        uselist=False,
        primaryjoin="OrganizationModel.id == foreign(WalletModel.org_id)",
        lazy="noload",
    )


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
