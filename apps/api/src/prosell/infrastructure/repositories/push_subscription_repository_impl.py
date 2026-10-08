"""SQLAlchemy implementation of AbstractPushSubscriptionRepository."""

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.push_subscription import PushSubscription
from prosell.domain.repositories.push_subscription_repository import (
    AbstractPushSubscriptionRepository,
)
from prosell.infrastructure.models.push_subscription_model import PushSubscriptionModel


class SqlAlchemyPushSubscriptionRepository(AbstractPushSubscriptionRepository):
    """SQLAlchemy implementation of AbstractPushSubscriptionRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _to_entity(model: PushSubscriptionModel) -> PushSubscription:
        return PushSubscription(
            id=model.id,
            tenant_id=model.tenant_id,
            user_id=model.user_id,
            endpoint=model.endpoint,
            p256dh=model.p256dh,
            auth=model.auth,
            created_at=model.created_at,
        )

    async def upsert(self, subscription: PushSubscription) -> PushSubscription:
        stmt = (
            pg_insert(PushSubscriptionModel)
            .values(
                id=subscription.id,
                tenant_id=subscription.tenant_id,
                user_id=subscription.user_id,
                endpoint=subscription.endpoint,
                p256dh=subscription.p256dh,
                auth=subscription.auth,
                created_at=subscription.created_at,
            )
            .on_conflict_do_update(
                index_elements=["endpoint"],
                set_={
                    "tenant_id": subscription.tenant_id,
                    "user_id": subscription.user_id,
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                },
            )
            .returning(PushSubscriptionModel)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        model = result.scalar_one()
        return self._to_entity(model)

    async def delete_by_endpoint(
        self,
        endpoint: str,
        user_id: UUID,
        tenant_id: UUID,
    ) -> None:
        stmt = delete(PushSubscriptionModel).where(
            PushSubscriptionModel.endpoint == endpoint,
            PushSubscriptionModel.user_id == user_id,
            PushSubscriptionModel.tenant_id == tenant_id,
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def list_for_user(self, user_id: UUID, tenant_id: UUID) -> list[PushSubscription]:
        stmt = select(PushSubscriptionModel).where(
            PushSubscriptionModel.user_id == user_id,
            PushSubscriptionModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        return [self._to_entity(model) for model in result.scalars().all()]
