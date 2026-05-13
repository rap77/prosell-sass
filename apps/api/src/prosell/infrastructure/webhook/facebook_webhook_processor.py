"""FacebookWebhookProcessor — async background processor for Facebook webhooks."""

import logging
from uuid import UUID

from prosell.application.use_cases.facebook_webhook_use_case import ProcessFacebookWebhookUseCase

logger = logging.getLogger(__name__)


class FacebookWebhookProcessor:
    """
    Async background processor for Facebook lead webhooks.

    This processor runs asynchronously to avoid blocking the webhook response.
    Facebook requires a 200 OK response within 1 second, so we offload
    the actual lead processing to this background processor.

    Error handling:
    - All errors are logged (no exceptions propagate)
    - Failed webhooks are tracked for monitoring
    """

    def __init__(self, process_webhook_use_case: ProcessFacebookWebhookUseCase) -> None:
        self.process_webhook_use_case = process_webhook_use_case

    async def process(self, payload: dict[str, object], tenant_id: UUID) -> None:
        """
        Process Facebook webhook payload asynchronously.

        Args:
            payload: Facebook webhook payload
            tenant_id: Tenant context from JWT

        Returns:
            None (errors are logged, not raised)
        """
        try:
            logger.info("FacebookWebhookProcessor: Processing webhook payload")
            await self.process_webhook_use_case.execute(payload, tenant_id)
            logger.info("FacebookWebhookProcessor: Webhook processed successfully")

        except Exception as e:
            logger.error(f"FacebookWebhookProcessor: Failed to process webhook: {e}", exc_info=True)
            # Note: We don't raise here to avoid webhook retries for permanent failures
            # Facebook will retry on 5xx errors, but not on 200 OK
