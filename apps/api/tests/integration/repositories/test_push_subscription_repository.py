"""Integration tests for SqlAlchemyPushSubscriptionRepository - TDD RED phase.

CRM roadmap Fase 5 (deferred delivery channel, now built).
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.push_subscription import PushSubscription
from prosell.infrastructure.repositories.push_subscription_repository_impl import (
    SqlAlchemyPushSubscriptionRepository,
)


class TestPushSubscriptionRepository:
    """Tests for upsert()/delete_by_endpoint()/list_for_user()."""

    @pytest.mark.asyncio
    async def test_upsert_creates_and_is_retrievable(
        self, db_session, test_organization, test_user
    ):
        repo = SqlAlchemyPushSubscriptionRepository(db_session)
        tenant_id = test_organization.tenant_id

        subscription = PushSubscription.create(
            tenant_id=tenant_id,
            user_id=test_user.id,
            endpoint="https://fcm.googleapis.com/fcm/send/abc123",
            p256dh="BNcRd...key",
            auth="tBHI...secret",
        )
        created = await repo.upsert(subscription)

        assert created.endpoint == "https://fcm.googleapis.com/fcm/send/abc123"

        fetched = await repo.list_for_user(test_user.id, tenant_id)
        assert len(fetched) == 1
        assert fetched[0].endpoint == "https://fcm.googleapis.com/fcm/send/abc123"

    @pytest.mark.asyncio
    async def test_upsert_same_endpoint_replaces_keys_not_duplicates(
        self, db_session, test_organization, test_user
    ):
        repo = SqlAlchemyPushSubscriptionRepository(db_session)
        tenant_id = test_organization.tenant_id

        first = PushSubscription.create(
            tenant_id=tenant_id,
            user_id=test_user.id,
            endpoint="https://fcm.googleapis.com/fcm/send/same",
            p256dh="old-key",
            auth="old-secret",
        )
        await repo.upsert(first)

        second = PushSubscription.create(
            tenant_id=tenant_id,
            user_id=test_user.id,
            endpoint="https://fcm.googleapis.com/fcm/send/same",
            p256dh="new-key",
            auth="new-secret",
        )
        await repo.upsert(second)

        fetched = await repo.list_for_user(test_user.id, tenant_id)
        assert len(fetched) == 1
        assert fetched[0].p256dh == "new-key"

    @pytest.mark.asyncio
    async def test_delete_by_endpoint_removes_subscription(
        self, db_session, test_organization, test_user
    ):
        repo = SqlAlchemyPushSubscriptionRepository(db_session)
        tenant_id = test_organization.tenant_id

        subscription = PushSubscription.create(
            tenant_id=tenant_id,
            user_id=test_user.id,
            endpoint="https://fcm.googleapis.com/fcm/send/to-delete",
            p256dh="key",
            auth="secret",
        )
        await repo.upsert(subscription)

        await repo.delete_by_endpoint(
            "https://fcm.googleapis.com/fcm/send/to-delete", test_user.id, tenant_id
        )

        fetched = await repo.list_for_user(test_user.id, tenant_id)
        assert fetched == []

    @pytest.mark.asyncio
    async def test_delete_by_endpoint_noop_when_not_found(
        self, db_session, test_organization, test_user
    ):
        repo = SqlAlchemyPushSubscriptionRepository(db_session)
        tenant_id = test_organization.tenant_id

        await repo.delete_by_endpoint("https://nonexistent", test_user.id, tenant_id)

        fetched = await repo.list_for_user(test_user.id, tenant_id)
        assert fetched == []

    @pytest.mark.asyncio
    async def test_delete_by_endpoint_does_not_remove_another_users_subscription(
        self, db_session, test_organization, test_user
    ):
        repo = SqlAlchemyPushSubscriptionRepository(db_session)
        tenant_id = test_organization.tenant_id
        other_user_id = uuid4()

        subscription = PushSubscription.create(
            tenant_id=tenant_id,
            user_id=test_user.id,
            endpoint="https://fcm.googleapis.com/fcm/send/owned-by-test-user",
            p256dh="key",
            auth="secret",
        )
        await repo.upsert(subscription)

        await repo.delete_by_endpoint(
            "https://fcm.googleapis.com/fcm/send/owned-by-test-user", other_user_id, tenant_id
        )

        fetched = await repo.list_for_user(test_user.id, tenant_id)
        assert len(fetched) == 1
