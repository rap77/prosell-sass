"""UserBranchModel SQLAlchemy ORM for M:N relationship."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class UserBranchModel(Base):
    """SQLAlchemy model for user_branches junction table."""

    __tablename__ = "user_branches"

    # Identity
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    branch_id: Mapped[UUID] = mapped_column(
        ForeignKey("branches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True)

    # Audit fields
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )
    assigned_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Indexes and constraints
    __table_args__ = (
        Index("ix_user_branches_user_branch", "user_id", "branch_id", unique=True),
        Index("ix_user_branches_tenant", "tenant_id"),
    )
