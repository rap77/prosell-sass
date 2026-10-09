"""Regression: appointment conflict detection catches overlapping time windows.

The `Appointment.create()` factory uses a +/- 30 min window (1-hour total) and
considers only SCHEDULED appointments as conflicts. The repository's
`check_conflicts()` mirrors that window via SQL. If a future refactor drifts
the SQL window to something else (e.g., a strict equality, or it forgets to
filter on `status == 'scheduled'`), the repo would let users double-book the
same seller within the hour. This test exercises the real `create()` path
through the DB and asserts the conflict is rejected.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest

from prosell.domain.entities.appointment import Appointment
from prosell.domain.exceptions.appointment_exceptions import (
    AppointmentConflictException,
)
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.infrastructure.models.lead_model import LeadModel
from prosell.infrastructure.models.product_model import ProductModel
from prosell.infrastructure.repositories.appointment_repository_impl import (
    SqlAlchemyAppointmentRepository,
)


def _next_weekday_business_hour() -> datetime:
    """Return a future weekday at 14:00 UTC that survives business-hours validation."""
    base = datetime.now(UTC).replace(hour=14, minute=0, second=0, microsecond=0) + timedelta(days=2)
    # Walk forward to a weekday
    while base.weekday() >= 5:
        base += timedelta(days=1)
    return base


async def _create_prereqs(
    db_session,
    tenant_id: UUID,
    category_id: UUID,
    vendedor_id: UUID | None = None,
) -> tuple[UUID, UUID]:
    """Insert a lead + product so the appointment FKs are satisfied.

    Returns (lead_id, product_id).
    """
    lead = LeadModel(
        id=uuid4(),
        tenant_id=tenant_id,
        buyer_name="Test Buyer",
        buyer_email=f"buyer-{uuid4().hex[:6]}@test.com",
        vendedor_id=vendedor_id,
        source="manual",
        status="new",
    )
    db_session.add(lead)

    product = ProductModel(
        id=uuid4(),
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=category_id,
        title="Test Product",
        price_cents=10000,
        currency="USD",
        condition="used",
        status="draft",
        attributes={},
    )
    db_session.add(product)
    await db_session.flush()
    return lead.id, product.id


@pytest.mark.asyncio
async def test_create_appointment_persists_entity(
    db_session, test_organization, test_user, test_category
) -> None:
    """The real `Appointment.create()` factory stamps tz-aware timestamps. The
    `appointments.scheduled_at` column is `DateTime(timezone=True)`, so this
    should persist cleanly. After committing, `get_by_id()` must return the
    same id and status."""
    repo = SqlAlchemyAppointmentRepository(db_session)
    tenant_id = test_organization.tenant_id
    lead_id, product_id = await _create_prereqs(db_session, tenant_id, test_category.id)

    scheduled = _next_weekday_business_hour()
    appt = Appointment.create(
        lead_id=lead_id,
        user_id=test_user.id,
        product_id=product_id,
        tenant_id=tenant_id,
        scheduled_at=scheduled,
    )

    created = await repo.create(appt)

    assert created.id == appt.id
    assert created.tenant_id == tenant_id
    assert created.status.value == "scheduled"

    fetched = await repo.get_by_id(created.id, tenant_id)
    assert fetched is not None
    assert fetched.id == created.id


@pytest.mark.asyncio
async def test_create_appointment_rejects_overlap_within_one_hour(
    db_session, test_organization, test_user, test_category
) -> None:
    """Two appointments for the same seller scheduled 20 minutes apart must
    conflict (window is +/- 30 min). The repo's `create()` calls
    `check_conflicts()` and raises `AppointmentConflictException` — if the
    window filter ever breaks, this test goes RED."""
    repo = SqlAlchemyAppointmentRepository(db_session)
    tenant_id = test_organization.tenant_id
    lead_id, product_id = await _create_prereqs(db_session, tenant_id, test_category.id)

    scheduled_first = _next_weekday_business_hour()
    scheduled_second = scheduled_first + timedelta(minutes=20)

    first = Appointment.create(
        lead_id=lead_id,
        user_id=test_user.id,
        product_id=product_id,
        tenant_id=tenant_id,
        scheduled_at=scheduled_first,
    )
    await repo.create(first)

    # Second appointment overlaps the +/- 30 min window
    second = Appointment.create(
        lead_id=lead_id,
        user_id=test_user.id,
        product_id=product_id,
        tenant_id=tenant_id,
        scheduled_at=scheduled_second,
    )

    with pytest.raises(AppointmentConflictException):
        await repo.create(second)


@pytest.mark.asyncio
async def test_create_appointment_allows_non_overlap(
    db_session, test_organization, test_user, test_category
) -> None:
    """Appointments spaced more than 30 min apart must NOT conflict. Guards
    against the inverse bug: an over-broad window that blocks legitimate
    bookings."""
    repo = SqlAlchemyAppointmentRepository(db_session)
    tenant_id = test_organization.tenant_id
    lead_id, product_id = await _create_prereqs(db_session, tenant_id, test_category.id)

    scheduled_first = _next_weekday_business_hour()
    # Move to a different hour on the same day to avoid business-hours edge
    scheduled_first = scheduled_first.replace(hour=10, minute=0)
    # 11:00 — just outside the 1-hour window
    scheduled_second = scheduled_first + timedelta(hours=1)

    first = Appointment.create(
        lead_id=lead_id,
        user_id=test_user.id,
        product_id=product_id,
        tenant_id=tenant_id,
        scheduled_at=scheduled_first,
    )
    await repo.create(first)

    second = Appointment.create(
        lead_id=lead_id,
        user_id=test_user.id,
        product_id=product_id,
        tenant_id=tenant_id,
        scheduled_at=scheduled_second,
    )
    created_second = await repo.create(second)

    assert created_second.id == second.id


@pytest.mark.asyncio
async def test_own_scope_hides_appointment_for_another_sales_agent(
    db_session, test_organization, test_user, test_category
) -> None:
    """OwnScope follows the appointment lead's assigned sales agent."""
    repo = SqlAlchemyAppointmentRepository(db_session)
    tenant_id = test_organization.tenant_id
    lead_id, product_id = await _create_prereqs(
        db_session,
        tenant_id,
        test_category.id,
        vendedor_id=test_user.id,
    )
    appointment = Appointment.create(
        lead_id=lead_id,
        user_id=test_user.id,
        product_id=product_id,
        tenant_id=tenant_id,
        scheduled_at=_next_weekday_business_hour(),
    )
    await repo.create(appointment)

    hidden = await repo.get_by_id(
        appointment.id,
        tenant_id,
        scope=OwnScope(),
        actor_id=uuid4(),
    )

    assert hidden is None


@pytest.mark.asyncio
async def test_all_scope_can_read_any_tenant_appointment(
    db_session, test_organization, test_user, test_category
) -> None:
    """AllScope retains tenant-wide appointment visibility."""
    repo = SqlAlchemyAppointmentRepository(db_session)
    tenant_id = test_organization.tenant_id
    lead_id, product_id = await _create_prereqs(
        db_session,
        tenant_id,
        test_category.id,
        vendedor_id=test_user.id,
    )
    appointment = Appointment.create(
        lead_id=lead_id,
        user_id=test_user.id,
        product_id=product_id,
        tenant_id=tenant_id,
        scheduled_at=_next_weekday_business_hour(),
    )
    await repo.create(appointment)

    visible = await repo.get_by_id(
        appointment.id,
        tenant_id,
        scope=AllScope(),
        actor_id=uuid4(),
    )

    assert visible is not None
    assert visible.id == appointment.id


@pytest.mark.asyncio
async def test_explicit_org_scope_hides_appointment_when_tenant_is_not_granted(
    db_session, test_organization, test_user, test_category
) -> None:
    """ExplicitOrgsScope is constrained by the authenticated tenant."""
    repo = SqlAlchemyAppointmentRepository(db_session)
    tenant_id = test_organization.tenant_id
    lead_id, product_id = await _create_prereqs(
        db_session,
        tenant_id,
        test_category.id,
        vendedor_id=test_user.id,
    )
    appointment = Appointment.create(
        lead_id=lead_id,
        user_id=test_user.id,
        product_id=product_id,
        tenant_id=tenant_id,
        scheduled_at=_next_weekday_business_hour(),
    )
    await repo.create(appointment)

    hidden = await repo.get_by_id(
        appointment.id,
        tenant_id,
        scope=ExplicitOrgsScope(organization_ids=frozenset({uuid4()})),
        actor_id=test_user.id,
    )

    assert hidden is None
