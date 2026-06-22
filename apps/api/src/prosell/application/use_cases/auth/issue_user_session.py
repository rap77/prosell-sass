"""Issue a session (tokens + persisted Session row) for an already-authenticated user.

Extracted from LoginUserUseCase's tail end (steps 8-10) so any flow that
ends in "this user is now logged in" — password login, accepting an
organization invitation — issues a session the exact same way once.
"""

import logging

from prosell.application.dto.auth import LoginUserResponse, UserInfo
from prosell.domain.entities.session import Session
from prosell.domain.entities.user import User
from prosell.domain.ports import IJWTService, ITokenHasher
from prosell.domain.repositories.session_repository import AbstractSessionRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository

logger = logging.getLogger(__name__)


class IssueUserSessionUseCase:
    """Issue JWT tokens and persist a Session for a user who is now logged in."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
        jwt_service: IJWTService,
        session_repository: AbstractSessionRepository,
        token_hasher: ITokenHasher,
    ) -> None:
        self.user_repository = user_repository
        self.jwt_service = jwt_service
        self.session_repository = session_repository
        self.token_hasher = token_hasher

    async def execute(
        self,
        user: User,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> LoginUserResponse:
        """Generate tokens for `user` and persist a Session row for them."""
        logger.debug(f"Fetching roles for user {user.id}")
        user_roles = await self.user_repository.get_user_roles(user.id)

        name_parts = user.full_name.split(" ", 1) if user.full_name else ["", ""]
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        access_token = self.jwt_service.generate_access_token(
            user.id,
            user_roles,
            email=user.email,
            first_name=first_name,
            last_name=last_name,
        )
        refresh_token = self.jwt_service.generate_refresh_token(user.id)

        token_hash = self.token_hasher.hash(refresh_token)
        session = Session.create(
            user_id=user.id,
            token_hash=token_hash,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        await self.session_repository.create(session)
        logger.debug(f"Session created for user {user.id}")

        return LoginUserResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserInfo(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                roles=user_roles,
                tenant_id=str(user.tenant_id),
            ),
            requires_2fa=False,
        )
