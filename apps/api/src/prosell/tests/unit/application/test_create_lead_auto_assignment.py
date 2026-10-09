"""Unit tests for CreateLeadUseCase auto-assignment integration."""

from collections.abc import Iterable
from datetime import datetime
from uuid import UUID, uuid4

from prosell.application.dto.lead.request import CreateLeadRequest
from prosell.application.use_cases.lead.create_lead import CreateLeadUseCase
from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.entities.lead_activity import LeadActivity
from prosell.domain.entities.lead_audit_log import LeadAuditLog
from prosell.domain.entities.product import Product
from prosell.domain.entities.product_audit_log import ProductAuditLog
from prosell.domain.entities.team import Team, TeamMember, TeamMemberRole
from prosell.domain.entities.user import User, UserStatus
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.repositories.team_repository import (
    AbstractTeamMemberRepository,
    AbstractTeamRepository,
)
from prosell.domain.repositories.user_repository import AbstractUserRepository
from prosell.domain.services.lead_assignment_rules_engine import AssignmentStrategy
from prosell.domain.value_objects.attribute_filter import AttributeFilter
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.domain.value_objects.product_condition import ProductCondition
from prosell.domain.value_objects.product_status import ProductStatus


class InMemoryLeadRepository(AbstractLeadRepository):
    def __init__(self) -> None:
        self.leads: dict[UUID, Lead] = {}

    async def create(self, lead: Lead) -> Lead:
        self.leads[lead.id] = lead
        return lead

    async def get_by_id(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        *,
        include_product: bool = False,
        scope: AllScope | ExplicitOrgsScope | OwnScope | None = None,
        actor_id: UUID | None = None,
    ) -> Lead | None:
        del tenant_id, include_product, scope, actor_id
        return self.leads.get(lead_id)

    async def get_many_by_ids(self, lead_ids: list[UUID], tenant_id: UUID) -> list[Lead]:
        del tenant_id
        return [self.leads[lid] for lid in lead_ids if lid in self.leads]

    async def get_by_buyer_and_product(
        self,
        buyer_email: str | None,
        buyer_phone: str | None,
        product_id: UUID | None,
        tenant_id: UUID,
        within_hours: int = 24,
    ) -> Lead | None:
        del within_hours
        matches = [
            lead
            for lead in self.leads.values()
            if lead.tenant_id == tenant_id
            and lead.product_id == product_id
            and (
                (buyer_email is not None and lead.buyer_email == buyer_email)
                or (buyer_phone is not None and lead.buyer_phone == buyer_phone)
            )
        ]
        return matches[0] if matches else None

    async def update_status(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        new_status: LeadStatus,
        changed_by_user_id: UUID | None = None,
        reason: str | None = None,
        *,
        scope: AllScope | ExplicitOrgsScope | OwnScope | None = None,
        actor_id: UUID | None = None,
    ) -> Lead:
        del tenant_id, changed_by_user_id, reason, scope, actor_id
        lead = self.leads[lead_id]
        object.__setattr__(lead, "status", new_status)
        return lead

    async def list_by_vendedor(
        self,
        tenant_id: UUID,
        vendedor_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status: LeadStatus | None = None,
        include_products: bool = False,
    ) -> tuple[list[Lead], int]:
        del include_products
        leads = [
            lead
            for lead in self.leads.values()
            if lead.tenant_id == tenant_id
            and lead.vendedor_id == vendedor_id
            and (status is None or lead.status == status)
        ]
        return leads[offset : offset + limit], len(leads)

    async def list_by_manager(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status: LeadStatus | None = None,
        vendedor_id: UUID | None = None,
        include_products: bool = False,
    ) -> tuple[list[Lead], int]:
        del include_products
        leads = [
            lead
            for lead in self.leads.values()
            if lead.tenant_id == tenant_id
            and (vendedor_id is None or lead.vendedor_id == vendedor_id)
            and (status is None or lead.status == status)
        ]
        return leads[offset : offset + limit], len(leads)

    async def get_audit_logs(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        limit: int = 50,
        *,
        scope: AllScope | ExplicitOrgsScope | OwnScope | None = None,
        actor_id: UUID | None = None,
    ) -> list[LeadAuditLog]:
        del lead_id, tenant_id, limit, scope, actor_id
        return []

    async def create_activity(
        self,
        activity: LeadActivity,
        *,
        scope: AllScope | ExplicitOrgsScope | OwnScope | None = None,
        actor_id: UUID | None = None,
    ) -> LeadActivity:
        del activity, scope, actor_id
        raise NotImplementedError

    async def list_stale(self, before, exclude_statuses) -> list[Lead]:
        del before, exclude_statuses
        return []

    async def touch(self, lead_id: UUID, tenant_id: UUID) -> None:
        del lead_id, tenant_id

    async def get_activities(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        limit: int = 50,
        *,
        scope: AllScope | ExplicitOrgsScope | OwnScope | None = None,
        actor_id: UUID | None = None,
    ) -> list[LeadActivity]:
        del lead_id, tenant_id, limit, scope, actor_id
        return []

    async def find_by_email(
        self,
        tenant_id: UUID,
        email: str,
        within_hours: int = 24,
        *,
        scope: AllScope | ExplicitOrgsScope | OwnScope | None = None,
        actor_id: UUID | None = None,
    ) -> list[Lead]:
        del tenant_id, within_hours, scope, actor_id
        return [lead for lead in self.leads.values() if lead.buyer_email == email]

    async def find_by_phone(
        self,
        tenant_id: UUID,
        phone: str,
        within_hours: int = 24,
        *,
        scope: AllScope | ExplicitOrgsScope | OwnScope | None = None,
        actor_id: UUID | None = None,
    ) -> list[Lead]:
        del tenant_id, within_hours, scope, actor_id
        return [lead for lead in self.leads.values() if lead.buyer_phone == phone]

    async def find_potential_duplicates(
        self,
        tenant_id: UUID,
        email: str | None = None,
        phone: str | None = None,
        within_hours: int = 24,
        *,
        scope: AllScope | ExplicitOrgsScope | OwnScope | None = None,
        actor_id: UUID | None = None,
    ) -> list[Lead]:
        del tenant_id, within_hours, scope, actor_id
        return [
            lead
            for lead in self.leads.values()
            if (email and lead.buyer_email == email) or (phone and lead.buyer_phone == phone)
        ]

    async def assign_to_vendedor(
        self,
        lead_id: UUID,
        tenant_id: UUID,
        new_vendedor_id: UUID | None,
        *,
        scope: AllScope | ExplicitOrgsScope | OwnScope | None = None,
        actor_id: UUID | None = None,
    ) -> Lead:
        del tenant_id, scope, actor_id
        lead = self.leads[lead_id]
        object.__setattr__(lead, "vendedor_id", new_vendedor_id)
        return lead

    async def count_by_vendedor(
        self,
        vendedor_id: UUID,
        tenant_id: UUID,
        status: LeadStatus | None = None,
    ) -> int:
        return sum(
            1
            for lead in self.leads.values()
            if lead.tenant_id == tenant_id
            and lead.vendedor_id == vendedor_id
            and (status is None or lead.status == status)
        )

    async def list_by_tenant(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status_filter: LeadStatus | None = None,
    ) -> tuple[list[Lead], int]:
        leads = [
            lead
            for lead in self.leads.values()
            if lead.tenant_id == tenant_id
            and (status_filter is None or lead.status == status_filter)
        ]
        return leads[offset : offset + limit], len(leads)


class StubUserRepository(AbstractUserRepository):
    def __init__(self, users: list[User]) -> None:
        self.users = {user.id: user for user in users}

    async def create(self, user: User) -> User:
        self.users[user.id] = user
        return user

    async def get_by_id(self, user_id: UUID) -> User | None:
        return self.users.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        return next((user for user in self.users.values() if user.email == email), None)

    async def update(self, user: User) -> User:
        self.users[user.id] = user
        return user

    async def delete(self, user_id: UUID) -> None:
        self.users.pop(user_id, None)

    async def list_with_pagination(
        self,
        limit: int = 100,
        offset: int = 0,
        tenant_id: UUID | None = None,
    ) -> list[User]:
        users = list(self.users.values())
        if tenant_id is not None:
            users = [user for user in users if user.tenant_id == tenant_id]
        return users[offset : offset + limit]

    async def get_user_roles(self, user_id: UUID) -> list[str]:
        user = self.users.get(user_id)
        if user is None or not user.roles:
            return []
        return [role.role_type.value for role in user.roles if role.role_type is not None]

    async def email_exists(self, email: str) -> bool:
        return any(user.email == email for user in self.users.values())

    async def get_by_verification_token(self, token: str) -> User | None:
        del token
        return None

    async def get_by_password_reset_token(self, token: str) -> User | None:
        del token
        return None

    async def get_by_oauth(self, provider: str, provider_user_id: str) -> User | None:
        del provider, provider_user_id
        return None

    async def create_verification_token(
        self,
        user_id: UUID,
        token: str,
        token_type: str,
        expires_in_minutes: int = 60,
    ) -> None:
        del user_id, token, token_type, expires_in_minutes

    async def consume_token(self, token: str) -> bool:
        del token
        return False

    async def get_users_by_tenant_and_role(
        self,
        tenant_id: UUID,
        role: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[User]:
        del role
        users = [user for user in self.users.values() if user.tenant_id == tenant_id]
        return users[skip : skip + limit]

    async def count_users_by_tenant_and_role(
        self,
        tenant_id: UUID,
        role: str,
    ) -> int:
        del role
        return sum(1 for user in self.users.values() if user.tenant_id == tenant_id)

    async def list_by_role_id(self, role_id: UUID) -> list[User]:
        del role_id
        raise NotImplementedError


class StubProductRepository(AbstractProductRepository):
    def __init__(self, products: list[Product]) -> None:
        self.products = {product.id: product for product in products}

    async def create(self, product: Product) -> Product:
        self.products[product.id] = product
        return product

    async def get_by_id(self, product_id: UUID, tenant_id: UUID | None) -> Product | None:
        del tenant_id
        return self.products.get(product_id)

    async def get_by_slug(self, slug: str, tenant_id: UUID) -> Product | None:
        del slug, tenant_id
        return None

    async def get_by_vin(self, vin: str, tenant_id: UUID) -> Product | None:
        for product in self.products.values():
            if product.tenant_id == tenant_id and product.attributes.get("vin") == vin:
                return product
        return None

    async def get_sold_before(self, cutoff: datetime) -> list[Product]:
        return [
            product
            for product in self.products.values()
            if product.status == ProductStatus.SOLD
            and product.sold_at is not None
            and product.sold_at < cutoff
        ]

    async def distinct_attribute_values(
        self, tenant_id: UUID, category_id: UUID, keys: list[str]
    ) -> dict[str, list[str]]:
        del tenant_id, category_id, keys
        return {}

    async def get_max_internal_code(self) -> int | None:
        # Stub returns `None` (no products tracked have a code yet) —
        # the lead-auto-assignment tests never exercise the
        # `InternalCodeAllocator` path.
        return None

    async def allocate_next_internal_code(self) -> int:
        """Return a deterministic code for this in-memory test double.

        Reads the JSONB-side `attributes["internal_code"]` value off
        each tracked product (text), casts to int for the math, and
        returns max + 1. Tests that predate the JSONB move still expect
        an int — only the storage shape changed.
        """
        codes: list[int] = []
        for product in self.products.values():
            raw = (product.attributes or {}).get("internal_code")
            if raw is None or raw == "":
                continue
            try:
                codes.append(int(str(raw)))
            except (TypeError, ValueError):
                continue
        return max(codes, default=0) + 1

    async def internal_code_exists(
        self, code: int, *, exclude_product_id: UUID | None = None
    ) -> bool:
        del code, exclude_product_id
        return False

    async def internal_codes_exist(self, codes: Iterable[int]) -> set[int]:
        # Stub returns the empty set — the lead-auto-assignment tests
        # never exercise the preview's batched collision lookup.
        del codes
        return set()

    async def update_internal_code_if_absent(self, product_id: UUID, code: int) -> bool:
        # Stub never exercises the export backfill path; mirror
        # `internal_code_exists` and return False (no-op). Added to
        # satisfy the abstract method added by the export backfill fix.
        del product_id, code
        return False

    async def get_all(
        self,
        tenant_id: UUID | None,
        organization_id: UUID | None = None,
        organization_ids: list[UUID] | None = None,
        category_id: UUID | None = None,
        status: ProductStatus | None = None,
        condition: ProductCondition | None = None,
        is_featured: bool | None = None,
        search_query: str | None = None,
        min_price_cents: int | None = None,
        max_price_cents: int | None = None,
        attribute_filters: list[AttributeFilter] | None = None,
        published_to_marketplace: bool | None = None,
        has_images: bool | None = None,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> list[Product]:
        del (
            organization_id,
            organization_ids,
            category_id,
            status,
            condition,
            is_featured,
            search_query,
            min_price_cents,
            max_price_cents,
            attribute_filters,
            published_to_marketplace,
            has_images,
            order_by,
            order_desc,
        )
        products = [product for product in self.products.values() if product.tenant_id == tenant_id]
        return products[skip : skip + limit]

    async def get_by_organization(
        self,
        organization_id: UUID,
        tenant_id: UUID,
        status: ProductStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Product]:
        del status
        products = [
            product
            for product in self.products.values()
            if product.organization_id == organization_id and product.tenant_id == tenant_id
        ]
        return products[skip : skip + limit]

    async def get_by_category(
        self,
        category_id: UUID,
        tenant_id: UUID,
        status: ProductStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Product]:
        del status
        products = [
            product
            for product in self.products.values()
            if product.category_id == category_id and product.tenant_id == tenant_id
        ]
        return products[skip : skip + limit]

    async def get_pending_approval(
        self,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Product]:
        products = [product for product in self.products.values() if product.tenant_id == tenant_id]
        return products[skip : skip + limit]

    async def update(
        self,
        product: Product,
        *,
        changed_by_user_id: UUID | None = None,
        reason: str | None = None,
    ) -> Product:
        del changed_by_user_id, reason
        self.products[product.id] = product
        return product

    async def get_audit_logs(
        self,
        product_id: UUID,
        tenant_id: UUID,
        limit: int = 50,
    ) -> list[ProductAuditLog]:
        del product_id, tenant_id, limit
        return []

    async def delete(self, product_id: UUID, tenant_id: UUID) -> bool:
        del tenant_id
        return self.products.pop(product_id, None) is not None

    async def count(
        self,
        tenant_id: UUID | None,
        organization_id: UUID | None = None,
        organization_ids: list[UUID] | None = None,
        category_id: UUID | None = None,
        status: ProductStatus | None = None,
        condition: ProductCondition | None = None,
        is_featured: bool | None = None,
        search_query: str | None = None,
        min_price_cents: int | None = None,
        max_price_cents: int | None = None,
        attribute_filters: list[AttributeFilter] | None = None,
        published_to_marketplace: bool | None = None,
        has_images: bool | None = None,
    ) -> int:
        del (
            organization_ids,
            category_id,
            status,
            condition,
            is_featured,
            search_query,
            min_price_cents,
            max_price_cents,
            attribute_filters,
            published_to_marketplace,
            has_images,
        )
        products = [product for product in self.products.values() if product.tenant_id == tenant_id]
        if organization_id is not None:
            products = [
                product for product in products if product.organization_id == organization_id
            ]
        return len(products)

    async def get_price_range(
        self,
        tenant_id: UUID | None,
        organization_id: UUID | None = None,
        organization_ids: list[UUID] | None = None,
        category_id: UUID | None = None,
        status: ProductStatus | None = None,
        condition: ProductCondition | None = None,
        is_featured: bool | None = None,
        search_query: str | None = None,
        attribute_filters: list[AttributeFilter] | None = None,
        published_to_marketplace: bool | None = None,
        has_images: bool | None = None,
    ) -> tuple[int, int] | None:
        # Stub never exercises the price-range slider path — the
        # lead-auto-assignment tests don't touch it.
        del (
            tenant_id,
            organization_id,
            organization_ids,
            category_id,
            status,
            condition,
            is_featured,
            search_query,
            attribute_filters,
            published_to_marketplace,
            has_images,
        )
        return None

    async def increment_view_count(self, product_id: UUID, tenant_id: UUID) -> None:
        del product_id, tenant_id

    async def increment_favorite_count(self, product_id: UUID, tenant_id: UUID) -> None:
        del product_id, tenant_id

    async def decrement_favorite_count(self, product_id: UUID, tenant_id: UUID) -> None:
        del product_id, tenant_id

    async def get_featured(self, tenant_id: UUID, limit: int = 10) -> list[Product]:
        products = [product for product in self.products.values() if product.tenant_id == tenant_id]
        return products[:limit]

    async def search(
        self,
        tenant_id: UUID,
        query: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Product]:
        matches = [
            product
            for product in self.products.values()
            if product.tenant_id == tenant_id and query.lower() in product.title.lower()
        ]
        return matches[skip : skip + limit]

    async def get_recently_viewed(
        self,
        tenant_id: UUID,
        product_ids: list[UUID],
        limit: int = 10,
    ) -> list[Product]:
        products = [
            product
            for product_id in product_ids
            if (product := self.products.get(product_id)) is not None
            and product.tenant_id == tenant_id
        ]
        return products[:limit]

    async def set_primary_image(
        self,
        product_id: UUID,
        image_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        del product_id, image_id, tenant_id
        return True


class StubTeamRepository(AbstractTeamRepository):
    def __init__(self, teams: list[Team]) -> None:
        self.teams = teams

    async def create(self, team: Team) -> Team:
        self.teams.append(team)
        return team

    async def get_by_id(self, team_id: UUID, tenant_id: UUID) -> Team | None:
        return next(
            (team for team in self.teams if team.id == team_id and team.tenant_id == tenant_id),
            None,
        )

    async def get_by_org(
        self,
        org_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Team]:
        teams = [
            team for team in self.teams if team.org_id == org_id and team.tenant_id == tenant_id
        ]
        return teams[skip : skip + limit]

    async def get_all(
        self,
        tenant_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Team]:
        teams = self.teams
        if tenant_id is not None:
            teams = [team for team in teams if team.tenant_id == tenant_id]
        return teams[skip : skip + limit]

    async def update(self, team: Team) -> Team:
        return team

    async def delete(self, team_id: UUID, tenant_id: UUID) -> bool:
        for index, team in enumerate(self.teams):
            if team.id == team_id and team.tenant_id == tenant_id:
                del self.teams[index]
                return True
        return False

    async def exists_by_name(self, name: str, org_id: UUID, tenant_id: UUID) -> bool:
        return any(
            team.name == name and team.org_id == org_id and team.tenant_id == tenant_id
            for team in self.teams
        )

    async def count(self, tenant_id: UUID | None = None) -> int:
        if tenant_id is None:
            return len(self.teams)
        return sum(1 for team in self.teams if team.tenant_id == tenant_id)

    async def count_by_org(self, org_id: UUID, tenant_id: UUID) -> int:
        return sum(
            1 for team in self.teams if team.org_id == org_id and team.tenant_id == tenant_id
        )


class StubTeamMemberRepository(AbstractTeamMemberRepository):
    def __init__(self, members_by_team: dict[UUID, list[TeamMember]]) -> None:
        self.members_by_team = members_by_team

    async def create(self, member: TeamMember) -> TeamMember:
        self.members_by_team.setdefault(member.team_id, []).append(member)
        return member

    async def get_by_id(self, member_id: UUID, tenant_id: UUID) -> TeamMember | None:
        for members in self.members_by_team.values():
            for member in members:
                if member.id == member_id and member.tenant_id == tenant_id:
                    return member
        return None

    async def get_by_team(
        self,
        team_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[TeamMember]:
        members = [
            member
            for member in self.members_by_team.get(team_id, [])
            if member.tenant_id == tenant_id
        ]
        return members[skip : skip + limit]

    async def get_by_user(self, user_id: UUID, tenant_id: UUID) -> list[TeamMember]:
        return [
            member
            for members in self.members_by_team.values()
            for member in members
            if member.user_id == user_id and member.tenant_id == tenant_id
        ]

    async def update(self, member: TeamMember) -> TeamMember:
        return member

    async def delete(self, member_id: UUID, tenant_id: UUID) -> bool:
        for members in self.members_by_team.values():
            for index, member in enumerate(members):
                if member.id == member_id and member.tenant_id == tenant_id:
                    del members[index]
                    return True
        return False

    async def remove_from_team(self, team_id: UUID, user_id: UUID, tenant_id: UUID) -> bool:
        members = self.members_by_team.get(team_id, [])
        for index, member in enumerate(members):
            if member.user_id == user_id and member.tenant_id == tenant_id:
                del members[index]
                return True
        return False

    async def count(self, tenant_id: UUID | None = None) -> int:
        members = [
            member for team_members in self.members_by_team.values() for member in team_members
        ]
        if tenant_id is None:
            return len(members)
        return sum(1 for member in members if member.tenant_id == tenant_id)


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
    owner = build_active_user(owner_id, tenant_id, "Owner Organization")
    other = build_active_user(other_id, tenant_id, "Other Organization")
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
    busy = build_active_user(busy_id, tenant_id, "Busy Organization")
    free = build_active_user(free_id, tenant_id, "Free Organization")
    team, members = build_team_with_members(tenant_id, [busy_id, free_id])

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
