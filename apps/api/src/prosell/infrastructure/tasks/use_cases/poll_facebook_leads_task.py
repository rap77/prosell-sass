"""Scheduled task to poll Facebook Graph API for missed leads.

Runs every 10 minutes as a fallback to webhooks.
Fetches leads from all active Facebook pages and creates them in the system.

Schedule:
    Cron: */10 * * * * (every 10 minutes)
    Deployment: Configure via systemd timer, Kubernetes CronJob, or external cron

    Example cron entry:
    */10 * * * * cd /app && uv run python -m prosell.infrastructure.tasks.worker poll_facebook_leads_task.kiq()
"""

import logging

from prosell.infrastructure.tasks.broker import broker

logger = logging.getLogger(__name__)


@broker.task
async def poll_facebook_leads_task() -> dict[str, object]:
    """Poll Facebook Graph API for missed leads.

    This task runs every 10 minutes as a fallback mechanism to catch
    any leads that were missed by webhooks (e.g., webhook delivery failures).

    PHASE 3 IMPLEMENTATION NEEDED:
    ===============================
    This task is currently a stub that returns pending status.
    Full implementation requires:
    1. DI container wiring (IFacebookPageRepository, IFacebookAccountRepository)
    2. FacebookGraphApiClient.get_leads() implementation
    3. Lead duplicate detection via facebook_sender_id field
    4. Error handling and retry logic

    Workflow (Phase 3):
    1. Query all active Facebook pages from database
    2. For each page, query Facebook Graph API Leadgen API for leads
    3. For each lead, check if it already exists in our system
    4. Create new leads that don't exist yet using CreateLeadUseCase
    5. Return statistics about the polling run

    Returns:
        Dict with polling statistics:
        - status: "pending" | "success" | "partial_failure" | "failure"
        - pages_polled: number of pages queried
        - leads_found: total leads found from Graph API
        - leads_created: number of new leads created
        - errors: number of errors encountered
        - details: list of error messages (if any)

    Current Status:
        Returns pending status with zero counts until Phase 3 implementation.
    """
    # TODO(phase-3): Wire DI container to instantiate:
    #   - IFacebookPageRepository (to query active pages)
    #   - IFacebookAccountRepository (to get page access tokens)
    #   - FacebookGraphApiClient (to fetch leads from Graph API)
    #   - ILeadRepository (for duplicate detection)
    #   - CreateLeadUseCase (to create new leads)
    # TODO(phase-3): Implement actual Facebook Graph API Leadgen API calls
    # TODO(phase-3): Add proper error handling and retry logic
    # TODO(phase-3): Add metrics tracking (prometheus/statsd)

    logger.info("poll_facebook_leads_task: Starting poll")

    # =============================================================================
    # PHASE 3 IMPLEMENTATION NEEDED
    # =============================================================================
    # This task is a stub pending Phase 3 implementation.
    # See docstring above for required Phase 3 work.

    # TODO(phase-3): Wire DI container to instantiate:
    #   - IFacebookPageRepository (to query active pages)
    #   - IFacebookAccountRepository (to get page access tokens)
    #   - FacebookGraphApiClient (to fetch leads from Graph API)
    #   - ILeadRepository (for duplicate detection)
    #   - CreateLeadUseCase (to create new leads)
    # TODO(phase-3): Implement actual Facebook Graph API Leadgen API calls
    # TODO(phase-3): Add proper error handling and retry logic
    # TODO(phase-3): Add metrics tracking (prometheus/statsd)

    try:
        # Phase 3: Implementation structure (commented out)
        # pages_polled = 0
        # leads_found = 0
        # leads_created = 0
        # errors = 0
        # details = []

        # 1. Query all active Facebook pages
        # active_pages = await facebook_page_repository.get_all_active()
        # pages_polled = len(active_pages)

        # 2. For each page, fetch leads from Graph API
        # for page in active_pages:
        #     try:
        #         # Decrypt page access token
        #         page_access_token = decrypt_token(page.page_access_token_encrypted)
        #
        #         # Fetch leads from Graph API Leadgen endpoint
        #         # GET /{page_id}/leadgen_forms
        #         leads = await facebook_client.get_leads(
        #             page_id=page.page_id,
        #             access_token=page_access_token
        #         )
        #         leads_found += len(leads)
        #
        #         # 3. Check for duplicates and create new leads
        #         for lead_data in leads:
        #             existing_lead = await lead_repository.get_by_facebook_leadgen_id(
        #                 leadgen_id=lead_data['id'],
        #                 tenant_id=page.tenant_id
        #             )
        #
        #             if not existing_lead:
        #                 # Create lead from Facebook data
        #                 create_request = CreateLeadRequest(
        #                     buyer_name=lead_data.get('field_data', {}).get('name'),
        #                     buyer_email=lead_data.get('field_data', {}).get('email'),
        #                     buyer_phone=lead_data.get('field_data', {}).get('phone'),
        #                     product_id=lead_data.get('product_id'),  # From listing_id
        #                     vendedor_id=page.seller_user_id,
        #                     message=lead_data.get('field_data', {}).get('message'),
        #                     source="facebook_polling"
        #                 )
        #                 await create_lead_use_case.execute(
        #                     request=create_request,
        #                     tenant_id=page.tenant_id
        #                 )
        #                 leads_created += 1
        #
        #     except Exception as e:
        #         logger.error(f"Error polling page {page.page_id}: {e}")
        #         errors += 1
        #         details.append(f"Page {page.page_id}: {str(e)}")

        # Determine status
        # if errors == 0:
        #     status = "success"
        # elif leads_created > 0:
        #     status = "partial_failure"
        # else:
        #     status = "failure"

        logger.info("poll_facebook_leads_task: Poll complete (pending Phase 3 implementation)")

        return {
            "status": "pending",
            "pages_polled": 0,
            "leads_found": 0,
            "leads_created": 0,
            "errors": 0,
            "details": [],
        }

    except Exception as e:
        logger.error(f"poll_facebook_leads_task: Unexpected error: {e}", exc_info=True)
        return {
            "status": "failure",
            "pages_polled": 0,
            "leads_found": 0,
            "leads_created": 0,
            "errors": 1,
            "details": [f"Unexpected error: {e!s}"],
        }
