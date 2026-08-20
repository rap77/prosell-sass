"""Domain events for product reverse (undo) transitions.

Slice 7/10 of the reverse-transitions spec. Declared but not yet emitted
anywhere -- there is no IDomainEventBus in this codebase, matching the
same not-wired-up status as the pre-existing events in user_events.py.
They exist as scaffolding for a future bus/listener (notifications,
webhooks), not as a currently-active side effect.
"""

from uuid import UUID

from prosell.domain.base import DomainEvent
from prosell.domain.value_objects.product_status import ProductStatus


class ProductReversedEvent(DomainEvent):
    """Event fired when a super_admin reverses a wrong approval."""

    product_id: UUID
    tenant_id: UUID
    reversed_by_user_id: UUID
    old_status: ProductStatus  # always PUBLISHED
    new_status: ProductStatus  # always PENDING
    fb_unpublish_queued: bool  # True if >=1 active publication got a queue row
    # timestamp inherited from DomainEvent with default factory


class ProductResubmittedEvent(DomainEvent):
    """Event fired when a super_admin force-resubmits a rejected product."""

    product_id: UUID
    tenant_id: UUID
    resubmitted_by_user_id: UUID
    old_status: ProductStatus  # always REJECTED
    new_status: ProductStatus  # always PENDING
    # timestamp inherited from DomainEvent with default factory


class ProductRestoredEvent(DomainEvent):
    """Event fired when a super_admin restores an archived product."""

    product_id: UUID
    tenant_id: UUID
    restored_by_user_id: UUID
    old_status: ProductStatus  # always ARCHIVED
    new_status: ProductStatus  # the restored archived_from_status target
    # timestamp inherited from DomainEvent with default factory
