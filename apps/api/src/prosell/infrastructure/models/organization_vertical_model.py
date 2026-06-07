"""SQLAlchemy ORM model for the organization_vertical M2M table.

The composite primary key is (organization_id, root_category_id). Both
FKs cascade on delete so removing an organization or a global root
template automatically cleans up the linkage. The repository uses
`pg_insert ... on_conflict_do_nothing` to make enable() idempotent.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class OrganizationVerticalModel(Base):
    """SQLAlchemy model for the `organization_vertical` table."""

    __tablename__ = "organization_vertical"

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    root_category_id: Mapped[UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"),
        primary_key=True,
    )
    enabled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
