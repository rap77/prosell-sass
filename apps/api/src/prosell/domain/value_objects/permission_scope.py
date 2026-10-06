"""Scope specification objects — who a role's data-visibility grant covers.

Specification pattern (diagnostic doc §6.4): `OwnScope`/`AllScope`/
`ExplicitOrgsScope` each answer the same question — "does this role see
organization X's data?" — as a single `permits()` method, instead of an
`if scope_type == "all" elif ...` branch scattered through repositories.

Mirrors `role_scope`/`role_organization_access` (migration `20261006_0001`):
`scope_type` picks the class, `ExplicitOrgsScope.organization_ids` mirrors
the rows in `role_organization_access`.
"""

from typing import Protocol, runtime_checkable
from uuid import UUID

from prosell.domain.base import Field, ValueObject


@runtime_checkable
class Scope(Protocol):
    """Structural interface every concrete scope implements.

    A `Protocol` rather than an ABC: value objects are frozen Pydantic
    models, and Pydantic's metaclass already does enough — no need to
    also combine it with `ABCMeta`. Structural typing is enough here;
    nothing depends on runtime `isinstance` checks against this type.
    """

    def permits(self, *, organization_id: UUID, actor_organization_id: UUID) -> bool:
        """Whether this scope allows visibility into `organization_id`,
        given the acting role's own `actor_organization_id`."""
        ...


class OwnScope(ValueObject):
    """Only the actor's own organization is visible."""

    def permits(self, *, organization_id: UUID, actor_organization_id: UUID) -> bool:
        return organization_id == actor_organization_id


class AllScope(ValueObject):
    """Every organization is visible — no restriction."""

    def permits(
        self,
        *,
        organization_id: UUID,  # noqa: ARG002 — required by the Scope protocol, unused here
        actor_organization_id: UUID,  # noqa: ARG002 — same
    ) -> bool:
        return True


class ExplicitOrgsScope(ValueObject):
    """Only an explicit, administrator-assigned set of organizations is
    visible — the vendedor-sees-only-these-dealers case from §3.1(2)."""

    organization_ids: frozenset[UUID] = Field(default_factory=frozenset)

    def permits(
        self,
        *,
        organization_id: UUID,
        actor_organization_id: UUID,  # noqa: ARG002 — required by the Scope protocol, unused here
    ) -> bool:
        return organization_id in self.organization_ids
