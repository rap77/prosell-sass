"""Dealer inventory access granted to a marketplace operator organization."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class OrganizationMarketplaceAccessModel(Base):
    """An explicit commercial agreement between inventory owner and operator.

    The inventory owner remains the product tenant. The operator can act only
    within the capabilities the dealer granted, keeping cross-tenant access
    explicit and auditable.

    Lifecycle states:
    - pending: inventory owner requested, awaiting operator approval
    - active: operator approved, grant is in effect
    - rejected: operator rejected the request
    - revoked: either party revoked an active grant
    """

    __tablename__ = "organization_marketplace_access"
    __table_args__ = (
        UniqueConstraint(
            "inventory_owner_organization_id",
            "operator_organization_id",
            name="uq_marketplace_access_owner_operator",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    inventory_owner_organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    operator_organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    can_manage_inventory: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    can_publish_marketplace: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="pending"
    )  # pending, active, rejected, revoked

    # Audit trail: who performed each action
    requested_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    rejected_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    revoked_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Rejection/revocation reasons
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    revocation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps for each state transition
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
