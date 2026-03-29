"""User-Dealer assignment router."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from prosell.application.dto.user_dealer import (
    AssignDealerRequest,
    BulkAssignRequest,
    UserDealerListResponse,
    UserDealerResponse,
)
from prosell.application.use_cases.user_dealer.assign_user_dealer import (
    AssignUserDealerUseCase,
)
from prosell.application.use_cases.user_dealer.bulk_assign import BulkAssignUseCase
from prosell.application.use_cases.user_dealer.remove_user_dealer import (
    RemoveUserDealerUseCase,
)
from prosell.domain.entities.user import User
from prosell.domain.repositories.user_dealer_repository import (
    AbstractUserDealerRepository,
)
from prosell.infrastructure.api.dependencies import (
    get_assign_user_dealer_use_case,
    get_bulk_assign_use_case,
    get_current_auth_user_from_cookie,
    get_remove_user_dealer_use_case,
    get_user_dealer_repository,
)

router = APIRouter(prefix="/api/users", tags=["user-dealers"])


@router.post(
    "/{id}/dealers", response_model=UserDealerResponse, status_code=status.HTTP_201_CREATED
)
async def assign_dealer(
    id: UUID,
    request: AssignDealerRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[AssignUserDealerUseCase, Depends(get_assign_user_dealer_use_case)],
) -> UserDealerResponse:
    """
    Assign a dealer to a user.

    Args:
        id: User UUID to assign dealer to
        request: AssignDealerRequest with dealer_id
        current_user: Authenticated user (from JWT)
        use_case: AssignUserDealerUseCase

    Returns:
        UserDealerResponse

    Raises:
        HTTPException 403: If user is not admin/manager
        HTTPException 404: If dealer not found
    """
    # Role check: admin or manager only
    if not current_user.has_role(["admin", "manager"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager role required",
        )

    return await use_case.execute(
        user_id=id,
        request=request,
        tenant_id=current_user.tenant_id,
        assigned_by=current_user.id,
    )


@router.post("/bulk-assign", response_model=dict[str, int])
async def bulk_assign_dealers(
    request: BulkAssignRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[BulkAssignUseCase, Depends(get_bulk_assign_use_case)],
) -> dict[str, int]:
    """
    Bulk assign users to dealers (Cartesian product).

    Args:
        request: BulkAssignRequest with user_ids and dealer_ids lists
        current_user: Authenticated user (from JWT)
        use_case: BulkAssignUseCase

    Returns:
        Dict with "assigned_count" key

    Raises:
        HTTPException 403: If user is not admin/manager
    """
    # Role check: admin or manager only
    if not current_user.has_role(["admin", "manager"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager role required",
        )

    return await use_case.execute(
        request=request,
        tenant_id=current_user.tenant_id,
        assigned_by=current_user.id,
    )


@router.delete("/{id}/dealers/{dealer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_dealer_assignment(
    id: UUID,
    dealer_id: UUID,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[RemoveUserDealerUseCase, Depends(get_remove_user_dealer_use_case)],
) -> None:
    """
    Remove a user-dealer assignment.

    Args:
        id: User UUID
        dealer_id: Dealer UUID
        current_user: Authenticated user (from JWT)
        use_case: RemoveUserDealerUseCase

    Returns:
        None (204 No Content)

    Raises:
        HTTPException 403: If user is not admin/manager
    """
    # Role check: admin or manager only
    if not current_user.has_role(["admin", "manager"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager role required",
        )

    await use_case.execute(
        user_id=id,
        dealer_id=dealer_id,
        tenant_id=current_user.tenant_id,
    )


@router.get("/{id}/dealers", response_model=UserDealerListResponse)
async def list_user_dealers(
    id: UUID,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    user_dealer_repository: Annotated[
        AbstractUserDealerRepository, Depends(get_user_dealer_repository)
    ],
) -> UserDealerListResponse:
    """
    List user's assigned dealers.

    Args:
        id: User UUID to list dealers for
        current_user: Authenticated user (from JWT)
        user_dealer_repository: UserDealerRepository

    Returns:
        UserDealerListResponse with items and total count

    Note:
        No role check - users can see their own assignments
    """
    # Get dealer IDs for user
    dealer_ids = await user_dealer_repository.get_user_dealer_ids(
        user_id=id,
        tenant_id=current_user.tenant_id,
    )

    # Get full assignment records
    items = []
    for dealer_id in dealer_ids:
        assignment = await user_dealer_repository.get_assignment(
            user_id=id,
            dealer_id=dealer_id,
            tenant_id=current_user.tenant_id,
        )
        if assignment:
            items.append(
                UserDealerResponse(
                    id=assignment.id,
                    user_id=assignment.user_id,
                    dealer_id=assignment.dealer_id,
                    tenant_id=assignment.tenant_id,
                    assigned_at=assignment.assigned_at,
                    assigned_by=assignment.assigned_by,
                )
            )

    return UserDealerListResponse(items=items, total=len(items))
