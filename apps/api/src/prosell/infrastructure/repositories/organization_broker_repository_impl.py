"""SQLAlchemy adapter for organization_brokers.

Brokers are people (may or may not be users) who can own products.
ponytail: no domain interface — simple CRUD, direct infra.
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.organization_broker_model import OrganizationBrokerModel


@dataclass(frozen=True)
class BrokerInfo:
    """Read model for a broker."""

    id: UUID
    organization_id: UUID
    name: str
    email: str
    phone: str | None
    user_id: UUID | None
    status: str  # pending | verified
    created_at: datetime
    verified_at: datetime | None


def _to_info(broker: OrganizationBrokerModel) -> BrokerInfo:
    return BrokerInfo(
        id=broker.id,
        organization_id=broker.organization_id,
        name=broker.name,
        email=broker.email,
        phone=broker.phone,
        user_id=broker.user_id,
        status=broker.status,
        created_at=broker.created_at,
        verified_at=broker.verified_at,
    )


class SqlAlchemyOrganizationBrokerRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_broker(
        self,
        organization_id: UUID,
        name: str,
        email: str,
        phone: str | None = None,
        user_id: UUID | None = None,
        status: str = "pending",
    ) -> BrokerInfo:
        """Create a new broker for an organization."""
        broker = OrganizationBrokerModel(
            organization_id=organization_id,
            name=name,
            email=email.lower(),
            phone=phone,
            user_id=user_id,
            status=status,
            verified_at=datetime.now() if status == "verified" else None,
        )
        self.session.add(broker)
        await self.session.flush()
        return _to_info(broker)

    async def update_broker(
        self,
        broker_id: UUID,
        name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
    ) -> BrokerInfo | None:
        """Update a broker. Only allowed if status is 'pending'."""
        stmt = select(OrganizationBrokerModel).where(OrganizationBrokerModel.id == broker_id)
        result = await self.session.execute(stmt)
        broker = result.scalar_one_or_none()
        if broker is None:
            return None

        if broker.status == "verified":
            raise ValueError("Cannot edit a verified broker")

        if name is not None:
            broker.name = name
        if email is not None:
            broker.email = email.lower()
        if phone is not None:
            broker.phone = phone

        await self.session.flush()
        return _to_info(broker)

    async def delete_broker(self, broker_id: UUID) -> bool:
        """Delete a broker by id."""
        stmt = delete(OrganizationBrokerModel).where(OrganizationBrokerModel.id == broker_id)
        result = await self.session.execute(stmt)
        await self.session.flush()
        # ponytail: rowcount exists at runtime, pyright doesn't see it
        return int(result.rowcount or 0) > 0  # type: ignore[attr-defined]

    async def get_broker(self, broker_id: UUID) -> BrokerInfo | None:
        """Get a broker by id."""
        stmt = select(OrganizationBrokerModel).where(OrganizationBrokerModel.id == broker_id)
        result = await self.session.execute(stmt)
        broker = result.scalar_one_or_none()
        if broker is None:
            return None
        return _to_info(broker)

    async def list_brokers(self, organization_id: UUID) -> list[BrokerInfo]:
        """List all brokers for an organization."""
        stmt = (
            select(OrganizationBrokerModel)
            .where(OrganizationBrokerModel.organization_id == organization_id)
            .order_by(OrganizationBrokerModel.created_at)
        )
        result = await self.session.execute(stmt)
        return [_to_info(row) for row in result.scalars().all()]

    async def count_brokers(self, organization_id: UUID) -> int:
        """Count brokers for an organization."""
        stmt = (
            select(func.count())
            .select_from(OrganizationBrokerModel)
            .where(OrganizationBrokerModel.organization_id == organization_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def get_by_email(self, organization_id: UUID, email: str) -> BrokerInfo | None:
        """Get a broker by email within an organization."""
        stmt = select(OrganizationBrokerModel).where(
            OrganizationBrokerModel.organization_id == organization_id,
            OrganizationBrokerModel.email == email.lower(),
        )
        result = await self.session.execute(stmt)
        broker = result.scalar_one_or_none()
        if broker is None:
            return None
        return _to_info(broker)

    async def verify_broker(self, broker_id: UUID, user_id: UUID) -> BrokerInfo | None:
        """Mark a broker as verified and link to user account."""
        stmt = (
            update(OrganizationBrokerModel)
            .where(OrganizationBrokerModel.id == broker_id)
            .values(status="verified", user_id=user_id, verified_at=func.now())
            .returning(OrganizationBrokerModel)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        broker = result.scalar_one_or_none()
        if broker is None:
            return None
        return _to_info(broker)

    # Legacy methods for backward compatibility
    async def add_broker(self, organization_id: UUID, user_id: UUID) -> None:
        """Legacy: add broker by user_id (for existing code)."""
        from prosell.infrastructure.models.user_model import UserModel

        stmt = select(UserModel).where(UserModel.id == user_id)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            await self.create_broker(
                organization_id=organization_id,
                name=user.full_name,
                email=user.email,
                user_id=user_id,
                status="verified",
            )

    async def remove_broker(self, organization_id: UUID, user_id: UUID) -> None:
        """Legacy: remove broker by user_id (for existing code)."""
        stmt = delete(OrganizationBrokerModel).where(
            OrganizationBrokerModel.organization_id == organization_id,
            OrganizationBrokerModel.user_id == user_id,
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def is_broker(self, organization_id: UUID, user_id: UUID) -> bool:
        """Check if a user is a broker for an organization."""
        stmt = select(OrganizationBrokerModel).where(
            OrganizationBrokerModel.organization_id == organization_id,
            OrganizationBrokerModel.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None
