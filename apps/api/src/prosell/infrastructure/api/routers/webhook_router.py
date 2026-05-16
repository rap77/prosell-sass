"""Webhook router — Facebook lead webhooks."""

import hashlib
import hmac
import json
import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel

from prosell.application.use_cases.facebook_webhook_use_case import ProcessFacebookWebhookUseCase
from prosell.core.config import settings
from prosell.infrastructure.api.di import get_process_facebook_webhook_use_case

logger = logging.getLogger(__name__)


# =============================================================================
# RESPONSE MODELS
# =============================================================================


class WebhookResponse(BaseModel):
    """Webhook acknowledgment response."""

    status: str

    class Config:
        # Exclude None values from JSON response
        exclude_none = True


# =============================================================================
# ROUTER
# =============================================================================


router = APIRouter()


# =============================================================================
# DEPENDENCIES
# =============================================================================


async def get_facebook_app_secret() -> str:
    """Get Facebook app secret for webhook signature verification."""
    return settings.facebook_app_secret or ""


# =============================================================================
# WEBHOOK ENDPOINTS
# =============================================================================


@router.post(
    "/webhooks/facebook",
    response_model=WebhookResponse,
    status_code=status.HTTP_200_OK,
    summary="Facebook Lead Webhook",
    responses={
        400: {
            "description": "Bad Request - Invalid JSON or missing X-Tenant-ID",
            "content": {"application/json": {"example": {"detail": "Invalid JSON payload"}}},
        },
        403: {
            "description": "Forbidden - Missing or invalid X-Hub-Signature",
            "content": {"application/json": {"example": {"detail": "Missing X-Hub-Signature header"}}},  # noqa: E501
        },
    },
)
async def facebook_lead_webhook(
    request: Request,
    x_hub_signature: str | None = Header(default=None, alias="X-Hub-Signature"),
    facebook_app_secret: Annotated[str, Depends(get_facebook_app_secret)] = "",
    process_webhook_use_case: ProcessFacebookWebhookUseCase = Depends(get_process_facebook_webhook_use_case),  # noqa: E501
) -> WebhookResponse:
    """
    Receive Facebook lead webhook notifications.

    This endpoint:
    - Verifies X-Hub-Signature (SHA256 HMAC) for security
    - Parses Facebook webhook payload (leadgen_id, listing_id, sender_id, message)
    - Returns 200 OK within 1 second (Facebook requirement)
    - Processes lead asynchronously (background task)

    Security:
    - Returns 403 if signature is missing or invalid
    - Uses HMAC SHA256 to verify payload integrity

    Facebook requires:
    - Response within 1 second
    - 200 OK status code
    - Retry on 5xx errors
    """
    # Read raw payload bytes
    payload_bytes = await request.body()

    # Verify X-Hub-Signature
    if x_hub_signature is None:
        logger.warning("Facebook webhook received without X-Hub-Signature header")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing X-Hub-Signature header",
        )

    # Verify signature
    if not _verify_signature(payload_bytes, x_hub_signature, facebook_app_secret):
        logger.warning("Facebook webhook signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid signature",
        )

    # Parse payload
    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
        logger.info(f"Facebook webhook payload received: {payload.get('leadgen_id')}")
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Facebook webhook payload: {e}")
        # Return 400 for invalid JSON (security consideration)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        ) from None
    except Exception as e:
        logger.error(f"Unexpected error parsing Facebook webhook payload: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to parse payload",
        ) from None

    # Extract tenant_id from JWT (via X-Tenant-ID header for webhooks)
    # Webhooks don't have JWT auth, so we use a header-based approach
    tenant_id_header = request.headers.get("X-Tenant-ID")
    if not tenant_id_header:
        logger.warning("Facebook webhook missing X-Tenant-ID header")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Tenant-ID header",
        )

    try:
        tenant_id = UUID(tenant_id_header)
    except ValueError:
        logger.warning(f"Invalid X-Tenant-ID header: {tenant_id_header}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Tenant-ID header",
        ) from None

    # Process webhook (synchronously for now, within 1-second window)
    # In production, this should be a background task (Taskiq, Celery, etc.)
    # TODO: Implement Taskiq background task (subtask A2.14)
    try:
        # Process the webhook payload
        await process_webhook_use_case.execute(payload=payload, tenant_id=tenant_id)

        logger.info(f"Facebook webhook processed successfully: leadgen_id={payload.get('leadgen_id')}")  # noqa: E501
    except Exception as e:
        # Log error but still return 200 (Facebook retry logic)
        # The lead processing can be retried via polling task
        logger.error(f"Failed to process Facebook webhook: {e}", exc_info=True)

    # Quick response (within 1 second)
    logger.info("Facebook webhook acknowledged")
    return WebhookResponse(status="received")


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def _verify_signature(payload: bytes, received_signature: str, app_secret: str) -> bool:
    """
    Verify X-Hub-Signature using HMAC SHA256.

    Args:
        payload: Raw request payload bytes
        received_signature: X-Hub-Signature header value (format: "sha256=...")
        app_secret: Facebook app secret

    Returns:
        True if signature is valid, False otherwise
    """
    if not app_secret:
        # Log error: app secret not configured
        return False

    # Compute expected signature
    expected_signature = hmac.new(
        app_secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).digest()
    expected_signature_str = f"sha256={expected_signature.hex()}"

    # Constant-time comparison to prevent timing attacks
    return hmac.compare_digest(expected_signature_str, received_signature)
