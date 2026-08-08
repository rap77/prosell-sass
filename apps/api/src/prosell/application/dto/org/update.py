"""Organization update DTO."""

from pydantic import BaseModel, Field

from prosell.domain.value_objects.organization_contact import ContactCategory


class ContactInput(BaseModel):
    """Input for creating/updating a contact."""

    id: str
    category: ContactCategory
    custom_label: str | None = None
    phone: str | None = None
    email: str | None = None
    whatsapp: str | None = None
    order: int = 0


class UpdateOrganizationRequest(BaseModel):
    """DTO for organization update request (all fields optional)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    code: str | None = Field(default=None, max_length=5)
    color: str | None = Field(default=None, max_length=7)
    description: str | None = None
    website: str | None = None
    phone: str | None = None
    logo_url: str | None = None
    banner_url: str | None = None
    settings: dict[str, object] | None = None
    # Contact
    email: str | None = None
    whatsapp: str | None = None
    # Address
    street_address: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None
    # Legal
    tax_id: str | None = None
    # Social
    instagram: str | None = None
    facebook: str | None = None
    # Multi-contact
    contacts: list[ContactInput] | None = None
