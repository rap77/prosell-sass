"""Common DTOs used across multiple auth use cases."""

from pydantic import BaseModel


class UserInfo(BaseModel):
    """User info nested model."""

    id: str
    email: str
    full_name: str
    avatar_url: str | None = None
    roles: list[str] = []
    tenant_id: str  # Organization ID for multi-tenant isolation
