"""Unit tests for Subscribe/UnsubscribeFromPushUseCase - TDD RED phase.

CRM roadmap Fase 5 delivery channel.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.use_cases.push.subscribe_to_push import SubscribeToPushUseCase
from prosell.application.use_cases.push.unsubscribe_from_push import UnsubscribeFromPushUseCase


class TestSubscribeToPushUseCase:
    @pytest.mark.asyncio
    async def test_execute_upserts_subscription(self):
        repo = AsyncMock()
        use_case = SubscribeToPushUseCase(repo)
        tenant_id = uuid4()
        user_id = uuid4()

        await use_case.execute(
            tenant_id=tenant_id,
            user_id=user_id,
            endpoint="https://fcm.googleapis.com/fcm/send/abc",
            p256dh="key",
            auth="secret",
        )

        repo.upsert.assert_awaited_once()
        subscription = repo.upsert.call_args.args[0]
        assert subscription.tenant_id == tenant_id
        assert subscription.user_id == user_id
        assert subscription.endpoint == "https://fcm.googleapis.com/fcm/send/abc"


class TestUnsubscribeFromPushUseCase:
    @pytest.mark.asyncio
    async def test_execute_deletes_by_endpoint(self):
        repo = AsyncMock()
        use_case = UnsubscribeFromPushUseCase(repo)
        tenant_id = uuid4()
        user_id = uuid4()

        await use_case.execute(
            tenant_id=tenant_id, user_id=user_id, endpoint="https://fcm.googleapis.com/fcm/send/abc"
        )

        repo.delete_by_endpoint.assert_awaited_once_with(
            "https://fcm.googleapis.com/fcm/send/abc", user_id, tenant_id
        )
