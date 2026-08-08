"""Unit tests for Organization multi-contact support."""

from uuid import uuid4

import pytest

from prosell.domain.entities.organization import Organization
from prosell.domain.value_objects.organization_contact import (
    ContactCategory,
    OrganizationContact,
)


@pytest.fixture
def org() -> Organization:
    """Create a basic organization for testing."""
    return Organization.create(name="Test Dealer", tenant_id=uuid4())


class TestOrganizationContact:
    """Tests for OrganizationContact value object."""

    def test_create_contact_with_category(self):
        contact = OrganizationContact(
            id="c1",
            category=ContactCategory.VENTAS,
            phone="+5491155551234",
        )
        assert contact.category == ContactCategory.VENTAS
        assert contact.phone == "+5491155551234"
        assert contact.custom_label is None

    def test_create_custom_category_requires_label(self):
        contact = OrganizationContact(
            id="c2",
            category=ContactCategory.CUSTOM,
            custom_label="Financiamiento",
            email="finance@dealer.com",
        )
        assert contact.category == ContactCategory.CUSTOM
        assert contact.custom_label == "Financiamiento"

    def test_contact_order_defaults_to_zero(self):
        contact = OrganizationContact(id="c3", category=ContactCategory.GERENCIA)
        assert contact.order == 0


class TestOrganizationContactsMethods:
    """Tests for Organization entity contact methods."""

    def test_organization_starts_with_empty_contacts(self, org: Organization):
        assert org.contacts == []

    def test_add_contact(self, org: Organization):
        contact = OrganizationContact(
            id="c1",
            category=ContactCategory.GERENCIA,
            phone="+5491155551234",
            email="gerencia@test.com",
        )
        org.add_contact(contact)
        assert len(org.contacts) == 1
        assert org.contacts[0].category == ContactCategory.GERENCIA

    def test_add_contact_auto_increments_order(self, org: Organization):
        c1 = OrganizationContact(id="c1", category=ContactCategory.GERENCIA)
        c2 = OrganizationContact(id="c2", category=ContactCategory.VENTAS)
        org.add_contact(c1)
        org.add_contact(c2)
        # ponytail: order auto-assigned based on position
        assert org.contacts[0].order == 0
        assert org.contacts[1].order == 1

    def test_update_contacts_replaces_all(self, org: Organization):
        c1 = OrganizationContact(id="c1", category=ContactCategory.GERENCIA)
        org.add_contact(c1)

        new_contacts = [
            OrganizationContact(id="c2", category=ContactCategory.VENTAS, order=0),
            OrganizationContact(id="c3", category=ContactCategory.COBRANZA, order=1),
        ]
        org.update_contacts(new_contacts)

        assert len(org.contacts) == 2
        assert org.contacts[0].id == "c2"
        assert org.contacts[1].id == "c3"

    def test_remove_contact_by_id(self, org: Organization):
        c1 = OrganizationContact(id="c1", category=ContactCategory.GERENCIA)
        c2 = OrganizationContact(id="c2", category=ContactCategory.VENTAS)
        org.add_contact(c1)
        org.add_contact(c2)

        org.remove_contact("c1")

        assert len(org.contacts) == 1
        assert org.contacts[0].id == "c2"

    def test_remove_nonexistent_contact_is_noop(self, org: Organization):
        c1 = OrganizationContact(id="c1", category=ContactCategory.GERENCIA)
        org.add_contact(c1)

        org.remove_contact("nonexistent")

        assert len(org.contacts) == 1

    def test_contacts_serializable_to_dict(self, org: Organization):
        contact = OrganizationContact(
            id="c1",
            category=ContactCategory.VENTAS,
            phone="+5491155551234",
            email="ventas@test.com",
            whatsapp="+5491155551234",
            order=0,
        )
        org.add_contact(contact)

        # ponytail: contacts must serialize for JSONB storage
        data = org.contacts[0].model_dump()
        assert data["id"] == "c1"
        assert data["category"] == "ventas"
        assert data["phone"] == "+5491155551234"
