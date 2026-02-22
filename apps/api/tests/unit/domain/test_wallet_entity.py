"""Unit tests for Wallet and WalletTransaction entities."""

from uuid import UUID, uuid4

import pytest

from prosell.domain.entities.wallet import TransactionType, Wallet, WalletTransaction


class TestWalletFactory:
    """Test Wallet entity factory method."""

    def test_create_wallet_factory(self) -> None:
        """Test Wallet.create() factory method."""
        org_id = uuid4()
        tenant_id = uuid4()

        wallet = Wallet.create(org_id=org_id, tenant_id=tenant_id)

        assert isinstance(wallet.id, UUID)
        assert wallet.org_id == org_id
        assert wallet.tenant_id == tenant_id
        assert wallet.balance_cents == 0
        assert wallet.balance == 0
        assert wallet.currency == "USD"
        assert wallet.is_active is True

    def test_create_wallet_generates_unique_ids(self) -> None:
        """Test that factory creates unique UUIDs."""
        org_id = uuid4()
        tenant_id = uuid4()

        wallet1 = Wallet.create(org_id, tenant_id)
        wallet2 = Wallet.create(org_id, tenant_id)

        assert wallet1.id != wallet2.id


class TestWalletBalance:
    """Test wallet balance operations."""

    def test_balance_property_returns_decimal(self) -> None:
        """Test that balance property returns Decimal."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())

        assert wallet.balance == 0

    def test_balance_cents_to_dollars(self) -> None:
        """Test converting cents to dollars."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())
        wallet.balance_cents = 10000  # $100.00

        assert wallet.balance == 100
        assert wallet.balance == 100.00

    def test_balance_in_tokens(self) -> None:
        """Test balance_in_tokens property."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())
        wallet.balance_cents = 5000  # $50.00

        assert wallet.balance_in_tokens == 50


class TestWalletCredit:
    """Test wallet credit operations."""

    def test_credit_adds_to_balance(self) -> None:
        """Test that credit() adds tokens to balance."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())

        transaction = wallet.credit(
            amount_cents=5000,  # $50.00
            description="Token purchase",
        )

        assert wallet.balance_cents == 5000
        assert wallet.balance == 50
        assert transaction.amount_cents == 5000
        assert transaction.balance_after_cents == 5000

    def test_credit_creates_transaction(self) -> None:
        """Test that credit() creates a transaction record."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())

        transaction = wallet.credit(
            amount_cents=10000,
            description="Recharge",
            metadata={"stripe_pi": "pi_123"},
        )

        assert transaction.transaction_type == TransactionType.CREDIT
        assert transaction.description == "Recharge"
        assert transaction.metadata == {"stripe_pi": "pi_123"}

    def test_credit_updates_timestamp(self) -> None:
        """Test that credit() updates updated_at."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())
        original_updated_at = wallet.updated_at

        import time

        time.sleep(0.01)
        wallet.credit(1000, "Test")

        assert wallet.updated_at > original_updated_at

    def test_credit_negative_amount_fails(self) -> None:
        """Test that negative credit raises error."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())

        with pytest.raises(ValueError, match="Credit amount must be positive"):
            wallet.credit(amount_cents=-100, description="Test")


class TestWalletDebit:
    """Test wallet debit operations."""

    def test_debit_removes_from_balance(self) -> None:
        """Test that debit() removes tokens from balance."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())
        wallet.credit(10000, "Initial balance")  # $100.00

        transaction = wallet.debit(
            amount_cents=2500,  # $25.00
            description="Listing fee",
        )

        assert wallet.balance_cents == 7500  # $75.00
        assert transaction.amount_cents == 2500
        assert transaction.balance_after_cents == 7500

    def test_debit_creates_transaction(self) -> None:
        """Test that debit() creates a transaction record."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())
        wallet.credit(10000, "Initial")

        transaction = wallet.debit(
            amount_cents=1000,
            description="Listing fee",
            metadata={"listing_id": "list_123"},
        )

        assert transaction.transaction_type == TransactionType.DEBIT
        assert transaction.description == "Listing fee"
        assert transaction.metadata == {"listing_id": "list_123"}

    def test_debit_insufficient_funds_fails(self) -> None:
        """Test that debit() fails with insufficient funds."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())
        wallet.credit(1000, "Small balance")  # $10.00

        with pytest.raises(ValueError, match="Insufficient funds"):
            wallet.debit(
                amount_cents=5000,  # $50.00
                description="Test",
            )

    def test_debit_negative_amount_fails(self) -> None:
        """Test that negative debit raises error."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())

        with pytest.raises(ValueError, match="Debit amount must be positive"):
            wallet.debit(amount_cents=-100, description="Test")


class TestWalletValidation:
    """Test wallet validation methods."""

    def test_can_afford_sufficient_funds(self) -> None:
        """Test can_afford() returns True with sufficient funds."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())
        wallet.credit(10000, "Balance")

        assert wallet.can_afford(5000) is True
        assert wallet.can_afford(10000) is True

    def test_can_afford_insufficient_funds(self) -> None:
        """Test can_afford() returns False with insufficient funds."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())
        wallet.credit(1000, "Small balance")

        assert wallet.can_afford(5000) is False

    def test_is_empty_zero_balance(self) -> None:
        """Test is_empty() returns True for zero balance."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())

        assert wallet.is_empty is True

    def test_is_empty_with_balance(self) -> None:
        """Test is_empty() returns False with balance."""
        wallet = Wallet.create(org_id=uuid4(), tenant_id=uuid4())
        wallet.credit(100, "Some balance")

        assert wallet.is_empty is False


class TestWalletTransactionFactory:
    """Test WalletTransaction entity factory method."""

    def test_create_transaction_factory(self) -> None:
        """Test WalletTransaction.create() factory method."""
        wallet_id = uuid4()
        tenant_id = uuid4()

        transaction = WalletTransaction.create(
            wallet_id=wallet_id,
            transaction_type=TransactionType.CREDIT,
            amount_cents=5000,
            balance_after_cents=5000,
            description="Test transaction",
            tenant_id=tenant_id,
        )

        assert isinstance(transaction.id, UUID)
        assert transaction.wallet_id == wallet_id
        assert transaction.transaction_type == TransactionType.CREDIT
        assert transaction.amount_cents == 5000
        assert transaction.balance_after_cents == 5000

    def test_create_transaction_with_metadata(self) -> None:
        """Test creating transaction with metadata."""
        transaction = WalletTransaction.create(
            wallet_id=uuid4(),
            transaction_type=TransactionType.DEBIT,
            amount_cents=1000,
            balance_after_cents=9000,
            description="Test",
            tenant_id=uuid4(),
            metadata={"key": "value"},
        )

        assert transaction.metadata == {"key": "value"}


class TestWalletTransactionProperties:
    """Test wallet transaction property methods."""

    def test_amount_returns_decimal(self) -> None:
        """Test amount property returns Decimal."""
        transaction = WalletTransaction.create(
            wallet_id=uuid4(),
            transaction_type=TransactionType.CREDIT,
            amount_cents=10000,  # $100.00
            balance_after_cents=10000,
            description="Test",
            tenant_id=uuid4(),
        )

        assert transaction.amount == 100

    def test_balance_after_returns_decimal(self) -> None:
        """Test balance_after property returns Decimal."""
        transaction = WalletTransaction.create(
            wallet_id=uuid4(),
            transaction_type=TransactionType.CREDIT,
            amount_cents=5000,
            balance_after_cents=15000,
            description="Test",
            tenant_id=uuid4(),
        )

        assert transaction.balance_after == 150

    def test_is_credit(self) -> None:
        """Test is_credit property."""
        credit_txn = WalletTransaction.create(
            wallet_id=uuid4(),
            transaction_type=TransactionType.CREDIT,
            amount_cents=1000,
            balance_after_cents=1000,
            description="Test",
            tenant_id=uuid4(),
        )

        assert credit_txn.is_credit is True
        assert credit_txn.is_debit is False

    def test_is_debit(self) -> None:
        """Test is_debit property."""
        debit_txn = WalletTransaction.create(
            wallet_id=uuid4(),
            transaction_type=TransactionType.DEBIT,
            amount_cents=1000,
            balance_after_cents=0,
            description="Test",
            tenant_id=uuid4(),
        )

        assert debit_txn.is_debit is True
        assert debit_txn.is_credit is False

    def test_days_since_creation(self) -> None:
        """Test days_since_creation property."""
        transaction = WalletTransaction.create(
            wallet_id=uuid4(),
            transaction_type=TransactionType.CREDIT,
            amount_cents=1000,
            balance_after_cents=1000,
            description="Test",
            tenant_id=uuid4(),
        )

        days = transaction.days_since_creation
        assert days == 0
        assert isinstance(days, int)


class TestTransactionTypeValueObject:
    """Test TransactionType value object."""

    def test_type_is_credit(self) -> None:
        """Test TransactionType.is_credit()."""
        assert TransactionType.CREDIT.is_credit() is True
        assert TransactionType.DEBIT.is_credit() is False

    def test_type_is_debit(self) -> None:
        """Test TransactionType.is_debit()."""
        assert TransactionType.DEBIT.is_debit() is True
        assert TransactionType.CREDIT.is_debit() is False
