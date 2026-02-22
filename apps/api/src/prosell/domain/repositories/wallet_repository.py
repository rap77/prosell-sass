"""Wallet repository interface."""

from abc import ABC, abstractmethod
from uuid import UUID

from prosell.domain.entities.wallet import Wallet, WalletTransaction


class AbstractWalletRepository(ABC):
    """Repository interface for Wallet entities."""

    @abstractmethod
    async def create(self, wallet: Wallet) -> Wallet:
        """Create a new wallet."""
        pass

    @abstractmethod
    async def get_by_id(self, wallet_id: UUID, tenant_id: UUID) -> Wallet | None:
        """Get wallet by ID (with tenant isolation)."""
        pass

    @abstractmethod
    async def get_by_org(self, org_id: UUID, tenant_id: UUID) -> Wallet | None:
        """Get wallet by organization ID."""
        pass

    @abstractmethod
    async def get_all(
        self,
        tenant_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Wallet]:
        """Get all wallets (with optional tenant filtering)."""
        pass

    @abstractmethod
    async def update(self, wallet: Wallet) -> Wallet:
        """Update an existing wallet."""
        pass

    @abstractmethod
    async def delete(self, wallet_id: UUID, tenant_id: UUID) -> bool:
        """Delete a wallet."""
        pass

    @abstractmethod
    async def exists_by_org(self, org_id: UUID, tenant_id: UUID) -> bool:
        """Check if wallet exists for organization."""
        pass

    @abstractmethod
    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count total wallets."""
        pass


class AbstractWalletTransactionRepository(ABC):
    """Repository interface for WalletTransaction entities."""

    @abstractmethod
    async def create(self, transaction: WalletTransaction) -> WalletTransaction:
        """Create a new transaction record."""
        pass

    @abstractmethod
    async def get_by_id(
        self,
        transaction_id: UUID,
        tenant_id: UUID,
    ) -> WalletTransaction | None:
        """Get transaction by ID (with tenant isolation)."""
        pass

    @abstractmethod
    async def get_by_wallet(
        self,
        wallet_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[WalletTransaction]:
        """Get all transactions for a wallet."""
        pass

    @abstractmethod
    async def get_by_org(
        self,
        org_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[WalletTransaction]:
        """Get all transactions for an organization."""
        pass

    @abstractmethod
    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count total transactions."""
        pass
