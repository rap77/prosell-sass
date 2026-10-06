"""RoleGrant value object — one (zone, action) permission grant.

`zone` and `action` are plain strings, deliberately not a `StrEnum` —
diagnostic doc §6.1: zones/actions are data (rows in `role_grants`),
editable from a UI, never a code deploy. A Python enum here would
reintroduce exactly the "permissions as code" problem this engine exists
to replace. Validity of a given (zone, action) pair against the live
catalog is an infrastructure/application concern, not a domain one.
"""

from prosell.domain.base import Field, ValueObject


class RoleGrant(ValueObject):
    """A single zone+action permission grant held by a role."""

    zone: str = Field(..., min_length=1)
    action: str = Field(..., min_length=1)
