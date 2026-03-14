"""Facebook Marketplace OAuth router.

API endpoints for Facebook account connection and management
for Marketplace publishing.
"""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from prosell.application.dto.facebook import (
    AuthorizeFacebookAccountRequest,
    AuthorizeFacebookAccountResponse,
    DisconnectFacebookAccountRequest,
    DisconnectFacebookAccountResponse,
    FacebookOAuthCallbackRequest,
    ListFacebookAccountsResponse,
    ListFacebookPagesResponse,
    RefreshTokenResponse,
)
from prosell.application.use_cases.facebook.authorize_account import (
    AuthorizeFacebookAccountUseCase,
)
from prosell.application.use_cases.facebook.disconnect_account import (
    DisconnectFacebookAccountUseCase,
)
from prosell.application.use_cases.facebook.fetch_pages import FetchPagesUseCase
from prosell.application.use_cases.facebook.list_accounts import ListAccountsUseCase
from prosell.application.use_cases.facebook.oauth_callback import OAuthCallbackUseCase
from prosell.application.use_cases.facebook.refresh_token import RefreshTokenUseCase
from prosell.application.use_cases.facebook.set_default_page import SetDefaultPageUseCase
from prosell.core.config import settings
from prosell.domain.entities.role import RoleType
from prosell.domain.entities.user import User
from prosell.domain.exceptions.facebook_exceptions import (
    FacebookNotConfiguredException,
    FacebookStateException,
)
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user,
    get_facebook_authorize_use_case,
    get_facebook_callback_use_case,
    get_facebook_disconnect_use_case,
    get_facebook_fetch_pages_use_case,
    get_facebook_list_accounts_use_case,
    get_facebook_refresh_use_case,
    get_facebook_set_default_use_case,
    require_role,
)

router = APIRouter(prefix="/facebook", tags=["facebook-marketplace"])
logger = logging.getLogger(__name__)


# ==============================================================================
# DEPENDENCIES
# =============================================================================

# All Facebook use case dependencies are provided by
# prosell.infrastructure.api.dependencies module functions


# =============================================================================
# ENDPOINTS
# =============================================================================


@router.post(
    "/authorize",
    status_code=status.HTTP_200_OK,
    response_model=AuthorizeFacebookAccountResponse,
)
async def authorize_facebook(
    request: AuthorizeFacebookAccountRequest,
    use_case: Annotated[AuthorizeFacebookAccountUseCase, Depends(get_facebook_authorize_use_case)],
    current_user: Annotated[User, Depends(get_current_auth_user)],
) -> AuthorizeFacebookAccountResponse:
    """
    Start Facebook OAuth flow for Marketplace publishing.

    Initiates OAuth 2.0 authorization code flow to connect a Facebook account
    for publishing to Facebook Marketplace.

    **Flow:**
    1. Generate state token (CSRF protection)
    2. Generate authorization URL
    3. Frontend redirects user to Facebook
    4. User authorizes the app
    5. Facebook redirects to /api/facebook/callback

    **Required Scopes:**
    - pages_manage_posts: Create and manage posts
    - pages_read_engagement: Read engagement data
    - pages_manage_metadata: Manage page metadata
    - pages_read_user_content: Read user content
    - pages_manage_engagement: Manage engagement

    Returns:
        Authorization URL to redirect user to
    """
    # Verify seller_user_id matches current user
    if request.seller_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="seller_user_id must match current user",
        )

    try:
        result = await use_case.execute(request)
        return result
    except FacebookNotConfiguredException as e:
        logger.error(f"Facebook OAuth not configured: {e.details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Facebook OAuth is not configured. Please contact support.",
        ) from e
    except Exception as e:
        logger.exception(f"Unexpected error in Facebook authorize: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate Facebook OAuth",
        ) from e


@router.get("/callback", response_class=RedirectResponse, response_model=None)
async def facebook_callback(
    use_case: Annotated[OAuthCallbackUseCase, Depends(get_facebook_callback_use_case)],
    code: str = Query(..., description="Authorization code from Facebook"),
    state: str = Query(..., description="OAuth state token"),
    error: str | None = Query(None, description="Error from Facebook (if denied)"),
    error_description: str | None = Query(None, description="Error description"),
) -> RedirectResponse:
    """
    Handle Facebook OAuth callback.

    Called by Facebook after user authorization.
    Processes the authorization code, creates/updates the Facebook account,
    and fetches the user's pages.

    **Query Parameters:**
        code: Authorization code (if successful)
        state: State token for CSRF validation
        error: Error code (if user denied access)

    **Returns:**
        Redirect to frontend dashboard with success or error message
    """
    # Handle OAuth error (user denied access)
    if error:
        logger.warning(f"Facebook OAuth error: {error} - {error_description}")
        return RedirectResponse(
            url=f"{settings.oauth_frontend_failure_url}{error}",
            status_code=302,
        )

    try:
        request = FacebookOAuthCallbackRequest(code=code, state=state)
        result = await use_case.execute(request)

        # Redirect to frontend with success
        success_url = f"{settings.oauth_frontend_success_url}?account_id={result.account_id}"
        return RedirectResponse(url=success_url, status_code=302)

    except FacebookStateException as e:
        logger.error(f"Invalid Facebook OAuth state: {e.message}")
        return RedirectResponse(
            url=f"{settings.oauth_frontend_failure_url}invalid_state",
            status_code=302,
        )
    except Exception as e:
        logger.exception(f"Unexpected error in Facebook callback: {e}")
        return RedirectResponse(
            url=f"{settings.oauth_frontend_failure_url}callback_error",
            status_code=302,
        )


@router.get("/accounts", response_model=ListFacebookAccountsResponse)
async def list_facebook_accounts(
    current_user: Annotated[User, Depends(get_current_auth_user)],
    use_case: Annotated[ListAccountsUseCase, Depends(get_facebook_list_accounts_use_case)],
) -> ListFacebookAccountsResponse:
    """
    List user's connected Facebook accounts.

    Returns all Facebook accounts connected to the current vendedor
    for Marketplace publishing.
    """
    accounts = await use_case.execute(current_user.id)
    return ListFacebookAccountsResponse(accounts=accounts)


@router.get("/accounts/{account_id}/pages", response_model=ListFacebookPagesResponse)
async def list_facebook_pages(
    account_id: UUID,
    _current_user: Annotated[User, Depends(get_current_auth_user)],
    use_case: Annotated[FetchPagesUseCase, Depends(get_facebook_fetch_pages_use_case)],
) -> ListFacebookPagesResponse:
    """
    List Facebook pages for an account.

    Returns all Facebook pages discovered for the specified account.
    """
    pages = await use_case.execute(account_id)
    return ListFacebookPagesResponse(pages=pages)


@router.delete(
    "/accounts/{account_id}",
    status_code=status.HTTP_200_OK,
    response_model=DisconnectFacebookAccountResponse,
)
async def disconnect_facebook_account(
    account_id: UUID,
    current_user: Annotated[User, Depends(get_current_auth_user)],
    use_case: Annotated[
        DisconnectFacebookAccountUseCase, Depends(get_facebook_disconnect_use_case)
    ],
) -> DisconnectFacebookAccountResponse:
    """
    Disconnect a Facebook account.

    Deletes the Facebook account and all associated pages.
    The vendedor will need to re-authorize to publish again.
    """
    request = DisconnectFacebookAccountRequest(
        account_id=account_id,
        seller_user_id=current_user.id,
    )

    return await use_case.execute(request)


@router.post(
    "/accounts/{account_id}/pages/{page_id}/set-default",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def set_default_facebook_page(
    account_id: UUID,
    page_id: UUID,
    current_user: Annotated[User, Depends(get_current_auth_user)],
    use_case: Annotated[SetDefaultPageUseCase, Depends(get_facebook_set_default_use_case)],
) -> None:
    """
    Set default Facebook page for publishing.

    Marks the specified page as the default for Marketplace publishing.
    Unsets the default flag on all other pages for this account.
    """
    await use_case.execute(
        account_id=account_id,
        page_id=page_id,
        seller_user_id=current_user.id,
    )


@router.post(
    "/admin/refresh-tokens",
    status_code=status.HTTP_200_OK,
    response_model=RefreshTokenResponse,
)
async def refresh_facebook_tokens(
    _admin: Annotated[User, Depends(require_role(RoleType.SUPER_ADMIN))],
    use_case: Annotated[RefreshTokenUseCase, Depends(get_facebook_refresh_use_case)],
    hours_before: int = Query(48, ge=1, le=168, description="Hours before expiry to refresh"),
) -> RefreshTokenResponse:
    """
    Refresh Facebook access tokens (ADMIN endpoint).

    Scheduled task endpoint to refresh all access tokens expiring soon.
    Should be called by cron/job scheduler every 6 hours.

    **Query Parameters:**
        hours_before: How many hours before expiry to refresh (default: 48, max: 168)

    **Returns:**
        Refresh results with counts and details
    """
    result = await use_case.execute(hours_before=hours_before)
    return RefreshTokenResponse(
        total=result["total"],
        refreshed=result["refreshed"],
        failed=result["failed"],
        results=result["results"],
    )
