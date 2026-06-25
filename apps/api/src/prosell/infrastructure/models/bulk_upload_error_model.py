"""ORM model for bulk_upload_errors table."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class BulkUploadErrorModel(Base):
    """Stores per-upload error payloads for 24h CSV download."""

    __tablename__ = "bulk_upload_errors"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    category_id: Mapped[UUID] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    payload: Mapped[list] = mapped_column(JSONB, nullable=False)
