"""Wallet and WalletTransaction entities - Token-based payment system."""

from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from pydantic import Field, field_validator

from prosell.domain.base import DomainModel


class TransactionType(StrEnum):
    """Transaction type enum."""

    CREDIT = "credit"  # Adding tokens (recharge, bonus)
    DEBIT = "debit"  # Spending tokens (listing fee, etc.)

    def is_credit(self) -> bool:
        """Check if transaction is a credit (adding tokens)."""
        return self == TransactionType.CREDIT

    def is_debit(self) -> bool:
        """Check if transaction is a debit (spending tokens)."""
        return self == TransactionType.DEBIT

    def __str__(self) -> str:
        return self.value


class Wallet(DomainModel):
    """
    Wallet entity.

    Represents an organization's token wallet for prepaid services.
    Tokens are purchased via Stripe and spent on operations like listings.
    """

    # Required fields
    id: UUID
    org_id: UUID  # Organization this wallet belongs to
    tenant_id: UUID  # For multi-tenant isolation

    # Balance fields (stored as cents/integer to avoid floating point issues)
    balance_cents: int = Field(default=0, ge=0)  # Balance in cents
    currency: str = Field(default="USD", max_length=3)

    # Metadata
    is_active: bool = Field(default=True)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Lazy loaded relationships
    transactions: list["WalletTransaction"] | None = None

    @classmethod
    def create(cls, org_id: UUID, tenant_id: UUID) -> "Wallet":
        """
        Factory method for new wallet creation.

        Args:
            org_id: Organization UUID
            tenant_id: Tenant UUID for isolation

        Returns:
            New Wallet entity with zero balance
        """
        return cls(
            id=uuid4(),
            org_id=org_id,
            tenant_id=tenant_id,
            balance_cents=0,
            currency="USD",
            is_active=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

    @property
    def balance(self) -> Decimal:
        """
        Get current balance in dollars/tokens.

        Returns:
            Balance as Decimal (e.g., 100.50 for $100.50)
        """
        return Decimal(self.balance_cents) / Decimal("100")

    def credit(
        self,
        amount_cents: int,
        description: str,
        metadata: dict[str, object] | None = None,
    ) -> "WalletTransaction":
        """
        Add tokens to wallet (credit transaction).

        Args:
            amount_cents: Amount to add in cents
            description: Transaction description
            metadata: Optional metadata (e.g., stripe_payment_intent_id)

        Returns:
            New WalletTransaction entity

        Raises:
            ValueError: If amount is negative
        """
        if amount_cents < 0:
            raise ValueError("Credit amount must be positive")

        # Update balance
        self.balance_cents += amount_cents
        self.updated_at = datetime.now(UTC)

        # Create transaction record
        transaction = WalletTransaction(
            id=uuid4(),
            wallet_id=self.id,
            transaction_type=TransactionType.CREDIT,
            amount_cents=amount_cents,
            balance_after_cents=self.balance_cents,
            description=description,
            metadata=metadata or {},
            tenant_id=self.tenant_id,
            created_at=datetime.now(UTC),
        )

        return transaction

    def debit(
        self,
        amount_cents: int,
        description: str,
        metadata: dict[str, object] | None = None,
    ) -> "WalletTransaction":
        """
        Spend tokens from wallet (debit transaction).

        Args:
            amount_cents: Amount to spend in cents
            description: Transaction description
            metadata: Optional metadata (e.g., listing_id)

        Returns:
            New WalletTransaction entity

        Raises:
            ValueError: If insufficient funds or amount is negative
        """
        if amount_cents < 0:
            raise ValueError("Debit amount must be positive")

        if amount_cents > self.balance_cents:
            raise ValueError(
                f"Insufficient funds. "
                f"Available: {self.balance_cents} cents, "
                f"Required: {amount_cents} cents"
            )

        # Update balance
        self.balance_cents -= amount_cents
        self.updated_at = datetime.now(UTC)

        # Create transaction record
        transaction = WalletTransaction(
            id=uuid4(),
            wallet_id=self.id,
            transaction_type=TransactionType.DEBIT,
            amount_cents=amount_cents,
            balance_after_cents=self.balance_cents,
            description=description,
            metadata=metadata or {},
            tenant_id=self.tenant_id,
            created_at=datetime.now(UTC),
        )

        return transaction

    def can_afford(self, amount_cents: int) -> bool:
        """
        Check if wallet has sufficient balance.

        Args:
            amount_cents: Required amount in cents

        Returns:
            True if sufficient funds, False otherwise
        """
        return self.balance_cents >= amount_cents

    @property
    def is_empty(self) -> bool:
        """Check if wallet has zero balance."""
        return self.balance_cents == 0

    @property
    def balance_in_tokens(self) -> int:
        """
        Get balance in tokens (1 token = $1).

        Returns:
            Balance as integer token count
        """
        return int(self.balance)


class WalletTransaction(DomainModel):
    """
    WalletTransaction entity.

    Records all wallet credit/debit transactions for audit trail.
    """

    # Required fields
    id: UUID
    wallet_id: UUID  # Wallet this transaction belongs to
    transaction_type: TransactionType
    amount_cents: int = Field(..., ge=0)  # Transaction amount in cents
    balance_after_cents: int = Field(..., ge=0)  # Balance after transaction
    description: str = Field(..., min_length=1, max_length=500)
    tenant_id: UUID  # For multi-tenant isolation

    # Optional metadata
    metadata: dict[str, object] = Field(default_factory=dict)

    # Timestamp
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @field_validator("metadata", mode="before")
    @classmethod
    def parse_metadata(cls, v: dict[str, object] | str | None) -> dict[str, object]:
        """
        Parse metadata from JSON string or dict.

        When loading from SQLAlchemy ORM, metadata comes as JSON string.
        This validator converts it to dict automatically.
        """
        if v is None:
            return {}
        if isinstance(v, str):
            import json
            from typing import cast

            return cast(dict[str, object], json.loads(v)) or {}
        return v

    @classmethod
    def create(
        cls,
        wallet_id: UUID,
        transaction_type: TransactionType,
        amount_cents: int,
        balance_after_cents: int,
        description: str,
        tenant_id: UUID,
        metadata: dict[str, object] | None = None,
    ) -> "WalletTransaction":
        """
        Factory method for new transaction.

        Args:
            wallet_id: Wallet UUID
            transaction_type: CREDIT or DEBIT
            amount_cents: Amount in cents
            balance_after_cents: Balance after transaction
            description: Human-readable description
            tenant_id: Tenant UUID
            metadata: Optional metadata

        Returns:
            New WalletTransaction entity
        """
        return cls(
            id=uuid4(),
            wallet_id=wallet_id,
            transaction_type=transaction_type,
            amount_cents=amount_cents,
            balance_after_cents=balance_after_cents,
            description=description,
            tenant_id=tenant_id,
            metadata=metadata or {},
            created_at=datetime.now(UTC),
        )

    @property
    def amount(self) -> Decimal:
        """
        Get transaction amount in dollars.

        Returns:
            Amount as Decimal (e.g., 50.00 for $50.00)
        """
        return Decimal(self.amount_cents) / Decimal("100")

    @property
    def balance_after(self) -> Decimal:
        """
        Get balance after transaction in dollars.

        Returns:
            Balance as Decimal
        """
        return Decimal(self.balance_after_cents) / Decimal("100")

    @property
    def is_credit(self) -> bool:
        """Check if transaction is a credit (adding tokens)."""
        return self.transaction_type.is_credit()

    @property
    def is_debit(self) -> bool:
        """Check if transaction is a debit (spending tokens)."""
        return self.transaction_type.is_debit()

    @property
    def days_since_creation(self) -> int:
        """Calculate days since transaction was created."""
        return (datetime.now(UTC) - self.created_at).days
