"""Accept an OrganizationInvitation: create the owner's User, activate the org, log them in."""

from hashlib import sha256

from prosell.application.dto.auth import LoginUserResponse
from prosell.application.use_cases.auth.issue_user_session import IssueUserSessionUseCase
from prosell.domain.entities.organization_invitation import OrganizationInvitationStatus
from prosell.domain.entities.role import RoleType
from prosell.domain.entities.user import User
from prosell.domain.exceptions.auth_exceptions import WeakPasswordException
from prosell.domain.ports import IPasswordService
from prosell.domain.repositories.organization_invitation_repository import (
    AbstractOrganizationInvitationRepository,
)
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.domain.repositories.user_repository import AbstractUserRepository


class AcceptOrganizationInvitationUseCase:
    """Accept a dealer-owner invitation: create their account, log them in."""

    def __init__(
        self,
        invitation_repository: AbstractOrganizationInvitationRepository,
        organization_repository: AbstractOrganizationRepository,
        user_repository: AbstractUserRepository,
        role_repository: AbstractRoleRepository,
        password_service: IPasswordService,
        issue_session_use_case: IssueUserSessionUseCase,
    ) -> None:
        self.invitation_repository = invitation_repository
        self.organization_repository = organization_repository
        self.user_repository = user_repository
        self.role_repository = role_repository
        self.password_service = password_service
        self.issue_session_use_case = issue_session_use_case

    async def execute(
        self,
        token: str,
        password: str,
        first_name: str,
        last_name: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> LoginUserResponse:
        token_hash = sha256(token.encode()).hexdigest()
        # get_by_token_unscoped (not get_by_token) — at this point we don't
        # know which tenant the token belongs to. That's what we're
        # determining. See Task 4, Step 6 for why this method exists.
        #
        # Timing attack surface: a DB lookup leaks a few microseconds of
        # difference between "row found" and "row not found". Mitigated by
        # (1) 256-bit token entropy — collisions/enumeration are not feasible,
        # (2) DB lookup latency dominates any signal, (3) per-IP rate limit
        # on the public endpoint (scheduled in T13, gap G5).
        invitation = await self.invitation_repository.get_by_token_unscoped(token_hash)
        if not invitation:
            raise ValueError("Invalid invitation token")

        if invitation.is_expired():
            invitation.mark_expired()
            await self.invitation_repository.update(invitation)
            raise ValueError("Invitation has expired")

        if invitation.status == OrganizationInvitationStatus.ACCEPTED:
            raise ValueError("Invitation already accepted")

        password_errors = self.password_service.validate_password_strength(password)
        if password_errors:
            raise WeakPasswordException(reasons=password_errors)

        password_hash = self.password_service.hash_password(password)
        user = User.create(
            email=invitation.email,
            password_hash=password_hash,
            full_name=f"{first_name} {last_name}".strip(),
            tenant_id=invitation.tenant_id,
            pre_verified=True,
        )
        user = await self.user_repository.create(user)
        # Accepting the invitation is the owner's first 'login' — stamp it.
        # LoginUserUseCase does this in its step 7; IssueUserSessionUseCase
        # (extracted in T6) does not, so callers that go through it must.
        user.update_last_login(ip_address)
        await self.user_repository.update(user)

        admin_role = await self.role_repository.get_by_type(RoleType.ADMIN)
        if admin_role is None:
            raise ValueError("ADMIN role is not seeded — cannot complete onboarding")
        await self.role_repository.assign_role_to_user(user.id, admin_role.id)

        organization = await self.organization_repository.get_by_id(
            invitation.organization_id, tenant_id=invitation.tenant_id
        )
        if organization is None:
            raise ValueError("Organization for this invitation no longer exists")
        organization.verify(verifier_id=user.id)
        await self.organization_repository.update(organization)

        invitation.accept(accepted_by_user_id=user.id)
        await self.invitation_repository.update(invitation)

        return await self.issue_session_use_case.execute(
            user, ip_address=ip_address, user_agent=user_agent
        )
