"""Unit tests for Facebook credential migration authorization boundaries."""

from uuid import uuid4

import pytest
from fastapi import HTTPException

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User
from prosell.infrastructure.api.routers.fb_credential_migration_router import (
    ImportCredentialsRequest,
    _require_migration_admin,
)


def test_import_request_requires_a_tenant_claim() -> None:
    """The bot must provide the tenant claim that the API compares to its token."""
    tenant_id = uuid4()
    request = ImportCredentialsRequest.model_validate(
        {
            "migration_token": "x" * 32,
            "tenant_id": str(tenant_id),
            "accounts": [{"email": "bot@example.com", "password": "secret-password"}],
        }
    )

    assert request.tenant_id == tenant_id


def test_tenant_admin_can_generate_migration_tokens() -> None:
    """An authenticated admin's tenant is the only tenant used for migration."""
    tenant_id = uuid4()
    user = User(id=uuid4(), email="admin@example.com", full_name="Admin", tenant_id=tenant_id)
    user.roles = [Role(id=uuid4(), role_type=RoleType.ADMIN, name="Admin")]

    assert _require_migration_admin(user) == tenant_id


def test_non_admin_cannot_generate_migration_tokens() -> None:
    """Cookie authentication alone cannot issue a credential migration token."""
    user = User(id=uuid4(), email="viewer@example.com", full_name="Viewer", tenant_id=uuid4())
    user.roles = [Role(id=uuid4(), role_type=RoleType.VIEWER, name="Viewer")]

    with pytest.raises(HTTPException) as exc_info:
        _require_migration_admin(user)

    assert exc_info.value.status_code == 403
