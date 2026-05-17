"""SQLAlchemy models for Lead and LeadAuditLog."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from prosell.infrastructure.database.base import Base


class LeadModel(Base):
    """SQLAlchemy model for Lead entity."""

    __tablename__ = "leads"

    # Identity
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Buyer information
    buyer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    buyer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    buyer_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationships
    # Note: product_id no longer has ForeignKey (vehicles table was dropped)
    # It's now just a UUID reference for tracking purposes
    product_id: Mapped[UUID | None] = mapped_column(
        nullable=True,
        index=True,
    )
    vendedor_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Lead details
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="new", index=True)

    # Audit timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    audit_logs: Mapped[list["LeadAuditLogModel"]] = relationship(
        "LeadAuditLogModel",
        back_populates="lead",
        cascade="all, delete-orphan",
        order_by="LeadAuditLogModel.created_at.desc()",
    )


class LeadAuditLogModel(Base):
    """SQLAlchemy model for LeadAuditLog entity."""

    __tablename__ = "lead_audit_log"

    # Identity
    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
    tenant_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lead_id: Mapped[UUID] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Status change
    old_status: Mapped[str] = mapped_column(String(20), nullable=False)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)

    # Change metadata
    changed_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Audit timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    lead: Mapped["LeadModel"] = relationship("LeadModel", back_populates="audit_logs")
