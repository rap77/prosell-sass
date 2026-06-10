"""Shared authorization guard for category mutations."""

from uuid import UUID

from fastapi import HTTPException, status


def _require_platform_admin_for_global(
    category_tenant_id: UUID | None, is_platform_admin: bool
) -> None:
    """Deny mutating a GLOBAL category template unless the caller is the
    ProSell platform admin (super_admin).

    Defense in depth: the mutation use cases load categories via
    ``get_by_id_or_global`` (which reaches global, tenant-NULL templates), so
    the role check must live here too — not only at the router gate. A global
    category has ``tenant_id IS NULL``; tenant-scoped categories are already
    isolated to the caller's tenant by the repository.
    """
    if category_tenant_id is None and not is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the ProSell platform admin can manage global categories",
        )
