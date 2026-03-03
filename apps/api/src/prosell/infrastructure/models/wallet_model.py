"""SQLAlchemy ORM models for Wallet and WalletTransaction entities."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from prosell.infrastructure.database.base import Base


class WalletModel(Base):
    """SQLAlchemy model for wallets table."""

    __tablename__ = "wallets"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    org_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    balance_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        onupdate="now()",
        nullable=False,
    )

    # Relationships
    organization = relationship(
        "OrganizationModel",
        primaryjoin="WalletModel.org_id == OrganizationModel.id",
        back_populates="wallet",
        lazy="noload",
    )
    transactions = relationship(
        "WalletTransactionModel",
        back_populates="wallet",
        cascade="all, delete-orphan",
        lazy="noload",
        order_by="WalletTransactionModel.created_at.desc()",
    )


class WalletTransactionModel(Base):
    """SQLAlchemy model for wallet_transactions table."""

    __tablename__ = "wallet_transactions"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    wallet_id: Mapped[UUID] = mapped_column(
        ForeignKey("wallets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_after_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    metadata_: Mapped[dict[str, object]] = mapped_column(
        "metadata",
        JSON,
        default=dict,
        nullable=False,
    )

    # Timestamp (immutable - no updated_at)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
        index=True,
    )

    # Relationships
    wallet = relationship(
        "WalletModel",
        back_populates="transactions",
        lazy="noload",
    )
