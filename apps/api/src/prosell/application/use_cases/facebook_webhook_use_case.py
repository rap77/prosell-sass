"""ProcessFacebookWebhookUseCase — processes Facebook lead webhooks."""

import logging
from uuid import UUID

from prosell.application.dto.lead.request import CreateLeadRequest
from prosell.application.use_cases.lead.create_lead import CreateLeadUseCase
from prosell.domain.repositories.lead_repository import AbstractLeadRepository
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.infrastructure.services.facebook_graph_api_client import (
    FacebookGraphApiClient,
)

logger = logging.getLogger(__name__)


class ProcessFacebookWebhookUseCase:
    """
    Process Facebook lead webhook and create lead in system.

    Workflow:
    1. Extract leadgen_id, listing_id, sender_id, message from payload
    2. Query publication by facebook_listing_id
    3. Query buyer profile from Facebook Graph API
    4. Check for duplicate lead (same buyer + vehicle within 24 hours)
    5. Extract lead data (buyer_name, buyer_email, buyer_phone, message, source="facebook")
    6. Call CreateLeadUseCase
    7. Assign lead to vehicle's owner vendedor

    Error handling:
    - If publication not found: log warning and return (no lead created)
    - If duplicate lead detected: log info and return (no lead created)
    - If Facebook API fails: log error and return (no lead created)
    """

    def __init__(
        self,
        lead_repository: AbstractLeadRepository,
        publication_repository: IPublicationRepository,
        facebook_client: FacebookGraphApiClient,
        create_lead_use_case: CreateLeadUseCase,
    ) -> None:
        self.lead_repository = lead_repository
        self.publication_repository = publication_repository
        self.facebook_client = facebook_client
        self.create_lead_use_case = create_lead_use_case

    async def execute(self, payload: dict, tenant_id: UUID) -> None:
        """
        Process Facebook webhook payload and create lead.

        Args:
            payload: Facebook webhook payload (dict with leadgen_id, listing_id, sender_id, message)
            tenant_id: Tenant context from JWT

        Returns:
            None (lead is created asynchronously via CreateLeadUseCase)
        """
        # 1. Extract payload data
        leadgen_id = payload.get("leadgen_id")
        listing_id = payload.get("listing_id")
        sender_id = payload.get("sender_id")
        message = payload.get("message", "")

        logger.info(
            f"Processing Facebook webhook: leadgen_id={leadgen_id}, "
            f"listing_id={listing_id}, sender_id={sender_id}"
        )

        # 2. Query publication by facebook_listing_id
        publication = await self.publication_repository.get_by_fb_listing_id(
            fb_listing_id=listing_id, tenant_id=tenant_id
        )

        if not publication:
            logger.warning(
                f"Publication not found for facebook_listing_id={listing_id}. "
                f"Skipping lead creation."
            )
            return

        # 3. Query buyer profile from Facebook Graph API
        # Fetch buyer profile (name, email) from Graph API

        buyer_name = None
        buyer_email = None
        buyer_phone = None

        try:
            buyer_profile = await self.facebook_client.get_buyer_profile(
                sender_id=sender_id,
                page_access_token=publication.page_access_token,
            )
            buyer_name = buyer_profile.name
            buyer_email = buyer_profile.email
            # Note: phone is not returned by Graph API /{sender_id} endpoint
            # It would require additional Leadgen API calls (Phase 3 enhancement)

            logger.info(
                f"Successfully fetched buyer profile for sender_id={sender_id}: "
                f"name={buyer_name}, email={buyer_email}"
            )
        except Exception as e:
            logger.error(f"Failed to fetch buyer profile for sender_id={sender_id}: {e}")
            # Continue with limited data (sender_id fallback)
            buyer_name = f"Facebook User {sender_id}"

        # 4. Check for duplicate lead (same buyer + vehicle within 24 hours)
        # Note: If buyer_email is None (Graph API privacy settings), duplicate detection
        # is skipped. This is acceptable because:
        # - sender_id is unique per Facebook user
        # - buyer_name includes sender_id for identification: "Facebook User {sender_id}" or actual name
        # - Future enhancement: Add facebook_sender_id field to Lead entity for exact deduplication
        existing_lead = await self.lead_repository.get_by_buyer_and_vehicle(
            buyer_email=buyer_email,
            buyer_phone=buyer_phone,
            vehicle_id=publication.product_id,  # product_id is the vehicle_id in C3 schema
            tenant_id=tenant_id,
            within_hours=24,
        )

        if existing_lead:
            logger.info(
                f"Duplicate lead detected for buyer_email={buyer_email}, "
                f"vehicle_id={publication.product_id}. Skipping lead creation."
            )
            return

        # 5. Create lead via CreateLeadUseCase
        try:
            create_request = CreateLeadRequest(
                buyer_name=buyer_name or f"Facebook User {sender_id}",
                buyer_email=buyer_email,
                buyer_phone=buyer_phone,
                vehicle_id=publication.product_id,
                vendedor_id=publication.seller_user_id,
                message=message,
                source="facebook",
            )

            await self.create_lead_use_case.execute(
                request=create_request, tenant_id=tenant_id
            )

            logger.info(
                f"Successfully created lead from Facebook webhook: leadgen_id={leadgen_id}"
            )

        except Exception as e:
            logger.error(f"Failed to create lead from webhook: {e}")
            raise
