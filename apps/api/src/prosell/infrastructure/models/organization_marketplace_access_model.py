"""Dealer inventory access granted to a marketplace operator organization."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from prosell.infrastructure.database.base import Base


class OrganizationMarketplaceAccessModel(Base):
    """An explicit commercial agreement between inventory owner and operator.

    The inventory owner remains the product tenant. The operator can act only
    within the capabilities the dealer granted, keeping cross-tenant access
    explicit and auditable.
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
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
