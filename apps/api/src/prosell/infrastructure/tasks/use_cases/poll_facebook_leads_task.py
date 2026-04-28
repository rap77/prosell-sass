"""Scheduled task to poll Facebook Graph API for missed leads.

Runs every 10 minutes as a fallback to webhooks.
Fetches leads from all active Facebook pages and creates them in the system.
"""

import logging

from prosell.infrastructure.tasks.broker import broker

logger = logging.getLogger(__name__)


@broker.task
async def poll_facebook_leads_task() -> dict[str, object]:
    """Poll Facebook Graph API for missed leads.

    This task runs every 10 minutes as a fallback mechanism to catch
    any leads that were missed by webhooks (e.g., webhook delivery failures).

    Workflow:
    1. Query all active Facebook pages from database
    2. For each page, query Facebook Graph API for leads
    3. Check if each lead already exists in our system
    4. Create new leads that don't exist yet

    Returns:
        Dict with polling statistics:
        - status: "pending" | "success" | "partial_failure" | "failure"
        - pages_polled: number of pages queried
        - leads_found: total leads found from Graph API
        - leads_created: number of new leads created
        - errors: number of errors encountered

    Note:
        Full DI wiring will be implemented in Phase 3 (Graph API integration).
        Currently returns pending status.
    """
    # TODO(phase-3): Wire DI container to instantiate repositories and use cases
    # TODO(phase-3): Implement actual Facebook Graph API lead fetching
    # TODO(phase-3): Implement duplicate detection and lead creation

    logger.info("poll_facebook_leads_task: Starting poll (pending implementation)")

    return {
        "status": "pending",
        "pages_polled": 0,
        "leads_found": 0,
        "leads_created": 0,
        "errors": 0,
    }
