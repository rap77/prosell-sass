"""Contract tests for multi-contact updates through the admin organization API."""

from prosell.application.dto.org.update import ContactInput
from prosell.domain.value_objects.organization_contact import ContactCategory
from prosell.infrastructure.api.routers.admin_organizations_router import (
    UpdateOrganizationRequest,
)


def test_admin_organization_update_accepts_contacts() -> None:
    request = UpdateOrganizationRequest(
        contacts=[
            ContactInput(
                id="contact-1",
                category=ContactCategory.VENTAS,
                email="ventas@example.com",
            )
        ]
    )

    assert request.contacts is not None
    assert len(request.contacts) == 1
    assert request.contacts[0].email == "ventas@example.com"
