"""Wallet request/response DTOs."""

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from prosell.domain.entities.wallet import Wallet, WalletTransaction


class WalletTransactionResponse(BaseModel):
    """DTO for wallet transaction responses."""

    id: UUID
    wallet_id: UUID
    transaction_type: str
    amount_cents: int
    amount: Decimal = Field(default=Decimal("0"))
    balance_after_cents: int
    balance_after: Decimal = Field(default=Decimal("0"))
    description: str
    tenant_id: UUID
    metadata: dict[str, object] = {}
    created_at: str

    @classmethod
    def from_entity(cls, txn: WalletTransaction) -> "WalletTransactionResponse":
        """Build response from domain entity."""
        return cls(
            id=txn.id,
            wallet_id=txn.wallet_id,
            transaction_type=txn.transaction_type.value,
            amount_cents=txn.amount_cents,
            amount=txn.amount,
            balance_after_cents=txn.balance_after_cents,
            balance_after=txn.balance_after,
            description=txn.description,
            tenant_id=txn.tenant_id,
            metadata=txn.metadata,
            created_at=txn.created_at.isoformat(),
        )


class WalletResponse(BaseModel):
    """DTO for wallet responses."""

    id: UUID
    org_id: UUID
    tenant_id: UUID
    balance_cents: int
    balance: Decimal = Field(default=Decimal("0"))
    currency: str
    is_active: bool
    created_at: str
    updated_at: str

    @classmethod
    def from_entity(cls, wallet: Wallet) -> "WalletResponse":
        """Build response from domain entity."""
        return cls(
            id=wallet.id,
            org_id=wallet.org_id,
            tenant_id=wallet.tenant_id,
            balance_cents=wallet.balance_cents,
            balance=wallet.balance,
            currency=wallet.currency,
            is_active=wallet.is_active,
            created_at=wallet.created_at.isoformat(),
            updated_at=wallet.updated_at.isoformat(),
        )


class CreditWalletRequest(BaseModel):
    """DTO for crediting wallet (recharge)."""

    org_id: UUID
    tenant_id: UUID
    amount_cents: int = Field(..., gt=0)
    description: str = Field(..., min_length=1, max_length=500)
    metadata: dict[str, object] | None = None


class DebitWalletRequest(BaseModel):
    """DTO for debiting wallet (spend)."""

    org_id: UUID
    tenant_id: UUID
    amount_cents: int = Field(..., gt=0)
    description: str = Field(..., min_length=1, max_length=500)
    metadata: dict[str, object] | None = None


class WalletTransactionsResponse(BaseModel):
    """DTO for paginated wallet transactions."""

    transactions: list[WalletTransactionResponse]
    total: int
    skip: int
    limit: int
