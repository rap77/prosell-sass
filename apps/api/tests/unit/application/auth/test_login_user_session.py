"""
Regression tests for LoginUserUseCase session creation.

Bug: LoginUserUseCase (no-2FA path) generated access/refresh tokens but
did NOT persist a Session row in the DB. Only Verify2FAUseCase did. As a
result, /api/v1/auth/refresh always returned 500 "Invalid or expired
session" for non-2FA users, since get_by_token_hash found no row.

These tests pin the contract: a successful login without 2FA MUST create
a Session with the hashed refresh token.
"""
# pyright: reportUnknownArgumentType=false, reportUnknownMemberType=false, reportUnknownParameterType=false, reportMissingParameterType=false, reportUnknownVariableType=false

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.application.dto.auth.login import LoginUserRequest
from prosell.application.use_cases.auth.login_user import LoginUserUseCase
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.session import Session
from prosell.domain.entities.user import User, UserStatus


def make_user(
    email: str = "admin@prosell.saas",
    is_2fa_enabled: bool = False,
) -> User:
    """Build a minimal ACTIVE, email-verified User for login tests."""
    role = Role(
        id=uuid4(),
        role_type=RoleType.SALES_AGENT,
        name="Sales Agent",
        is_system_role=True,
    )
    return User(
        id=uuid4(),
        email=email,
        full_name="Test Admin",
        tenant_id=uuid4(),
        status=UserStatus.ACTIVE,
        email_verified=True,
        is_2fa_enabled=is_2fa_enabled,
        roles=[role],
        password_hash="$2b$12$existinghashplaceholder",
    )


class TestLoginUserSessionCreation:
    """Login must persist a Session for /auth/refresh to work."""

    @pytest.fixture
    def user_repo(self) -> AsyncMock:
        r = AsyncMock()
        r.get_by_email = AsyncMock(return_value=None)
        r.get_user_roles = AsyncMock(return_value=[])
        r.update = AsyncMock(return_value=None)
        r.create_verification_token = AsyncMock(return_value=None)
        return r

    @pytest.fixture
    def password_service(self) -> MagicMock:
        svc = MagicMock()
        svc.verify_password = MagicMock(return_value=False)
        return svc

    @pytest.fixture
    def jwt_service(self) -> MagicMock:
        svc = MagicMock()
        svc.generate_access_token = MagicMock(return_value="access.jwt.token")
        svc.generate_refresh_token = MagicMock(return_value="refresh.jwt.token")
        return svc

    @pytest.fixture
    def session_repository(self) -> AsyncMock:
        r = AsyncMock()
        r.create = AsyncMock(return_value=None)
        return r

    @pytest.fixture
    def token_hasher(self) -> MagicMock:
        h = MagicMock()
        h.hash = MagicMock(return_value="hashed_token_abc123")
        return h

    @pytest.mark.asyncio
    async def test_login_without_2fa_creates_session(
        self,
        user_repo,
        password_service,
        jwt_service,
        session_repository,
        token_hasher,
    ) -> None:
        """Non-2FA login MUST create a Session row so refresh can find it later."""
        user = make_user(is_2fa_enabled=False)
        user_repo.get_by_email = AsyncMock(return_value=user)
        user_repo.get_user_roles = AsyncMock(return_value=["sales_agent"])
        password_service.verify_password = MagicMock(return_value=True)

        use_case = LoginUserUseCase(
            user_repo,
            password_service,
            jwt_service,
            session_repository,
            token_hasher,
        )
        request = LoginUserRequest(
            email=user.email,
            password="Test123!",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
        )

        response = await use_case.execute(request)

        # Response should still carry the tokens
        assert response.access_token == "access.jwt.token"
        assert response.refresh_token == "refresh.jwt.token"
        assert response.requires_2fa is False

        # And the session MUST be persisted
        session_repository.create.assert_awaited_once()
        created_session = session_repository.create.await_args.args[0]
        assert isinstance(created_session, Session)
        assert created_session.user_id == user.id
        assert created_session.token_hash == "hashed_token_abc123"
        assert created_session.ip_address == "192.168.1.1"
        assert created_session.user_agent == "Mozilla/5.0"

    @pytest.mark.asyncio
    async def test_token_hasher_is_called_with_refresh_token(
        self,
        user_repo,
        password_service,
        jwt_service,
        session_repository,
        token_hasher,
    ) -> None:
        """The hashed value used for the session must be the refresh token hash."""
        user = make_user(is_2fa_enabled=False)
        user_repo.get_by_email = AsyncMock(return_value=user)
        password_service.verify_password = MagicMock(return_value=True)

        use_case = LoginUserUseCase(
            user_repo,
            password_service,
            jwt_service,
            session_repository,
            token_hasher,
        )
        request = LoginUserRequest(
            email=user.email,
            password="Test123!",
        )

        await use_case.execute(request)

        token_hasher.hash.assert_called_once_with("refresh.jwt.token")
