"""UserDealerModel SQLAlchemy ORM for M:N relationship."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class UserDealerModel(Base):
    """SQLAlchemy model for user_dealers junction table."""

    __tablename__ = "user_dealers"

    # Identity
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dealer_id: Mapped[UUID] = mapped_column(
        ForeignKey("dealers.id", ondelete="CASCADE"),
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
        Index("ix_user_dealers_user_dealer", "user_id", "dealer_id", unique=True),
        Index("ix_user_dealers_tenant", "tenant_id"),
    )
