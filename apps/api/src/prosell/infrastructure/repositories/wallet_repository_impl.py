"""SQLAlchemy implementations of Wallet and WalletTransaction repositories."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.wallet import TransactionType, Wallet, WalletTransaction
from prosell.domain.repositories.wallet_repository import (
    AbstractWalletRepository,
    AbstractWalletTransactionRepository,
)
from prosell.infrastructure.models.wallet_model import WalletModel, WalletTransactionModel


class SqlAlchemyWalletRepository(AbstractWalletRepository):
    """SQLAlchemy implementation of WalletRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, wallet: Wallet) -> Wallet:
        """Create a new wallet."""
        model = WalletModel(
            id=wallet.id,
            org_id=wallet.org_id,
            tenant_id=wallet.tenant_id,
            balance_cents=wallet.balance_cents,
            currency=wallet.currency,
            is_active=wallet.is_active,
            created_at=wallet.created_at,
            updated_at=wallet.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, wallet_id: UUID, tenant_id: UUID) -> Wallet | None:
        """Get wallet by ID with tenant isolation."""
        stmt = select(WalletModel).where(
            WalletModel.id == wallet_id,
            WalletModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_org(self, org_id: UUID, tenant_id: UUID) -> Wallet | None:
        """Get wallet by organization ID."""
        stmt = select(WalletModel).where(
            WalletModel.org_id == org_id,
            WalletModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_all(
        self,
        tenant_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Wallet]:
        """Get all wallets with optional tenant filter."""
        stmt = select(WalletModel)
        if tenant_id is not None:
            stmt = stmt.where(WalletModel.tenant_id == tenant_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def update(self, wallet: Wallet) -> Wallet:
        """Update an existing wallet."""
        stmt = select(WalletModel).where(WalletModel.id == wallet.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"Wallet not found: {wallet.id}")

        model.balance_cents = wallet.balance_cents
        model.is_active = wallet.is_active
        model.currency = wallet.currency

        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, wallet_id: UUID, tenant_id: UUID) -> bool:
        """Deactivate wallet (soft delete)."""
        stmt = select(WalletModel).where(
            WalletModel.id == wallet_id,
            WalletModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return False

        model.is_active = False
        await self.session.flush()
        return True

    async def exists_by_org(self, org_id: UUID, tenant_id: UUID) -> bool:
        """Check if wallet exists for organization."""
        stmt = select(func.count(WalletModel.id)).where(
            WalletModel.org_id == org_id,
            WalletModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0
        return count > 0

    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count wallets."""
        stmt = select(func.count(WalletModel.id))
        if tenant_id is not None:
            stmt = stmt.where(WalletModel.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    def _to_entity(self, model: WalletModel) -> Wallet:
        """Convert ORM model to domain entity."""
        return Wallet.model_validate(model, from_attributes=True)


class SqlAlchemyWalletTransactionRepository(AbstractWalletTransactionRepository):
    """SQLAlchemy implementation of WalletTransactionRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, transaction: WalletTransaction) -> WalletTransaction:
        """Create a new transaction record."""
        model = WalletTransactionModel(
            id=transaction.id,
            wallet_id=transaction.wallet_id,
            transaction_type=transaction.transaction_type.value,
            amount_cents=transaction.amount_cents,
            balance_after_cents=transaction.balance_after_cents,
            description=transaction.description,
            tenant_id=transaction.tenant_id,
            metadata_=transaction.metadata,
            created_at=transaction.created_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(
        self,
        transaction_id: UUID,
        tenant_id: UUID,
    ) -> WalletTransaction | None:
        """Get transaction by ID with tenant isolation."""
        stmt = select(WalletTransactionModel).where(
            WalletTransactionModel.id == transaction_id,
            WalletTransactionModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_wallet(
        self,
        wallet_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[WalletTransaction]:
        """Get all transactions for a wallet."""
        stmt = (
            select(WalletTransactionModel)
            .where(
                WalletTransactionModel.wallet_id == wallet_id,
                WalletTransactionModel.tenant_id == tenant_id,
            )
            .order_by(WalletTransactionModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_by_org(
        self,
        org_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[WalletTransaction]:
        """Get all transactions for an organization (via wallet join)."""
        stmt = (
            select(WalletTransactionModel)
            .join(WalletModel, WalletModel.id == WalletTransactionModel.wallet_id)
            .where(
                WalletModel.org_id == org_id,
                WalletTransactionModel.tenant_id == tenant_id,
            )
            .order_by(WalletTransactionModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count transactions."""
        stmt = select(func.count(WalletTransactionModel.id))
        if tenant_id is not None:
            stmt = stmt.where(WalletTransactionModel.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    def _to_entity(self, model: WalletTransactionModel) -> WalletTransaction:
        """Convert ORM model to domain entity."""
        return WalletTransaction(
            id=model.id,
            wallet_id=model.wallet_id,
            transaction_type=TransactionType(model.transaction_type),
            amount_cents=model.amount_cents,
            balance_after_cents=model.balance_after_cents,
            description=model.description,
            tenant_id=model.tenant_id,
            metadata=model.metadata_,
            created_at=model.created_at,
        )
