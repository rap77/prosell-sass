"""Organization contact value object for multi-contact support."""

from enum import StrEnum

from prosell.domain.base import SerializedValueObject


class ContactCategory(StrEnum):
    """Predefined contact categories."""

    GERENCIA = "gerencia"
    VENTAS = "ventas"
    SERVICIO_TECNICO = "servicio_tecnico"
    COBRANZA = "cobranza"
    RECEPCION = "recepcion"
    CUSTOM = "custom"


class OrganizationContact(SerializedValueObject):
    """Single contact entry for an organization.

    Each contact has an optional name (to identify the person) and a
    category (predefined or custom) plus optional phone, email, and
    whatsapp fields. Order is used for drag-and-drop persistence.
    """

    id: str
    # Person's name; required by the UI but optional in storage
    # for backwards-compat with existing rows.
    name: str | None = None
    category: ContactCategory
    custom_label: str | None = None  # only when category == CUSTOM
    phone: str | None = None
    email: str | None = None
    whatsapp: str | None = None
    order: int = 0
