"""Webhook router — Facebook lead webhooks."""

import hmac
import hashlib
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel

from prosell.core.config import settings


# =============================================================================
# RESPONSE MODELS
# =============================================================================


class WebhookResponse(BaseModel):
    """Webhook acknowledgment response."""

    status: str


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
)
async def facebook_lead_webhook(
    request: Request,
    x_hub_signature: str | None = Header(default=None, alias="X-Hub-Signature"),
    facebook_app_secret: Annotated[str, Depends(get_facebook_app_secret)] = "",
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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing X-Hub-Signature header",
        )

    # Verify signature
    if not _verify_signature(payload_bytes, x_hub_signature, facebook_app_secret):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid signature",
        )

    # Parse payload
    try:
        import json
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        # Invalid JSON, but still return 200 to avoid Facebook retries
        # Log error for monitoring
        return WebhookResponse(status="received")

    # TODO: Process webhook asynchronously (subtask A2.4-A2.13)
    # - Extract leadgen_id, listing_id, sender_id
    # - Query buyer profile from Facebook Graph API
    # - Query vehicle by listing_id
    # - Check for duplicate lead
    # - Call CreateLeadUseCase

    # Quick response (within 1 second)
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
