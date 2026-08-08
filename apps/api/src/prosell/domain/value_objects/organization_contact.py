"""Organization contact value object for multi-contact support."""

from enum import Enum

from pydantic import ConfigDict

from prosell.domain.base import ValueObject


class ContactCategory(str, Enum):
    """Predefined contact categories."""

    GERENCIA = "gerencia"
    VENTAS = "ventas"
    SERVICIO_TECNICO = "servicio_tecnico"
    COBRANZA = "cobranza"
    RECEPCION = "recepcion"
    CUSTOM = "custom"


class OrganizationContact(ValueObject):
    """Single contact entry for an organization.

    Each contact has a category (predefined or custom) and optional
    phone, email, and whatsapp fields. Order is used for drag-and-drop
    persistence.
    """

    model_config = ConfigDict(
        frozen=True,
        use_enum_values=True,  # serialize enum as string for JSONB
    )

    id: str
    category: ContactCategory
    custom_label: str | None = None  # only when category == CUSTOM
    phone: str | None = None
    email: str | None = None
    whatsapp: str | None = None
    order: int = 0
