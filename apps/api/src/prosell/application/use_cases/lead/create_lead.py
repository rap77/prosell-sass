"""CreateLeadUseCase — validates input and persists new lead."""

from uuid import UUID, uuid4

from prosell.application.dto.lead.request import CreateLeadRequest
from prosell.application.dto.lead.response import LeadResponse
from prosell.domain.entities.lead import Lead
from prosell.domain.value_objects.lead_source import LeadSource
from prosell.domain.entities.notification import Notification, NotificationType
from prosell.domain.exceptions.lead_exceptions import DuplicateLeadException
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.repositories.notification_repository import AbstractNotificationRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.repositories.team_repository import (
    AbstractTeamMemberRepository,
    AbstractTeamRepository,
)
from prosell.domain.repositories.user_repository import AbstractUserRepository
from prosell.domain.services.lead_assignment_rules_engine import (
    AssignmentCandidate,
    AssignmentStrategy,
    LeadAssignmentRulesEngine,
)
from prosell.domain.services.lead_duplicate_detector import LeadDuplicateDetector


class CreateLeadUseCase:
    """
    Create a new lead with duplicate detection and automatic assignment.

    Business rules:
    - If same buyer (email or phone) + same product_id already exists within 24h,
      raise DuplicateLeadException.
    - At least buyer_name must be provided.
    - vendedor_id is optional — if not provided, auto-assign using LeadAssignmentRulesEngine.
    - Uses LeadDuplicateDetector for enhanced duplicate detection.
    - Uses LeadAssignmentRulesEngine for automatic dealer assignment (B4.3.06).
    """

    def __init__(
        self,
        lead_repository: AbstractLeadRepository,
        user_repository: AbstractUserRepository | None = None,
        product_repository: AbstractProductRepository | None = None,
        team_repository: AbstractTeamRepository | None = None,
        team_member_repository: AbstractTeamMemberRepository | None = None,
        assignment_engine: LeadAssignmentRulesEngine | None = None,
        assignment_strategy: AssignmentStrategy = AssignmentStrategy.COMBINED,
        notification_repository: AbstractNotificationRepository | None = None,
    ) -> None:
        """
        Initialize CreateLeadUseCase with dependencies.

        Args:
            lead_repository: Repository for lead persistence
            user_repository: Repository for fetching user details (optional, for auto-assignment)
            product_repository: Repository for fetching product details
            (optional, for auto-assignment)
            team_repository: Repository for fetching teams (optional, for auto-assignment)
            team_member_repository: Repository for fetching team members
            (optional, for auto-assignment)
            assignment_engine: Rules engine for lead assignment (optional, defaults to new instance)
            assignment_strategy: Default strategy used for automatic assignment
            notification_repository: Repository for creating in-app notifications (optional)
        """
        self.lead_repository = lead_repository
        self.user_repository = user_repository
        self.product_repository = product_repository
        self.team_repository = team_repository
        self.team_member_repository = team_member_repository
        self.assignment_engine = assignment_engine or LeadAssignmentRulesEngine()
        self.assignment_strategy = assignment_strategy
        self.notification_repository = notification_repository
        self.duplicate_detector = LeadDuplicateDetector(lead_repository)

    async def execute(
        self,
        request: CreateLeadRequest,
        tenant_id: UUID,
    ) -> LeadResponse:
        """
        Execute lead creation.

        Args:
            request: CreateLeadRequest DTO
            tenant_id: Tenant context from JWT

        Returns:
            LeadResponse DTO

        Raises:
            DuplicateLeadException: If same buyer + vehicle within 24h
        """
        # 1. Enhanced duplicate detection using LeadDuplicateDetector
        duplicates = await self.duplicate_detector.find_duplicates(
            email=request.buyer_email,
            phone=request.buyer_phone,
            tenant_id=tenant_id,
        )

        if duplicates:
            # Batch-fetch all candidate duplicate leads in one query (avoids N+1)
            dup_ids = [dup.lead_id for dup in duplicates]
            dup_leads = await self.lead_repository.get_many_by_ids(dup_ids, tenant_id)
            dup_leads_by_id = {dl.id: dl for dl in dup_leads}
            # Check if any duplicate is for the same product within 24h
            # When product_id is None, we're more lenient (only exact matches count)
            for dup in duplicates:
                dup_lead = dup_leads_by_id.get(dup.lead_id)
                # Only flag as duplicate if:
                # 1. Both have the same non-None product_id, OR
                # 2. Both have None product_id AND it's an exact match (same email AND same phone)
                if dup_lead:
                    same_product = (
                        request.product_id is not None and dup_lead.product_id == request.product_id
                    )
                    exact_match = (
                        request.product_id is None
                        and dup_lead.product_id is None
                        and request.buyer_email
                        and request.buyer_email == dup_lead.buyer_email
                        and request.buyer_phone
                        and request.buyer_phone == dup_lead.buyer_phone
                    )

                    if same_product or exact_match:
                        # Same buyer + same product = hard duplicate
                        raise DuplicateLeadException(
                            f"A lead for this buyer and vehicle already exists (lead ID: {dup.lead_id}). "  # noqa: E501
                            "Please wait 24 hours before creating another."
                        )

            # If duplicates exist but for different products, still warn but allow
            # (This could be enhanced to return warnings in the response)

        # 1.5. Auto-assign lead if vendedor_id is not provided (B4.3.06)
        vendedor_id = request.vendedor_id
        if vendedor_id is None:
            vendedor_id = await self._auto_assign_lead(request, tenant_id)

        # 2. Create domain entity
        lead = Lead.create(
            buyer_name=request.buyer_name,
            tenant_id=tenant_id,
            buyer_email=request.buyer_email,
            buyer_phone=request.buyer_phone,
            product_id=request.product_id,
            vendedor_id=vendedor_id,
            message=request.message,
            source=request.source,
        )

        # 3. Persist
        created = await self.lead_repository.create(lead)

        # 4. Notify assigned vendedor (fire-and-forget — never blocks lead creation)
        if created.vendedor_id is not None and self.notification_repository is not None:
            try:
                notification = Notification.create(
                    tenant_id=tenant_id,
                    user_id=created.vendedor_id,
                    notification_type=NotificationType.LEAD_ASSIGNED,
                    title="Nuevo lead asignado",
                    body=f"Se te asignó el lead de {created.buyer_name}",
                    resource_type="lead",
                    resource_id=created.id,
                )
                await self.notification_repository.create(notification)
            except Exception:
                pass  # Notification failure must never block lead creation

        return LeadResponse.from_entity(created)

    async def _auto_assign_lead(
        self,
        request: CreateLeadRequest,
        tenant_id: UUID,
    ) -> UUID | None:
        """
        Automatically assign lead to a dealer using LeadAssignmentRulesEngine.

        This method implements B4.3.06: Integration of LeadAssignmentRulesEngine
        into CreateLeadUseCase for automatic dealer assignment.

        Assignment Strategy:
        - Uses the configured strategy (COMBINED by default)
        - Respects vehicle ownership if product ownership data is available
        - Falls back gracefully if no dealers are available

        Args:
            request: CreateLeadRequest with lead details
            tenant_id: Tenant UUID for isolation

        Returns:
            Assigned dealer's user_id, or None if assignment failed
        """
        # Skip assignment if dependencies are not available
        if not all(
            [
                self.user_repository,
                self.team_repository,
                self.team_member_repository,
            ]
        ):
            return None

        # Type assertions for Pyright - after the check above, these are guaranteed to be not None
        assert self.user_repository is not None
        assert self.team_repository is not None
        assert self.team_member_repository is not None

        try:
            # Get all teams for the tenant
            teams = await self.team_repository.get_all(tenant_id=tenant_id)
            if not teams:
                return None

            # Collect all team members (dealers) from all teams
            candidates: list[AssignmentCandidate] = []
            organization_members: set[UUID] = set()

            for team in teams:
                members = await self.team_member_repository.get_by_team(
                    team_id=team.id,
                    tenant_id=tenant_id,
                )
                for member in members:
                    # Fetch user details to get name and workload
                    user = await self.user_repository.get_by_id(member.user_id)
                    if user and user.status.value == "active":  # Only active users
                        # Count active leads for this dealer
                        active_leads = await self.lead_repository.count_by_vendedor(
                            vendedor_id=user.id,
                            tenant_id=tenant_id,
                        )

                        candidate = AssignmentCandidate(
                            user_id=user.id,
                            name=user.full_name,
                            active_lead_count=active_leads,
                            location_city=None,  # Could be enhanced with user location
                            location_state=None,
                        )
                        candidates.append(candidate)
                        organization_members.add(user.id)

            if not candidates:
                # No active dealers available
                return None

            # Prepare context for assignment rules
            context: dict[str, object] = {
                "organization_members": organization_members,
            }

            # Fetch product if product_id is provided (for vehicle owner rule)
            if request.product_id and self.product_repository:
                product = await self.product_repository.get_by_id(
                    product_id=request.product_id,
                    tenant_id=tenant_id,
                )
                if product:
                    context["product"] = product

            # Run assignment engine with the configured strategy.
            result = self.assignment_engine.assign_lead(
                lead=Lead(
                    id=uuid4(),  # Ephemeral ID — this lead hasn't been persisted yet
                    tenant_id=tenant_id,
                    buyer_name=request.buyer_name,
                    buyer_email=request.buyer_email,
                    buyer_phone=request.buyer_phone,
                    product_id=request.product_id,
                    vendedor_id=None,
                    message=request.message,
                    source=request.source if request.source else LeadSource.MANUAL,
                ),
                candidates=candidates,
                strategy=self.assignment_strategy,
                **context,
            )

            if result.assigned_to:
                return result.assigned_to.user_id

            return None

        except Exception:
            # Fail gracefully - don't block lead creation if assignment fails
            # TODO: Log this error for monitoring
            return None
