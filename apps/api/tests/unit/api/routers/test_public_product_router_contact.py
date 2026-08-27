"""Unit tests for the public product router's organization-contact helpers (FR5).

Pure-function level so these run without the integration test DB.
"""

from uuid import uuid4

from prosell.application.dto.product import PublicProductResponse
from prosell.domain.entities.organization import Organization
from prosell.domain.value_objects.organization_contact import (
    ContactCategory,
    OrganizationContact,
)
from prosell.infrastructure.api.routers.public_product_router import (
    _compose_address,
    _pick_contact,
)


def test_public_product_response_has_no_phone_field() -> None:
    """FR5.2: structurally guarantee the public DTO can never carry a phone,
    regardless of what OrganizationContact.phone holds."""
    assert "phone" not in PublicProductResponse.model_fields


def _make_org(**overrides: object) -> Organization:
    defaults: dict[str, object] = {
        "id": uuid4(),
        "name": "Test Dealer",
        "tenant_id": uuid4(),
    }
    defaults.update(overrides)
    return Organization(**defaults)  # type: ignore[arg-type]


def test_compose_address_joins_populated_fields() -> None:
    org = _make_org(
        street_address="Av. Principal 123",
        city="Caracas",
        state="Distrito Capital",
        postal_code=None,
        country="Venezuela",
    )

    assert _compose_address(org) == "Av. Principal 123, Caracas, Distrito Capital, Venezuela"


def test_compose_address_returns_none_when_nothing_set() -> None:
    org = _make_org()

    assert _compose_address(org) is None


def test_pick_contact_prefers_the_first_contact_with_whatsapp() -> None:
    no_whatsapp = OrganizationContact(
        id="c1", name="Sin WhatsApp", category=ContactCategory.RECEPCION, order=0
    )
    with_whatsapp = OrganizationContact(
        id="c2",
        name="Con WhatsApp",
        category=ContactCategory.VENTAS,
        whatsapp="+584121234567",
        phone="+582121234567",
        order=1,
    )
    org = _make_org(contacts=[no_whatsapp, with_whatsapp])

    picked = _pick_contact(org)

    assert picked is not None
    assert picked.name == "Con WhatsApp"
    assert picked.whatsapp == "+584121234567"


def test_pick_contact_falls_back_to_first_contact_when_none_has_whatsapp() -> None:
    only_contact = OrganizationContact(
        id="c1", name="Gerencia", category=ContactCategory.GERENCIA, order=0
    )
    org = _make_org(contacts=[only_contact])

    picked = _pick_contact(org)

    assert picked is not None
    assert picked.name == "Gerencia"
    assert picked.whatsapp is None


def test_pick_contact_returns_none_when_no_contacts() -> None:
    org = _make_org(contacts=[])

    assert _pick_contact(org) is None
