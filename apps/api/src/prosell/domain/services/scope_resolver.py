"""Effective-scope resolver — union across a user's roles.

Diagnostic doc §6: a user can hold multiple roles (`user_roles` is
many-to-many). `has_zone_action()`/`has_permission()` already resolve
grants with "any role satisfies it" (union) semantics. This module
applies the SAME union policy to the data-visibility scope — confirmed
explicitly with the user (2026-10-06): the most permissive scope among a
user's roles wins, not a "primary role" or an all-roles-must-agree rule.

Order of permissiveness: AllScope > ExplicitOrgsScope > OwnScope. A role
with no scope configured at all (`Role.scope is None` — the default
until an admin configures one, see migration `20261006_0002`) is treated
as the safe default, `OwnScope`, not as "no restriction."
"""

from uuid import UUID

from prosell.domain.entities.role import Role
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope


def resolve_effective_scope(roles: list[Role]) -> AllScope | ExplicitOrgsScope | OwnScope:
    """Union a user's roles' scopes into the single most-permissive one.

    - Any role with `AllScope` → `AllScope` (nothing beats it).
    - Else, any role(s) with `ExplicitOrgsScope` → `ExplicitOrgsScope`
      with the UNION of every such role's organization_ids.
    - Else → `OwnScope` (the safe default — also what a user with zero
      roles, or roles with no scope configured yet, gets).
    """
    if any(isinstance(role.scope, AllScope) for role in roles):
        return AllScope()

    explicit_org_ids: set[UUID] = set()
    for role in roles:
        if isinstance(role.scope, ExplicitOrgsScope):
            explicit_org_ids |= role.scope.organization_ids

    if explicit_org_ids:
        return ExplicitOrgsScope(organization_ids=frozenset(explicit_org_ids))

    return OwnScope()
