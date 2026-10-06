"""SQLAlchemy ORM models for Role and UserRole entities."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from prosell.infrastructure.database.base import Base


class RoleModel(Base):
    """SQLAlchemy model for roles table.

    `role_type` is nullable: the 6 built-in system roles keep a fixed type
    (unique among themselves via the partial index below); a custom
    (non-system) profile gets `role_type=NULL` — `is_system_role` is what
    actually distinguishes built-in from custom, not the presence of a
    type. See migration `20261006_0001` and the diagnostic doc §6 for why.
    """

    __tablename__ = "roles"
    __table_args__ = (
        Index(
            "ix_roles_role_type_unique_when_present",
            "role_type",
            unique=True,
            postgresql_where=text("role_type IS NOT NULL"),
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    role_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    is_system_role: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    tenant_id: Mapped[UUID | None] = mapped_column(
        nullable=True,
        index=True,
    )
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
    user_roles = relationship(
        "UserRoleModel",
        back_populates="role",
        cascade="all, delete-orphan",
    )
    grants = relationship(
        "RoleGrantModel",
        back_populates="role",
        cascade="all, delete-orphan",
    )
    scope = relationship(
        "RoleScopeModel",
        back_populates="role",
        cascade="all, delete-orphan",
        uselist=False,
    )
    organization_access = relationship(
        "RoleOrganizationAccessModel",
        back_populates="role",
        cascade="all, delete-orphan",
    )


class UserRoleModel(Base):
    """SQLAlchemy model for user_roles junction table."""

    __tablename__ = "user_roles"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role_id: Mapped[UUID] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    # Relationships
    user = relationship("UserModel", back_populates="roles")
    role = relationship("RoleModel", back_populates="user_roles")


class RoleGrantModel(Base):
    """One (zone, action) grant for a role — the permission matrix.

    Replaces the static `ROLE_PERMISSIONS` dict for roles that have grants
    here; a role with no rows here (yet) simply has no permissions beyond
    whatever `role_type`-based legacy lookup still applies during the
    migration window. See diagnostic doc §6.
    """

    __tablename__ = "role_grants"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    role_id: Mapped[UUID] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    zone: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    # Relationships
    role = relationship("RoleModel", back_populates="grants")


class RoleScopeModel(Base):
    """Which data-visibility mode a role's grants apply under.

    One row per role: `own` (only the actor's own data), `explicit` (the
    organizations listed in `role_organization_access`), or `all`.
    """

    __tablename__ = "role_scope"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    role_id: Mapped[UUID] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    scope_type: Mapped[str] = mapped_column(String(20), nullable=False)
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
    role = relationship("RoleModel", back_populates="scope")


class RoleOrganizationAccessModel(Base):
    """One organization a role may see, when its scope is `explicit`.

    Irrelevant (and left empty) when the role's `RoleScopeModel.scope_type`
    is `own` or `all`.
    """

    __tablename__ = "role_organization_access"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    role_id: Mapped[UUID] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    # Relationships
    role = relationship("RoleModel", back_populates="organization_access")
