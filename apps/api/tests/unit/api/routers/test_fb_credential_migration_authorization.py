"""Unit tests for Facebook credential migration authorization boundaries."""

from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User
from prosell.infrastructure.api.routers.fb_credential_migration_router import (
    CreateMigrationAuthorizationRequest,
    CreateMigrationTokenRequest,
    ImportCredentialsRequest,
    _batch_fingerprint,
    _require_migration_admin,
)


def test_import_request_is_bound_only_to_its_migration_token() -> None:
    """The bot cannot include a tenant claim in an import request."""
    request = ImportCredentialsRequest.model_validate(
        {
            "migration_token": "x" * 32,
            "batch_fingerprint": "a" * 64,
            "accounts": [{"email": "bot@example.com", "password": "secret-password"}],
        }
    )

    assert request.migration_token == "x" * 32

    with pytest.raises(ValidationError):
        ImportCredentialsRequest.model_validate(
            {
                "migration_token": "x" * 32,
                "batch_fingerprint": "a" * 64,
                "tenant_id": str(uuid4()),
                "accounts": [{"email": "bot@example.com", "password": "secret-password"}],
            }
        )


def test_platform_super_admin_can_generate_migration_tokens() -> None:
    """Only the platform role can create centrally owned migration tokens."""
    user = User(id=uuid4(), email="admin@example.com", full_name="Admin")
    user.roles = [Role(id=uuid4(), role_type=RoleType.SUPER_ADMIN, name="Super Admin")]

    assert _require_migration_admin(user) is None


def test_non_admin_cannot_generate_migration_tokens() -> None:
    """Cookie authentication alone cannot issue a credential migration token."""
    user = User(id=uuid4(), email="viewer@example.com", full_name="Viewer", tenant_id=uuid4())
    user.roles = [Role(id=uuid4(), role_type=RoleType.VIEWER, name="Viewer")]

    with pytest.raises(HTTPException) as exc_info:
        _require_migration_admin(user)

    assert exc_info.value.status_code == 403


def test_tenant_admin_cannot_generate_central_migration_tokens() -> None:
    """The tenant admin permission set is insufficient for central credentials."""
    user = User(id=uuid4(), email="admin@example.com", full_name="Admin", tenant_id=uuid4())
    user.roles = [Role(id=uuid4(), role_type=RoleType.ADMIN, name="Admin")]

    with pytest.raises(HTTPException) as exc_info:
        _require_migration_admin(user)

    assert exc_info.value.status_code == 403


def test_import_fingerprint_normalizes_email_alias_and_groups() -> None:
    """The server canonicalizes exactly the safe identity fields approved by the bot."""
    request = ImportCredentialsRequest.model_validate(
        {
            "migration_token": "x" * 32,
            "batch_fingerprint": "a" * 64,
            "accounts": [
                {
                    "email": "BOT@example.com",
                    "password": "secret-password",
                    "alias": " Bot ",
                    "groups": "3, 1-2",
                }
            ],
        }
    )

    assert _batch_fingerprint(request.accounts) == _batch_fingerprint(
        ImportCredentialsRequest.model_validate(
            {
                "migration_token": "x" * 32,
                "batch_fingerprint": "a" * 64,
                "accounts": [
                    {
                        "email": "bot@example.com",
                        "password": "different-secret",
                        "alias": "bot",
                        "groups": "1,2,3",
                    }
                ],
            }
        ).accounts
    )


def test_direct_token_requires_an_approved_batch_summary() -> None:
    """The direct endpoint cannot create an unbound import token."""
    with pytest.raises(ValidationError):
        CreateMigrationTokenRequest.model_validate({})


def test_bot_authorization_request_accepts_only_a_non_secret_batch_summary() -> None:
    """The bot can submit a bounded count and SHA-256 fingerprint, nothing else."""
    fingerprint = "a" * 64
    request = CreateMigrationAuthorizationRequest.model_validate(
        {"account_count": 2, "batch_fingerprint": fingerprint}
    )

    assert request.account_count == 2
    assert request.batch_fingerprint == fingerprint

    with pytest.raises(ValidationError):
        CreateMigrationAuthorizationRequest.model_validate(
            {"account_count": 0, "batch_fingerprint": fingerprint}
        )
    with pytest.raises(ValidationError):
        CreateMigrationAuthorizationRequest.model_validate(
            {"account_count": 101, "batch_fingerprint": fingerprint}
        )
    with pytest.raises(ValidationError):
        CreateMigrationAuthorizationRequest.model_validate(
            {"account_count": 1, "batch_fingerprint": "not-a-sha256"}
        )
    with pytest.raises(ValidationError):
        CreateMigrationAuthorizationRequest.model_validate(
            {"account_count": 1, "batch_fingerprint": fingerprint, "accounts": []}
        )
