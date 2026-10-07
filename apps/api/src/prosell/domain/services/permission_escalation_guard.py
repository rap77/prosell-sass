"""Anti-escalation guard for the dynamic permission engine.

Diagnostic doc §6.2 / §3.1(4): nobody grants a permission they don't
themselves hold. Checked at the moment a role's grants are created or
updated, against the acting user's own effective role — a pure domain
rule, no repository or DB access.

Scope escalation (e.g. an actor whose own scope is `ExplicitOrgsScope`
granting another role `AllScope`) is deliberately OUT of scope for this
guard: comparing two scopes for "more permissive than" requires knowing
which organization the granter is acting as at request time, which this
pure domain check has no way to resolve — `OwnScope`'s permitted set is
relative to whoever is asking, not a fixed set two scopes can be diffed
against. Left as an open question for the next workbook item
(`require_zone_action` dependency), not resolved silently here.
"""

from collections.abc import Iterable

from prosell.domain.entities.role import Role
from prosell.domain.exceptions.role_exceptions import (
    PermissionEscalationException,
    ScopeEscalationException,
)
from prosell.domain.value_objects.permission_scope import Scope
from prosell.domain.value_objects.role_grant import RoleGrant


def ensure_no_grant_escalation(*, granter: Role, requested_grants: Iterable[RoleGrant]) -> None:
    """Raise `PermissionEscalationException` if any grant in
    `requested_grants` is not already held by `granter`."""
    escalated = [g for g in requested_grants if not granter.has_zone_action(g.zone, g.action)]
    if escalated:
        raise PermissionEscalationException([f"{g.zone}:{g.action}" for g in escalated])


def ensure_no_scope_escalation(*, granter_scope: Scope, requested_scope: Scope) -> None:
    """Raise `ScopeEscalationException` if `requested_scope` is not <=
    `granter_scope` (bloque 3, item 3.1 — the alcance axis the zone x
    action guard above deliberately leaves unresolved)."""
    if not granter_scope.covers(requested_scope):
        raise ScopeEscalationException(granter_scope=granter_scope, requested_scope=requested_scope)
