"""
Dealer API Router.

Provides CRUD endpoints for dealer management with admin-only access.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from prosell.application.dto.dealer import CreateDealerRequest, DealerListResponse, DealerResponse
from prosell.application.use_cases.dealer.create_dealer import CreateDealerUseCase
from prosell.application.use_cases.dealer.get_dealer import GetDealerUseCase
from prosell.application.use_cases.dealer.list_dealers import ListDealersUseCase
from prosell.domain.entities.user import User
from prosell.domain.exceptions.dealer_exceptions import DealerNotFoundError, SlugNotUniqueError
from prosell.infrastructure.api.dependencies import get_current_auth_user
from prosell.infrastructure.api.di import (
    get_create_dealer_use_case,
    get_get_dealer_use_case,
    get_list_dealers_use_case,
)

router = APIRouter(tags=["dealers"])


@router.post(
    "",
    response_model=DealerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new dealer",
    description="Creates a new dealer organization. Admin-only access.",
)
async def create_dealer(
    request: CreateDealerRequest,
    current_user: Annotated[User, Depends(get_current_auth_user)],
    use_case: Annotated[CreateDealerUseCase, Depends(get_create_dealer_use_case)],
) -> DealerResponse:
    """
    Create a new dealer.

    Args:
        request: Dealer creation request
        current_user: Authenticated user (must be admin)
        use_case: CreateDealerUseCase instance

    Returns:
        Created dealer data

    Raises:
        HTTPException 403: If user is not admin
        HTTPException 409: If slug already exists
    """
    # Admin-only check
    if not current_user.has_role("admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create dealers",
        )

    try:
        return await use_case.execute(request, current_user.tenant_id)
    except SlugNotUniqueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e


@router.get(
    "/{dealer_id}",
    response_model=DealerResponse,
    summary="Get dealer by ID",
    description="Retrieves a single dealer by ID with tenant isolation.",
)
async def get_dealer(
    dealer_id: str,
    current_user: Annotated[User, Depends(get_current_auth_user)],
    use_case: Annotated[GetDealerUseCase, Depends(get_get_dealer_use_case)],
) -> DealerResponse:
    """
    Get dealer by ID.

    Args:
        dealer_id: Dealer UUID
        current_user: Authenticated user
        use_case: GetDealerUseCase instance

    Returns:
        Dealer data

    Raises:
        HTTPException 404: If dealer not found
    """
    try:
        dealer_uuid = uuid.UUID(dealer_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid dealer ID format",
        ) from e

    try:
        return await use_case.execute(dealer_uuid, current_user.tenant_id)
    except DealerNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e


@router.get(
    "",
    response_model=DealerListResponse,
    summary="List dealers",
    description="Retrieves paginated list of dealers for the current tenant.",
)
async def list_dealers(
    current_user: Annotated[User, Depends(get_current_auth_user)],
    use_case: Annotated[ListDealersUseCase, Depends(get_list_dealers_use_case)],
    limit: int = 50,
    offset: int = 0,
) -> DealerListResponse:
    """
    List dealers with pagination.

    Args:
        current_user: Authenticated user
        use_case: ListDealersUseCase instance
        limit: Maximum results (default 50, max 100)
        offset: Results to skip (default 0)

    Returns:
        Paginated dealer list
    """
    return await use_case.execute(current_user.tenant_id, limit, offset)
