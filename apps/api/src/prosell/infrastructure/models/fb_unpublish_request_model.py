"""Durable work queue for removing Facebook Marketplace publications."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class FBUnpublishRequestModel(Base):
    """A pending request to remove one active Facebook publication."""

    __tablename__ = "fb_unpublish_requests"
    __table_args__ = (
        UniqueConstraint(
            "publication_status_id",
            name="uq_fb_unpublish_requests_publication_status",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    publication_status_id: Mapped[UUID] = mapped_column(
        ForeignKey("fb_publication_status.id", ondelete="CASCADE"), nullable=False
    )
    fb_account_id: Mapped[UUID] = mapped_column(
        ForeignKey("fb_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    fb_post_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="queued", index=True
    )
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
