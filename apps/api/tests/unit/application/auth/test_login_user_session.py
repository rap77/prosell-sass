"""
Regression tests for LoginUserUseCase session delegation.

Bug: LoginUserUseCase (no-2FA path) generated access/refresh tokens but
did NOT persist a Session row in the DB. Only Verify2FAUseCase did. As a
result, /api/v1/auth/refresh always returned 500 "Invalid or expired
session" for non-2FA users, since get_by_token_hash found no row.

Session issuance was later extracted into IssueUserSessionUseCase (see
test_issue_user_session.py, which now owns the "Session gets persisted
with the right token hash" assertions). These tests pin the remaining
LoginUserUseCase contract: a successful login without 2FA MUST delegate
to issue_session_use_case with the authenticated user.
"""
# pyright: reportUnknownArgumentType=false, reportUnknownMemberType=false, reportUnknownParameterType=false, reportMissingParameterType=false, reportUnknownVariableType=false

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.application.dto.auth import LoginUserResponse, UserInfo
from prosell.application.dto.auth.login import LoginUserRequest
from prosell.application.use_cases.auth.login_user import LoginUserUseCase
from prosell.domain.entities.role import Role, RoleType
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
    """Login must delegate to IssueUserSessionUseCase so a Session gets persisted."""

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
    def issue_session_use_case(self) -> AsyncMock:
        uc = AsyncMock()
        uc.execute = AsyncMock(
            return_value=LoginUserResponse(
                access_token="access.jwt.token",
                refresh_token="refresh.jwt.token",
                user=UserInfo(
                    id="user-id",
                    email="admin@prosell.saas",
                    full_name="Test Admin",
                    tenant_id="tenant-id",
                ),
                requires_2fa=False,
            )
        )
        return uc

    @pytest.mark.asyncio
    async def test_login_without_2fa_delegates_to_issue_session_use_case(
        self,
        user_repo,
        password_service,
        issue_session_use_case,
    ) -> None:
        """Non-2FA login MUST delegate token/session issuance to IssueUserSessionUseCase."""
        user = make_user(is_2fa_enabled=False)
        user_repo.get_by_email = AsyncMock(return_value=user)
        password_service.verify_password = MagicMock(return_value=True)

        use_case = LoginUserUseCase(user_repo, password_service, issue_session_use_case)
        request = LoginUserRequest(
            email=user.email,
            password="Test123!",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
        )

        response = await use_case.execute(request)

        # Response is whatever IssueUserSessionUseCase returned
        assert response.access_token == "access.jwt.token"
        assert response.refresh_token == "refresh.jwt.token"
        assert response.requires_2fa is False

        # And the delegation MUST carry the authenticated user + request metadata
        issue_session_use_case.execute.assert_awaited_once_with(
            user, ip_address="192.168.1.1", user_agent="Mozilla/5.0"
        )

    @pytest.mark.asyncio
    async def test_login_without_2fa_passes_request_metadata_through(
        self,
        user_repo,
        password_service,
        issue_session_use_case,
    ) -> None:
        """ip_address/user_agent on the request must reach IssueUserSessionUseCase unchanged."""
        user = make_user(is_2fa_enabled=False)
        user_repo.get_by_email = AsyncMock(return_value=user)
        password_service.verify_password = MagicMock(return_value=True)

        use_case = LoginUserUseCase(user_repo, password_service, issue_session_use_case)
        request = LoginUserRequest(
            email=user.email,
            password="Test123!",
        )

        await use_case.execute(request)

        issue_session_use_case.execute.assert_awaited_once_with(
            user, ip_address=None, user_agent=None
        )
