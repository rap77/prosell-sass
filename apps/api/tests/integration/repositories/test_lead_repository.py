"""Integration tests for SqlAlchemyLeadRepository.

Uses real test database — requires test DB to be running on port 5433.
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.exceptions.lead_exceptions import (
    LeadNotFoundException,
)
from prosell.infrastructure.repositories.lead_repository_impl import SqlAlchemyLeadRepository

# =============================================================================
# HELPERS
# =============================================================================


def make_lead(tenant_id=None, vendedor_id=None, status=LeadStatus.NEW, **kwargs) -> Lead:
    """Create a Lead entity for testing."""
    tid = tenant_id or uuid4()
    return Lead.create(
        buyer_name=kwargs.get("buyer_name", "Integration Test Buyer"),
        tenant_id=tid,
        buyer_email=kwargs.get("buyer_email", f"buyer-{uuid4().hex[:6]}@test.com"),
        buyer_phone=kwargs.get("buyer_phone"),
        product_id=kwargs.get("product_id", uuid4()),
        vendedor_id=vendedor_id,
        message="Integration test message",
        source="manual",
    )


# =============================================================================
# TESTS
# =============================================================================


class TestLeadRepositoryCreate:
    """Tests for create() method."""

    @pytest.mark.asyncio
    async def test_create_lead_persists_entity(self, db_session, test_organization):
        """Should persist lead and return entity with correct data."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id
        lead = make_lead(tenant_id=tenant_id)

        created = await repo.create(lead)

        assert created.id == lead.id
        assert created.tenant_id == tenant_id
        assert created.buyer_name == lead.buyer_name
        assert created.status == LeadStatus.NEW

    @pytest.mark.asyncio
    async def test_create_lead_with_optional_fields_null(self, db_session, test_organization):
        """Should persist lead with all optional fields as None."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id
        lead = Lead.create(
            buyer_name="Minimal Lead",
            tenant_id=tenant_id,
        )

        created = await repo.create(lead)

        assert created.buyer_email is None
        assert created.buyer_phone is None
        assert created.product_id is None
        assert created.vendedor_id is None
        assert created.message is None


class TestLeadRepositoryGetById:
    """Tests for get_by_id() method."""

    @pytest.mark.asyncio
    async def test_get_by_id_returns_lead(self, db_session, test_organization):
        """Should return lead when id + tenant_id match."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id
        lead = make_lead(tenant_id=tenant_id)
        await repo.create(lead)

        found = await repo.get_by_id(lead.id, tenant_id)

        assert found is not None
        assert found.id == lead.id

    @pytest.mark.asyncio
    async def test_get_by_id_returns_none_for_wrong_tenant(self, db_session, test_organization):
        """Should return None when lead exists but tenant_id doesn't match."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id
        lead = make_lead(tenant_id=tenant_id)
        await repo.create(lead)

        found = await repo.get_by_id(lead.id, uuid4())  # Wrong tenant

        assert found is None

    @pytest.mark.asyncio
    async def test_get_by_id_returns_none_for_missing_lead(self, db_session, test_organization):
        """Should return None for non-existent lead id."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id

        found = await repo.get_by_id(uuid4(), tenant_id)

        assert found is None


class TestLeadRepositoryDuplicateDetection:
    """Tests for get_by_buyer_and_product() duplicate detection."""

    @pytest.mark.asyncio
    async def test_detects_duplicate_by_email_and_vehicle(self, db_session, test_organization):
        """Should find existing lead when same buyer email + vehicle within 24h."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id
        product_id = uuid4()
        email = f"dup-{uuid4().hex[:6]}@test.com"

        lead = make_lead(tenant_id=tenant_id, buyer_email=email, product_id=product_id)
        await repo.create(lead)

        duplicate = await repo.get_by_buyer_and_product(
            buyer_email=email,
            buyer_phone=None,
            product_id=product_id,
            tenant_id=tenant_id,
        )

        assert duplicate is not None
        assert duplicate.id == lead.id

    @pytest.mark.asyncio
    async def test_no_duplicate_for_different_tenant(self, db_session, test_organization):
        """Should NOT find duplicate when tenant_id is different."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id
        product_id = uuid4()
        email = f"notdup-{uuid4().hex[:6]}@test.com"

        lead = make_lead(tenant_id=tenant_id, buyer_email=email, product_id=product_id)
        await repo.create(lead)

        result = await repo.get_by_buyer_and_product(
            buyer_email=email,
            buyer_phone=None,
            product_id=product_id,
            tenant_id=uuid4(),  # Different tenant
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_when_no_email_or_phone(self, db_session, test_organization):
        """Should return None when no buyer identifier provided."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id

        result = await repo.get_by_buyer_and_product(
            buyer_email=None,
            buyer_phone=None,
            product_id=uuid4(),
            tenant_id=tenant_id,
        )

        assert result is None


class TestLeadRepositoryUpdateStatus:
    """Tests for update_status() method."""

    @pytest.mark.asyncio
    async def test_update_status_creates_audit_log(self, db_session, test_organization, test_user):
        """Should update status and create audit log entry."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id
        lead = make_lead(tenant_id=tenant_id)
        await repo.create(lead)

        updated = await repo.update_status(
            lead_id=lead.id,
            tenant_id=tenant_id,
            new_status=LeadStatus.CONTACTED,
            changed_by_user_id=test_user.id,  # Use real user ID to satisfy FK
            reason="Test update",
        )

        assert updated.status == LeadStatus.CONTACTED

        # Verify audit log created
        audit_logs = await repo.get_audit_logs(lead.id, tenant_id)
        assert len(audit_logs) >= 1
        recent = audit_logs[0]
        assert recent.new_status == LeadStatus.CONTACTED

    @pytest.mark.asyncio
    async def test_update_status_raises_for_missing_lead(self, db_session, test_organization):
        """Should raise LeadNotFoundException when lead doesn't exist."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id

        with pytest.raises(LeadNotFoundException):
            await repo.update_status(
                lead_id=uuid4(),
                tenant_id=tenant_id,
                new_status=LeadStatus.CONTACTED,
            )

    @pytest.mark.asyncio
    async def test_update_status_raises_for_invalid_transition(self, db_session, test_organization):
        """Should raise LeadStateTransitionException for invalid transition."""
        from prosell.domain.exceptions.lead_exceptions import LeadStateTransitionException

        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id
        lead = make_lead(tenant_id=tenant_id)
        await repo.create(lead)

        with pytest.raises(LeadStateTransitionException):
            await repo.update_status(
                lead_id=lead.id,
                tenant_id=tenant_id,
                new_status=LeadStatus.APPOINTMENT_SET,  # Can't skip from NEW
            )


class TestLeadRepositoryList:
    """Tests for list_by_vendedor() and list_by_manager() methods."""

    @pytest.mark.asyncio
    async def test_list_by_vendedor_returns_own_leads(
        self, db_session, test_organization, test_user, test_seller_user
    ):
        """list_by_vendedor should return only leads for given vendedor."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id
        vendedor_id = test_user.id
        other_vendedor_id = test_seller_user.id

        # Create 2 leads for vendedor, 1 for other vendedor
        for _ in range(2):
            await repo.create(make_lead(tenant_id=tenant_id, vendedor_id=vendedor_id))
        await repo.create(make_lead(tenant_id=tenant_id, vendedor_id=other_vendedor_id))

        leads, total = await repo.list_by_vendedor(
            tenant_id=tenant_id,
            vendedor_id=vendedor_id,
        )

        assert total == 2
        assert all(lead.vendedor_id == vendedor_id for lead in leads)

    @pytest.mark.asyncio
    async def test_list_by_manager_returns_all_tenant_leads(
        self, db_session, test_organization, test_user, test_seller_user
    ):
        """list_by_manager should return all leads in the tenant."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id

        # Create leads for different vendedores (using real user IDs)
        for uid in [test_user.id, test_seller_user.id, None]:
            await repo.create(make_lead(tenant_id=tenant_id, vendedor_id=uid))

        leads, total = await repo.list_by_manager(tenant_id=tenant_id)

        assert total >= 3

    @pytest.mark.asyncio
    async def test_list_pagination(self, db_session, test_organization, test_user):
        """Pagination should work correctly."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id
        vendedor_id = test_user.id

        # Create 5 leads
        for _ in range(5):
            await repo.create(make_lead(tenant_id=tenant_id, vendedor_id=vendedor_id))

        # First page (limit=2)
        page1, total = await repo.list_by_vendedor(
            tenant_id=tenant_id,
            vendedor_id=vendedor_id,
            limit=2,
            offset=0,
        )
        assert len(page1) == 2
        assert total == 5

        # Second page
        page2, _ = await repo.list_by_vendedor(
            tenant_id=tenant_id,
            vendedor_id=vendedor_id,
            limit=2,
            offset=2,
        )
        assert len(page2) == 2

        # IDs should not overlap between pages
        page1_ids = {lead.id for lead in page1}
        page2_ids = {lead.id for lead in page2}
        assert page1_ids.isdisjoint(page2_ids)

    @pytest.mark.asyncio
    async def test_list_filter_by_status(self, db_session, test_organization, test_user):
        """Should filter leads by status when specified."""
        repo = SqlAlchemyLeadRepository(db_session)
        tenant_id = test_organization.tenant_id
        vendedor_id = test_user.id

        # Create 1 NEW and 1 CONTACTED lead
        new_lead = make_lead(tenant_id=tenant_id, vendedor_id=vendedor_id)
        await repo.create(new_lead)

        contacted_lead = make_lead(tenant_id=tenant_id, vendedor_id=vendedor_id)
        await repo.create(contacted_lead)
        await repo.update_status(contacted_lead.id, tenant_id, LeadStatus.CONTACTED)

        new_leads, new_total = await repo.list_by_vendedor(
            tenant_id=tenant_id,
            vendedor_id=vendedor_id,
            status=LeadStatus.NEW,
        )
        assert all(lead.status == LeadStatus.NEW for lead in new_leads)
