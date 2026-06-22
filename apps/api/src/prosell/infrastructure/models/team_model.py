"""SQLAlchemy ORM models for Team and TeamMember entities."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from prosell.infrastructure.database.base import Base


class TeamInvitationModel(Base):
    """SQLAlchemy model for team_invitations table."""

    __tablename__ = "team_invitations"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
    )
    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True)

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
    team = relationship(
        "TeamModel",
        back_populates="invitations",
        lazy="noload",
    )


class TeamModel(Base):
    """SQLAlchemy model for teams table."""

    __tablename__ = "teams"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    org_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_team_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("teams.id", ondelete="SET NULL"),
        nullable=True,
    )

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
    organization = relationship(
        "OrganizationModel",
        back_populates="teams",
        lazy="noload",
    )
    members = relationship(
        "TeamMemberModel",
        back_populates="team",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    invitations = relationship(
        "TeamInvitationModel",
        back_populates="team",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    parent_team = relationship(
        "TeamModel",
        remote_side="TeamModel.id",
        lazy="noload",
    )


class TeamMemberModel(Base):
    """SQLAlchemy model for team_members table."""

    __tablename__ = "team_members"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        String(50),
        default="vendor",
        nullable=False,
    )
    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    commission_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Timestamps
    joined_at: Mapped[datetime] = mapped_column(
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
    team = relationship(
        "TeamModel",
        back_populates="members",
        lazy="noload",
    )
