"""Regression: `mark_all_as_read` and `count_unread` honor tenant isolation.

These two methods are the highest-frequency queries in the notifications
table and the reason the new composite index `ix_notifications_user_tenant_read`
(user_id, tenant_id, is_read) was added (GAP-1 fix). The functional bug they
guard against: a SQL refactor that drops the `tenant_id` predicate would
return cross-tenant unread counts and cross-tenant mark-as-read — a privacy
leak. This test seeds notifications for two users in the same tenant plus
one notification for a *different* tenant, then asserts the per-user counts
and the mark-all result respect tenant boundaries.
"""

from uuid import uuid4

import pytest
from sqlalchemy import select

from prosell.domain.entities.notification import Notification, NotificationType
from prosell.infrastructure.models.notification_model import NotificationModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.notification_repository_impl import (
    SqlAlchemyNotificationRepository,
)


def _make_notification(tenant_id, user_id, *, is_read: bool = False) -> Notification:
    n = Notification.create(
        tenant_id=tenant_id,
        user_id=user_id,
        notification_type=NotificationType.LEAD_ASSIGNED,
        title="t",
        body="b",
    )
    if is_read:
        n.mark_as_read()
    return n


@pytest.mark.asyncio
async def test_mark_all_as_read_marks_only_target_user_unread(
    db_session, test_organization, test_user, test_seller_user
) -> None:
    """`mark_all_as_read(user_id, tenant_id)` must only flip `is_read` for
    that specific user. Notifications belonging to other users (in the same
    tenant) must stay unread."""
    repo = SqlAlchemyNotificationRepository(db_session)
    tenant_id = test_organization.tenant_id

    # 3 unread for test_user, 2 unread + 1 already read for test_seller_user
    for _ in range(3):
        await repo.create(_make_notification(tenant_id, test_user.id, is_read=False))
    for _ in range(2):
        await repo.create(_make_notification(tenant_id, test_seller_user.id, is_read=False))
    await repo.create(_make_notification(tenant_id, test_seller_user.id, is_read=True))

    updated = await repo.mark_all_as_read(test_user.id, tenant_id)

    assert updated == 3  # only test_user's unread were flipped

    # Sanity: seller_user's unread are still unread (would catch a missing
    # user_id predicate on the UPDATE).
    seller_unread = await repo.count_unread(test_seller_user.id, tenant_id)
    assert seller_unread == 2

    user_unread = await repo.count_unread(test_user.id, tenant_id)
    assert user_unread == 0


@pytest.mark.asyncio
async def test_count_unread_respects_tenant_boundary(
    db_session, test_organization, test_user
) -> None:
    """`count_unread` filters by `tenant_id`. A second tenant with its own
    notifications must NOT be counted when querying the first tenant. Guards
    against the inverse: dropping the `tenant_id` clause would inflate the
    badge count with cross-tenant notifications."""
    repo = SqlAlchemyNotificationRepository(db_session)
    real_tenant = test_organization.tenant_id

    # Provision a second tenant — the FK on notifications.tenant_id
    # references organizations(id), so we need a real row.
    other_org_id = uuid4()
    other_org = OrganizationModel(
        id=other_org_id,
        tenant_id=other_org_id,
        name=f"Other Org {uuid4().hex[:6]}",
        status="active",
        settings={},
    )
    db_session.add(other_org)
    await db_session.flush()
    other_tenant = other_org_id

    for _ in range(4):
        await repo.create(_make_notification(real_tenant, test_user.id, is_read=False))
    for _ in range(7):
        await repo.create(_make_notification(other_tenant, test_user.id, is_read=False))

    real_count = await repo.count_unread(test_user.id, real_tenant)
    other_count = await repo.count_unread(test_user.id, other_tenant)

    assert real_count == 4
    assert other_count == 7


@pytest.mark.asyncio
async def test_create_notification_persists_and_round_trips(
    db_session, test_organization, test_user
) -> None:
    """Sanity: `Notification.create()` produces tz-aware timestamps; the
    `notifications` columns are `DateTime(timezone=True)` so this must round
    trip cleanly. Also verifies the enum `notification_type` is serialized
    to its string value (`'lead_assigned'`) and re-hydrated as the same
    enum."""
    repo = SqlAlchemyNotificationRepository(db_session)
    tenant_id = test_organization.tenant_id

    n = _make_notification(tenant_id, test_user.id)
    created = await repo.create(n)

    assert created.id == n.id
    assert created.notification_type == NotificationType.LEAD_ASSIGNED
    assert created.is_read is False

    fetched = await repo.get_by_id(created.id, tenant_id)
    assert fetched is not None
    assert fetched.title == "t"
    assert fetched.created_at is not None

    # And the underlying ORM row stores the string form, not the enum repr.
    stmt = select(NotificationModel).where(NotificationModel.id == created.id)
    raw = (await db_session.execute(stmt)).scalar_one()
    assert raw.notification_type == "lead_assigned"
