"""Scheduled task to refresh Facebook access tokens.

Runs every 6 hours to refresh tokens expiring within 48 hours.
"""

from prosell.infrastructure.tasks.broker import broker


@broker.task
async def refresh_facebook_tokens_task() -> dict[str, object]:
    """Refresh all Facebook access tokens expiring soon.

    Scheduled to run every 6 hours via cron.
    Finds accounts with tokens expiring within 48 hours and refreshes them.

    Returns:
        Dict with refresh statistics

    Note:
        Full DI wiring will be implemented in Phase 3 (Graph API integration).
    """
    # TODO(phase-3): Wire DI container to instantiate RefreshTokenUseCase
    return {"refreshed": 0, "failed": 0, "status": "pending"}
