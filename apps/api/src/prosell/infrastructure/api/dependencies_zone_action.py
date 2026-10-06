"""Zone x Action x Scope permission-engine dependencies (diagnostic doc §6).

Deliberately has NO `from __future__ import annotations`. `require_zone_action`
and `get_effective_scope` are dependency FACTORIES whose inner `_check`/
`_resolve` functions annotate `current_user` with `Depends(auth_dependency)`,
where `auth_dependency` is a parameter of the OUTER factory — a closure
variable, not a module global. Under postponed evaluation
(`from __future__ import annotations`), that annotation becomes a string
resolved later via `get_type_hints()` against this module's globals only;
`auth_dependency` isn't there, so resolution fails silently and FastAPI
falls back to treating `current_user` as a required query parameter (422).
Without the future import, annotations are evaluated eagerly at
function-definition time, while `auth_dependency` is still in scope — so the
standard `Annotated[Type, Depends(...)]` form (mandated by `AGENTS.md`) works
correctly here, no exception or workaround needed. Bug found 2026-10-06 while
migrating `org_verticals_router.py`; see
`docs/canonical/rbac-permission-engine-workbook.md` for the full writeup.

`get_role_repository` lives here too (not in `dependencies.py`) so this
module needs no import back from `dependencies.py` — the two dependencies
below are its only real consumers, and `dependencies.py` re-exports it
for its own `require_role()` and other existing call sites.
"""

from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.user import User
from prosell.domain.repositories import AbstractRoleRepository
from prosell.domain.services.scope_resolver import resolve_effective_scope
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.role_repository_impl import SqlAlchemyRoleRepository


async def get_role_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AbstractRoleRepository:
    """Get role repository instance."""
    return SqlAlchemyRoleRepository(session)


def require_zone_action(
    zone: str,
    action: str,
    *,
    auth_dependency: Callable[..., Awaitable[User]],
) -> Callable[..., Awaitable[User]]:
    """
    Dependency factory for the NEW zone/action permission engine
    (diagnostic doc §6) — parallel to `require_permission()` in
    `dependencies.py`, which still reads the legacy `ROLE_PERMISSIONS` dict.

    Usage in FastAPI routes:
        current_user: User = Depends(
            require_zone_action(
                "catalog", "read", auth_dependency=get_current_auth_user_from_cookie
            )
        )

    `zone`/`action` are plain strings, not an enum — §6.1: they're data
    (rows in `role_grants`), not a code deploy.

    `auth_dependency` is REQUIRED, not defaulted, on purpose (bug found
    2026-10-06 while migrating `org_verticals_router.py`): the router
    being migrated might authenticate via `get_current_auth_user`
    (Bearer) or `get_current_auth_user_from_cookie` (httpOnly cookie) —
    the two are NOT interchangeable, and defaulting to one silently
    would 401 every request on a router using the other. Pass whichever
    dependency the surrounding route's OWN `current_user` parameter
    already uses, so both resolve the same way.

    Migrating existing endpoints from `require_permission()`/inline
    `current_user.has_permission(...)` to this is explicitly a
    SEPARATE, later step (see the workbook) — a repo-wide swap in the
    same change as building this dependency would make a
    security-relevant diff much harder to review.

    Args:
        zone: The permission zone (e.g. "catalog", "leads")
        action: The action within that zone (e.g. "read", "update")
        auth_dependency: Which auth dependency to resolve `current_user`
            from — must match the router's own auth mechanism.

    Returns:
        Dependency function that FastAPI can call
    """

    async def _check(
        current_user: Annotated[User, Depends(auth_dependency)],
        role_repository: Annotated[AbstractRoleRepository, Depends(get_role_repository)],
    ) -> User:
        """Check if any of the user's roles grants this zone/action."""
        from fastapi import HTTPException, status

        user_roles = await role_repository.get_user_roles_with_grants(current_user.id)

        if not any(role.has_zone_action(zone, action) for role in user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{zone}:{action}' required",
            )

        return current_user

    return _check


def get_effective_scope(
    *,
    auth_dependency: Callable[..., Awaitable[User]],
) -> Callable[..., Awaitable[AllScope | ExplicitOrgsScope | OwnScope]]:
    """
    Dependency FACTORY for the current user's effective data-visibility
    scope (diagnostic doc §6), unioned across every role they hold via
    `resolve_effective_scope()` — the most permissive scope wins
    (confirmed with the user, 2026-10-06), not a "primary role" rule.

    Replaces the inline `current_user.has_permission(Permission.ORG_ADMIN_VIEW_ALL)`
    pattern repeated dozens of times across routers (§1.2/§1.6 of the
    diagnostic) — that permission was never really an action grant, it
    was always a visibility scope wearing a `Permission` costume.

    `auth_dependency` is REQUIRED, not defaulted — same reason as
    `require_zone_action()`'s own `auth_dependency` parameter (bug found
    2026-10-06 while migrating `org_verticals_router.py`, a
    cookie-authenticated router: this used to hardcode the Bearer-only
    `get_current_auth_user`, which 401s every request on a route whose
    real `current_user` comes from `get_current_auth_user_from_cookie`
    instead — the two are not interchangeable). Pass whichever
    dependency the surrounding route's OWN `current_user` parameter
    already uses.

    Usage in FastAPI routes:
        scope: Annotated[
            Scope, Depends(get_effective_scope(auth_dependency=get_current_auth_user_from_cookie))
        ]
        can_view_all_orgs = isinstance(scope, AllScope)

    Loads roles via `get_user_roles_with_grants()` deliberately, NOT the
    plain `get_user_roles()` that populates `current_user.roles` at auth
    time — that one always maps `scope=None` by design (see
    `_to_entity()`'s docstring), since it predates this permission
    engine and most callers never needed grants/scope loaded.
    """

    async def _resolve(
        current_user: Annotated[User, Depends(auth_dependency)],
        role_repository: Annotated[AbstractRoleRepository, Depends(get_role_repository)],
    ) -> AllScope | ExplicitOrgsScope | OwnScope:
        user_roles = await role_repository.get_user_roles_with_grants(current_user.id)
        return resolve_effective_scope(user_roles)

    return _resolve
