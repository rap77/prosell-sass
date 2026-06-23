"""Create a dealer organization: org + enabled verticals + owner invitation, atomically."""

from uuid import UUID, uuid4

from prosell.application.use_cases.organization.invite_dealer_owner import (
    InviteDealerOwnerUseCase,
)
from prosell.domain.entities.organization import Organization
from prosell.domain.entities.organization_invitation import OrganizationInvitation
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.organization_vertical_repository import (
    AbstractOrganizationVerticalRepository,
)
from prosell.domain.repositories.user_repository import AbstractUserRepository


class CreateDealerOrganizationUseCase:
    """Staff-only: create a new dealer org, enable its verticals, invite its owner.

    Atomic for free: the request-scoped session (`get_async_session`) commits
    once at the end and rolls back the whole session on any unhandled
    exception, and every repository call here uses `.flush()`, never
    `.commit()`. So a failure at any step -- including email delivery inside
    InviteDealerOwnerUseCase -- already rolls back the org and vertical rows
    too, with no explicit transaction wrapping needed in the router. See
    `tests/integration/use_cases/test_create_dealer_organization_atomicity.py`.
    """

    def __init__(
        self,
        organization_repository: AbstractOrganizationRepository,
        vertical_repository: AbstractOrganizationVerticalRepository,
        user_repository: AbstractUserRepository,
        category_repository: AbstractCategoryRepository,
        invite_dealer_owner_use_case: InviteDealerOwnerUseCase,
    ) -> None:
        self.organization_repository = organization_repository
        self.vertical_repository = vertical_repository
        self.user_repository = user_repository
        self.category_repository = category_repository
        self.invite_dealer_owner_use_case = invite_dealer_owner_use_case

    async def execute(
        self,
        name: str,
        vertical_ids: list[UUID],
        owner_email: str,
        inviter_name: str,
        created_by_user_id: UUID,
    ) -> OrganizationInvitation:
        if not vertical_ids:
            raise ValueError("At least one vertical must be selected")

        for root_category_id in vertical_ids:
            category = await self.category_repository.get_by_id_any_tenant(root_category_id)
            if category is None:
                raise ValueError(f"Unknown vertical id: {root_category_id}")

        normalized_email = owner_email.lower().strip()
        existing_user = await self.user_repository.get_by_email(normalized_email)
        if existing_user is not None and existing_user.deleted_at is None:
            raise ValueError("owner_email is already registered")

        tenant_id = uuid4()
        organization = Organization.create(
            name=name, tenant_id=tenant_id, creator_id=created_by_user_id
        )
        organization = await self.organization_repository.create(organization)

        for root_category_id in vertical_ids:
            await self.vertical_repository.enable(
                organization_id=organization.id, root_category_id=root_category_id
            )

        return await self.invite_dealer_owner_use_case.execute(
            organization_id=organization.id,
            organization_name=organization.name,
            email=normalized_email,
            tenant_id=tenant_id,
            inviter_name=inviter_name,
            created_by_user_id=created_by_user_id,
        )
