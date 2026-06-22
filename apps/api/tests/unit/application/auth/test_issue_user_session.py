"""Tests for IssueUserSessionUseCase."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from prosell.application.use_cases.auth.issue_user_session import IssueUserSessionUseCase
from prosell.domain.entities.user import User


@pytest.fixture
def user() -> User:
    return User.create(email="owner@dealer.com", password_hash="hash", full_name="Owner Name")


@pytest.fixture
def use_case() -> tuple[IssueUserSessionUseCase, MagicMock, MagicMock, AsyncMock, MagicMock]:
    user_repository = AsyncMock()
    jwt_service = MagicMock()
    jwt_service.generate_access_token.return_value = "access-token-value"
    jwt_service.generate_refresh_token.return_value = "refresh-token-value"
    session_repository = AsyncMock()
    token_hasher = MagicMock()
    token_hasher.hash.return_value = "hashed-refresh-token"

    uc = IssueUserSessionUseCase(
        user_repository=user_repository,
        jwt_service=jwt_service,
        session_repository=session_repository,
        token_hasher=token_hasher,
    )
    return uc, jwt_service, session_repository, user_repository, token_hasher


@pytest.mark.asyncio
async def test_returns_login_response_with_tokens(user, use_case):
    uc, _jwt_service, _session_repository, user_repository, _token_hasher = use_case
    user_repository.get_user_roles.return_value = []

    result = await uc.execute(user)

    assert result.access_token == "access-token-value"
    assert result.refresh_token == "refresh-token-value"
    assert result.user.email == user.email
    assert result.requires_2fa is False


@pytest.mark.asyncio
async def test_persists_a_session(user, use_case):
    uc, _jwt_service, session_repository, user_repository, _token_hasher = use_case
    user_repository.get_user_roles.return_value = []

    await uc.execute(user, ip_address="1.2.3.4", user_agent="pytest")

    session_repository.create.assert_called_once()
    created_session = session_repository.create.call_args.args[0]
    assert created_session.user_id == user.id
    assert created_session.token_hash == "hashed-refresh-token"
