"""Unit tests for Wallet use cases."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.dto.wallet import (
    CreditWalletRequest,
    DebitWalletRequest,
)
from prosell.application.use_cases.wallet import (
    CreditWalletUseCase,
    DebitWalletUseCase,
    GetWalletBalanceUseCase,
    GetWalletTransactionsUseCase,
)
from prosell.domain.entities.wallet import TransactionType, Wallet, WalletTransaction
from prosell.domain.exceptions.org_exceptions import (
    InsufficientFundsException,
    WalletNotFoundException,
)

# =============================================================================
# HELPERS
# =============================================================================


def make_wallet(balance_cents: int = 10000) -> Wallet:
    org_id = uuid4()
    tenant_id = uuid4()
    wallet = Wallet.create(org_id=org_id, tenant_id=tenant_id)
    wallet.balance_cents = balance_cents
    return wallet


def make_wallet_repo() -> AsyncMock:
    from unittest.mock import MagicMock

    repo = MagicMock()
    repo.get_by_org = AsyncMock(return_value=None)
    repo.update = AsyncMock()
    return repo


def make_wallet_transaction_repo() -> AsyncMock:
    from unittest.mock import MagicMock

    repo = MagicMock()
    repo.create = AsyncMock()
    repo.get_by_org = AsyncMock(return_value=[])
    repo.count = AsyncMock(return_value=0)
    return repo


# =============================================================================
# GetWalletBalanceUseCase
# =============================================================================


class TestGetWalletBalanceUseCase:
    async def test_get_balance_success(self) -> None:
        wallet = make_wallet(balance_cents=5000)
        wallet_repo = make_wallet_repo()
        wallet_repo.get_by_org.return_value = wallet

        use_case = GetWalletBalanceUseCase(wallet_repository=wallet_repo)
        result = await use_case.execute(org_id=wallet.org_id, tenant_id=wallet.tenant_id)

        assert result.balance_cents == 5000
        assert result.balance == 50.00

    async def test_get_balance_raises_when_not_found(self) -> None:
        wallet_repo = make_wallet_repo()
        wallet_repo.get_by_org.return_value = None

        use_case = GetWalletBalanceUseCase(wallet_repository=wallet_repo)

        with pytest.raises(WalletNotFoundException):
            await use_case.execute(org_id=uuid4(), tenant_id=uuid4())


# =============================================================================
# CreditWalletUseCase
# =============================================================================


class TestCreditWalletUseCase:
    async def test_credit_success(self) -> None:
        wallet = make_wallet(balance_cents=10000)
        wallet_repo = make_wallet_repo()
        wallet_repo.get_by_org.return_value = wallet

        txn_repo = make_wallet_transaction_repo()

        request = CreditWalletRequest(
            org_id=wallet.org_id,
            tenant_id=wallet.tenant_id,
            amount_cents=5000,
            description="Recharge via Stripe",
            metadata={"stripe_payment_intent_id": "pi_123"},
        )
        use_case = CreditWalletUseCase(
            wallet_repository=wallet_repo,
            wallet_transaction_repository=txn_repo,
        )

        result = await use_case.execute(request)

        assert result.transaction_type == TransactionType.CREDIT.value
        assert result.amount_cents == 5000
        assert result.balance_after_cents == 15000  # 10000 + 5000
        wallet_repo.update.assert_awaited_once()
        txn_repo.create.assert_awaited_once()

    async def test_credit_raises_when_wallet_not_found(self) -> None:
        wallet_repo = make_wallet_repo()
        wallet_repo.get_by_org.return_value = None

        txn_repo = make_wallet_transaction_repo()

        request = CreditWalletRequest(
            org_id=uuid4(),
            tenant_id=uuid4(),
            amount_cents=1000,
            description="Recharge",
        )
        use_case = CreditWalletUseCase(
            wallet_repository=wallet_repo,
            wallet_transaction_repository=txn_repo,
        )

        with pytest.raises(WalletNotFoundException):
            await use_case.execute(request)


# =============================================================================
# DebitWalletUseCase
# =============================================================================


class TestDebitWalletUseCase:
    async def test_debit_success(self) -> None:
        wallet = make_wallet(balance_cents=10000)
        wallet_repo = make_wallet_repo()
        wallet_repo.get_by_org.return_value = wallet

        txn_repo = make_wallet_transaction_repo()

        request = DebitWalletRequest(
            org_id=wallet.org_id,
            tenant_id=wallet.tenant_id,
            amount_cents=3000,
            description="Listing fee",
        )
        use_case = DebitWalletUseCase(
            wallet_repository=wallet_repo,
            wallet_transaction_repository=txn_repo,
        )

        result = await use_case.execute(request)

        assert result.transaction_type == TransactionType.DEBIT.value
        assert result.amount_cents == 3000
        assert result.balance_after_cents == 7000  # 10000 - 3000

    async def test_debit_raises_insufficient_funds(self) -> None:
        wallet = make_wallet(balance_cents=1000)
        wallet_repo = make_wallet_repo()
        wallet_repo.get_by_org.return_value = wallet

        txn_repo = make_wallet_transaction_repo()

        request = DebitWalletRequest(
            org_id=wallet.org_id,
            tenant_id=wallet.tenant_id,
            amount_cents=5000,  # More than balance
            description="Listing fee",
        )
        use_case = DebitWalletUseCase(
            wallet_repository=wallet_repo,
            wallet_transaction_repository=txn_repo,
        )

        with pytest.raises(InsufficientFundsException) as exc_info:
            await use_case.execute(request)

        assert "1000" in str(exc_info.value.details["available_cents"])
        assert "5000" in str(exc_info.value.details["required_cents"])

    async def test_debit_raises_when_wallet_not_found(self) -> None:
        wallet_repo = make_wallet_repo()
        wallet_repo.get_by_org.return_value = None

        txn_repo = make_wallet_transaction_repo()

        request = DebitWalletRequest(
            org_id=uuid4(),
            tenant_id=uuid4(),
            amount_cents=1000,
            description="Listing fee",
        )
        use_case = DebitWalletUseCase(
            wallet_repository=wallet_repo,
            wallet_transaction_repository=txn_repo,
        )

        with pytest.raises(WalletNotFoundException):
            await use_case.execute(request)


# =============================================================================
# GetWalletTransactionsUseCase
# =============================================================================


class TestGetWalletTransactionsUseCase:
    async def test_get_transactions_success(self) -> None:
        txn_repo = make_wallet_transaction_repo()

        txn = WalletTransaction.create(
            wallet_id=uuid4(),
            transaction_type=TransactionType.CREDIT,
            amount_cents=5000,
            balance_after_cents=5000,
            description="Recharge",
            tenant_id=uuid4(),
        )
        txn_repo.get_by_org.return_value = [txn]
        txn_repo.count.return_value = 1

        use_case = GetWalletTransactionsUseCase(
            wallet_transaction_repository=txn_repo,
        )
        result = await use_case.execute(org_id=uuid4(), tenant_id=uuid4())

        assert result.total == 1
        assert len(result.transactions) == 1
        assert result.transactions[0].transaction_type == TransactionType.CREDIT.value
