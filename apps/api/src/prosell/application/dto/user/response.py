"""Shared user response DTOs used by admin endpoints — bloque 3."""

from uuid import UUID

from pydantic import BaseModel


class UserSummaryResponse(BaseModel):
    """Minimal user shape the admin profiles UI needs: confirming an
    exact-email match before assigning a role to it (admin_users_router.py),
    and listing who already holds a role (admin_roles_router.py)."""

    id: UUID
    email: str
    full_name: str
    tenant_id: UUID | None
