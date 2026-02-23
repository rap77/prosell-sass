"""Wallet operations use cases."""

from uuid import UUID

from prosell.application.dto.wallet import (
    CreditWalletRequest,
    DebitWalletRequest,
    WalletResponse,
    WalletTransactionResponse,
    WalletTransactionsResponse,
)
from prosell.domain.exceptions.org_exceptions import (
    InsufficientFundsException,
    WalletNotFoundException,
)
from prosell.domain.repositories.wallet_repository import (
    AbstractWalletRepository,
    AbstractWalletTransactionRepository,
)


class GetWalletBalanceUseCase:
    """Get wallet balance for an organization."""

    def __init__(
        self,
        wallet_repository: AbstractWalletRepository,
    ) -> None:
        self.wallet_repository = wallet_repository

    async def execute(self, org_id: UUID, tenant_id: UUID) -> WalletResponse:
        """
        Get wallet by organization ID.

        Args:
            org_id: Organization UUID
            tenant_id: Tenant UUID for isolation

        Returns:
            WalletResponse DTO

        Raises:
            WalletNotFoundException: If wallet not found
        """
        wallet = await self.wallet_repository.get_by_org(org_id, tenant_id)
        if not wallet:
            raise WalletNotFoundException(str(org_id))

        return WalletResponse.from_entity(wallet)


class CreditWalletUseCase:
    """Credit tokens to wallet (recharge)."""

    def __init__(
        self,
        wallet_repository: AbstractWalletRepository,
        wallet_transaction_repository: AbstractWalletTransactionRepository,
    ) -> None:
        self.wallet_repository = wallet_repository
        self.wallet_transaction_repository = wallet_transaction_repository

    async def execute(self, request: CreditWalletRequest) -> WalletTransactionResponse:
        """
        Credit tokens to wallet.

        Args:
            request: CreditWalletRequest DTO

        Returns:
            WalletTransactionResponse DTO

        Raises:
            WalletNotFoundException: If wallet not found
            ValueError: If amount is invalid
        """
        # 1. Get wallet
        wallet = await self.wallet_repository.get_by_org(request.org_id, request.tenant_id)
        if not wallet:
            raise WalletNotFoundException(str(request.org_id))

        # 2. Credit via entity method (handles validation and creates transaction)
        transaction = wallet.credit(
            amount_cents=request.amount_cents,
            description=request.description,
            metadata=request.metadata,
        )

        # 3. Persist updated wallet
        await self.wallet_repository.update(wallet)

        # 4. Persist transaction record
        await self.wallet_transaction_repository.create(transaction)

        return WalletTransactionResponse.from_entity(transaction)


class DebitWalletUseCase:
    """Debit tokens from wallet (spend)."""

    def __init__(
        self,
        wallet_repository: AbstractWalletRepository,
        wallet_transaction_repository: AbstractWalletTransactionRepository,
    ) -> None:
        self.wallet_repository = wallet_repository
        self.wallet_transaction_repository = wallet_transaction_repository

    async def execute(self, request: DebitWalletRequest) -> WalletTransactionResponse:
        """
        Debit tokens from wallet.

        Args:
            request: DebitWalletRequest DTO

        Returns:
            WalletTransactionResponse DTO

        Raises:
            WalletNotFoundException: If wallet not found
            InsufficientFundsException: If balance insufficient
            ValueError: If amount is invalid
        """
        # 1. Get wallet
        wallet = await self.wallet_repository.get_by_org(request.org_id, request.tenant_id)
        if not wallet:
            raise WalletNotFoundException(str(request.org_id))

        # 2. Check sufficient funds
        if not wallet.can_afford(request.amount_cents):
            raise InsufficientFundsException(
                available=wallet.balance_cents,
                required=request.amount_cents,
            )

        # 3. Debit via entity method (handles validation and creates transaction)
        transaction = wallet.debit(
            amount_cents=request.amount_cents,
            description=request.description,
            metadata=request.metadata,
        )

        # 4. Persist updated wallet
        await self.wallet_repository.update(wallet)

        # 5. Persist transaction record
        await self.wallet_transaction_repository.create(transaction)

        return WalletTransactionResponse.from_entity(transaction)


class GetWalletTransactionsUseCase:
    """Get transaction history for an organization."""

    def __init__(
        self,
        wallet_transaction_repository: AbstractWalletTransactionRepository,
    ) -> None:
        self.wallet_transaction_repository = wallet_transaction_repository

    async def execute(
        self,
        org_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> WalletTransactionsResponse:
        """
        Get wallet transactions for an organization.

        Args:
            org_id: Organization UUID
            tenant_id: Tenant UUID for isolation
            skip: Pagination offset
            limit: Pagination limit

        Returns:
            WalletTransactionsResponse DTO
        """
        transactions = await self.wallet_transaction_repository.get_by_org(
            org_id=org_id,
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
        )
        total = await self.wallet_transaction_repository.count(tenant_id=tenant_id)

        return WalletTransactionsResponse(
            transactions=[WalletTransactionResponse.from_entity(t) for t in transactions],
            total=total,
            skip=skip,
            limit=limit,
        )
