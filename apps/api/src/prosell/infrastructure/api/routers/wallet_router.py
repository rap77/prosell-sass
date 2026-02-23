"""Wallet router for ProSell SaaS API."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.wallet import (
    CreditWalletRequest,
    DebitWalletRequest,
    WalletResponse,
    WalletTransactionsResponse,
)
from prosell.application.use_cases.wallet import (
    CreditWalletUseCase,
    DebitWalletUseCase,
    GetWalletBalanceUseCase,
    GetWalletTransactionsUseCase,
)
from prosell.domain.exceptions.org_exceptions import (
    InsufficientFundsException,
    OrgDomainException,
    WalletNotFoundException,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.wallet_repository_impl import (
    SqlAlchemyWalletRepository,
    SqlAlchemyWalletTransactionRepository,
)

router = APIRouter()


# =============================================================================
# DEPENDENCY FACTORIES
# =============================================================================


def get_wallet_repository(
    session: AsyncSession = Depends(get_async_session),
) -> SqlAlchemyWalletRepository:
    """Get wallet repository instance."""
    return SqlAlchemyWalletRepository(session)


def get_wallet_transaction_repository(
    session: AsyncSession = Depends(get_async_session),
) -> SqlAlchemyWalletTransactionRepository:
    """Get wallet transaction repository instance."""
    return SqlAlchemyWalletTransactionRepository(session)


# =============================================================================
# WALLET ENDPOINTS
# =============================================================================


@router.get(
    "/org/{org_id}",
    response_model=WalletResponse,
    summary="Get wallet balance for organization",
)
async def get_wallet_balance(
    org_id: UUID,
    tenant_id: UUID,  # TODO: from get_current_user
    wallet_repo: SqlAlchemyWalletRepository = Depends(get_wallet_repository),
) -> WalletResponse:
    """Get wallet by organization ID."""
    use_case = GetWalletBalanceUseCase(wallet_repository=wallet_repo)
    try:
        return await use_case.execute(org_id=org_id, tenant_id=tenant_id)
    except WalletNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e


@router.get(
    "/org/{org_id}/transactions",
    response_model=WalletTransactionsResponse,
    summary="Get wallet transaction history",
)
async def get_wallet_transactions(
    org_id: UUID,
    tenant_id: UUID,  # TODO: from get_current_user
    skip: int = 0,
    limit: int = 100,
    wallet_txn_repo: SqlAlchemyWalletTransactionRepository = Depends(
        get_wallet_transaction_repository,
    ),
) -> WalletTransactionsResponse:
    """Get transaction history for an organization's wallet."""
    use_case = GetWalletTransactionsUseCase(
        wallet_transaction_repository=wallet_txn_repo,
    )
    return await use_case.execute(org_id=org_id, tenant_id=tenant_id, skip=skip, limit=limit)


@router.post(
    "/credit",
    response_model=WalletResponse,
    summary="Credit tokens to wallet (recharge)",
)
async def credit_wallet(
    request: CreditWalletRequest,
    wallet_repo: SqlAlchemyWalletRepository = Depends(get_wallet_repository),
    wallet_txn_repo: SqlAlchemyWalletTransactionRepository = Depends(
        get_wallet_transaction_repository,
    ),
) -> WalletResponse:
    """
    Credit tokens to wallet (recharge).

    Normally called after successful Stripe payment.
    """
    use_case = CreditWalletUseCase(
        wallet_repository=wallet_repo,
        wallet_transaction_repository=wallet_txn_repo,
    )
    try:
        await use_case.execute(request)
        # Return updated wallet
        wallet = await wallet_repo.get_by_org(request.org_id, request.tenant_id)
        return WalletResponse.from_entity(wallet)
    except WalletNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
    except (ValueError, OrgDomainException) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post(
    "/debit",
    response_model=WalletResponse,
    summary="Debit tokens from wallet (spend)",
)
async def debit_wallet(
    request: DebitWalletRequest,
    wallet_repo: SqlAlchemyWalletRepository = Depends(get_wallet_repository),
    wallet_txn_repo: SqlAlchemyWalletTransactionRepository = Depends(
        get_wallet_transaction_repository,
    ),
) -> WalletResponse:
    """
    Debit tokens from wallet (spend).

    Used for operations like listing fees, feature purchases, etc.
    """
    use_case = DebitWalletUseCase(
        wallet_repository=wallet_repo,
        wallet_transaction_repository=wallet_txn_repo,
    )
    try:
        await use_case.execute(request)
        # Return updated wallet
        wallet = await wallet_repo.get_by_org(request.org_id, request.tenant_id)
        return WalletResponse.from_entity(wallet)
    except WalletNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message) from e
    except InsufficientFundsException as e:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=e.message) from e
    except (ValueError, OrgDomainException) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
