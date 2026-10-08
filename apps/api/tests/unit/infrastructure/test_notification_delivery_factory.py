"""Unit tests for build_delivering_notification_repository - TDD RED phase.

CRM roadmap Fase 5. Single factory so both real call sites (the HTTP
router and the cron task) wire delivery identically — never duplicated.
"""

from unittest.mock import MagicMock

from prosell.infrastructure.repositories.delivering_notification_repository import (
    DeliveringNotificationRepository,
)
from prosell.infrastructure.repositories.notification_delivery_factory import (
    build_delivering_notification_repository,
)


class TestBuildDeliveringNotificationRepository:
    def test_returns_a_delivering_notification_repository(self):
        session = MagicMock()

        repo = build_delivering_notification_repository(session)

        assert isinstance(repo, DeliveringNotificationRepository)
