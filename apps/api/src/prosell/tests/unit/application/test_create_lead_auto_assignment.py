"""Unit tests for CreateLeadUseCase auto-assignment integration."""

from uuid import UUID, uuid4

from prosell.application.dto.lead.request import CreateLeadRequest
from prosell.application.use_cases.lead.create_lead import CreateLeadUseCase
from prosell.domain.entities.lead import Lead
from prosell.domain.entities.product import Product
from prosell.domain.entities.team import Team, TeamMember, TeamMemberRole
from prosell.domain.entities.user import User, UserStatus
from prosell.domain.services.lead_assignment_rules_engine import AssignmentStrategy


class InMemoryLeadRepository:
    def __init__(self) -> None:
        self.leads: dict[UUID, Lead] = {}

    async def create(self, lead: Lead) -> Lead:
        self.leads[lead.id] = lead
        return lead

    async def get_by_id(self, lead_id: UUID, tenant_id: UUID) -> Lead | None:  # noqa: ARG002
        return self.leads.get(lead_id)

    async def count_by_vendedor(self, vendedor_id: UUID, tenant_id: UUID) -> int:  # noqa: ARG002
        return sum(1 for lead in self.leads.values() if lead.vendedor_id == vendedor_id)

    async def find_by_email(self, email: str, tenant_id: UUID) -> list[Lead]:  # noqa: ARG002
        return [lead for lead in self.leads.values() if lead.buyer_email == email]

    async def find_by_phone(self, phone: str, tenant_id: UUID) -> list[Lead]:  # noqa: ARG002
        return [lead for lead in self.leads.values() if lead.buyer_phone == phone]

    async def find_potential_duplicates(
        self, email: str | None, phone: str | None, tenant_id: UUID  # noqa: ARG002
    ) -> list[Lead]:
        return [
            lead
            for lead in self.leads.values()
            if (email and lead.buyer_email == email) or (phone and lead.buyer_phone == phone)
        ]


class StubUserRepository:
    def __init__(self, users: list[User]) -> None:
        self.users = {user.id: user for user in users}

    async def get_by_id(self, user_id: UUID) -> User | None:
        return self.users.get(user_id)


class StubProductRepository:
    def __init__(self, products: list[Product]) -> None:
        self.products = {product.id: product for product in products}

    async def get_by_id(self, product_id: UUID, tenant_id: UUID) -> Product | None:  # noqa: ARG002
        return self.products.get(product_id)


class StubTeamRepository:
    def __init__(self, teams: list[Team]) -> None:
        self.teams = teams

    async def get_all(
        self, tenant_id: UUID | None = None, skip: int = 0, limit: int = 100  # noqa: ARG002
    ) -> list[Team]:
        return self.teams


class StubTeamMemberRepository:
    def __init__(self, members_by_team: dict[UUID, list[TeamMember]]) -> None:
        self.members_by_team = members_by_team

    async def get_by_team(
        self, team_id: UUID, tenant_id: UUID, skip: int = 0, limit: int = 100  # noqa: ARG002
    ) -> list[TeamMember]:
        return self.members_by_team.get(team_id, [])


def build_active_user(user_id: UUID, tenant_id: UUID, full_name: str) -> User:
    return User(
        id=user_id,
        email=f"{full_name.lower().replace(' ', '.')}@example.com",
        full_name=full_name,
        status=UserStatus.ACTIVE,
        email_verified=True,
        tenant_id=tenant_id,
    )


def build_team_with_members(tenant_id: UUID, user_ids: list[UUID]) -> tuple[Team, list[TeamMember]]:
    team = Team.create(name="Ventas", tenant_id=tenant_id, org_id=tenant_id)
    members = [
        TeamMember.create(
            team_id=team.id,
            user_id=user_id,
            role=TeamMemberRole.VENDOR,
            tenant_id=tenant_id,
        )
        for user_id in user_ids
    ]
    return team, members


async def test_create_lead_auto_assigns_to_product_owner_with_combined_strategy() -> None:
    tenant_id = uuid4()
    owner_id = uuid4()
    other_id = uuid4()
    product_id = uuid4()

    lead_repo = InMemoryLeadRepository()
    owner = build_active_user(owner_id, tenant_id, "Owner Dealer")
    other = build_active_user(other_id, tenant_id, "Other Dealer")
    product = Product(
        id=product_id,
        tenant_id=tenant_id,
        organization_id=tenant_id,
        category_id=uuid4(),
        title="Vehicle",
        price_cents=10000,
        submitted_by=owner_id,
    )
    team, members = build_team_with_members(tenant_id, [owner_id, other_id])

    use_case = CreateLeadUseCase(
        lead_repository=lead_repo,
        user_repository=StubUserRepository([owner, other]),
        product_repository=StubProductRepository([product]),
        team_repository=StubTeamRepository([team]),
        team_member_repository=StubTeamMemberRepository({team.id: members}),
    )

    response = await use_case.execute(
        request=CreateLeadRequest(
            buyer_name="Buyer One",
            buyer_email="buyer1@example.com",
            product_id=product_id,
        ),
        tenant_id=tenant_id,
    )

    assert response.vendedor_id == owner_id


async def test_create_lead_auto_assigns_using_configured_workload_strategy() -> None:
    tenant_id = uuid4()
    busy_id = uuid4()
    free_id = uuid4()

    lead_repo = InMemoryLeadRepository()
    busy = build_active_user(busy_id, tenant_id, "Busy Dealer")
    free = build_active_user(free_id, tenant_id, "Free Dealer")
    team, members = build_team_with_members(tenant_id, [busy_id, free_id])

    # Seed workload so busy dealer already has more leads.
    for index in range(3):
        seeded_lead = Lead.create(
            buyer_name=f"Existing Buyer {index}",
            tenant_id=tenant_id,
            vendedor_id=busy_id,
        )
        await lead_repo.create(seeded_lead)

    use_case = CreateLeadUseCase(
        lead_repository=lead_repo,
        user_repository=StubUserRepository([busy, free]),
        product_repository=StubProductRepository([]),
        team_repository=StubTeamRepository([team]),
        team_member_repository=StubTeamMemberRepository({team.id: members}),
        assignment_strategy=AssignmentStrategy.WORKLOAD_BALANCING,
    )

    response = await use_case.execute(
        request=CreateLeadRequest(
            buyer_name="Buyer Two",
            buyer_email="buyer2@example.com",
        ),
        tenant_id=tenant_id,
    )

    assert response.vendedor_id == free_id
