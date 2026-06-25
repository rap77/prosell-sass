"""ORM model for category_schema_changes audit log."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class CategorySchemaChangeModel(Base):
    """Append-only audit log for category attribute_schema changes."""

    __tablename__ = "category_schema_changes"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    category_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    changed_by_user_id: Mapped[UUID] = mapped_column(nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False, index=True
    )
    previous_attributes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    new_attributes: Mapped[dict] = mapped_column(JSONB, nullable=False)
    migration_applied: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    migration_warnings: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    change_summary: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
