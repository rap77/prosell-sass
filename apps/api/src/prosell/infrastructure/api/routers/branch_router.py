"""
Branch API Router.

Provides CRUD endpoints for branch management with admin-only access.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from prosell.application.dto.branch import CreateBranchRequest, BranchListResponse, BranchResponse
from prosell.application.use_cases.branch.create_branch import CreateBranchUseCase
from prosell.application.use_cases.branch.get_branch import GetBranchUseCase
from prosell.application.use_cases.branch.list_branches import ListBranchesUseCase
from prosell.domain.entities.user import User
from prosell.domain.exceptions.branch_exceptions import BranchNotFoundError, SlugNotUniqueError
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.di import (
    get_create_branch_use_case,
    get_get_branch_use_case,
    get_list_branches_use_case,
)

router = APIRouter(tags=["branches"])


@router.post(
    "",
    response_model=BranchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new branch",
    description="Creates a new branch organization. Admin-only access.",
)
async def create_branch(
    request: CreateBranchRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[CreateBranchUseCase, Depends(get_create_branch_use_case)],
) -> BranchResponse:
    """
    Create a new branch.

    Args:
        request: Branch creation request
        current_user: Authenticated user (must be admin)
        use_case: CreateBranchUseCase instance

    Returns:
        Created branch data

    Raises:
        HTTPException 403: If user is not admin
        HTTPException 409: If slug already exists
    """
    # Admin-only check
    if not current_user.has_role("admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create branches",
        )

    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    try:
        return await use_case.execute(request, current_user.tenant_id)
    except SlugNotUniqueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e


@router.get(
    "/{branch_id}",
    response_model=BranchResponse,
    summary="Get branch by ID",
    description="Retrieves a single branch by ID with tenant isolation.",
)
async def get_branch(
    branch_id: str,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[GetBranchUseCase, Depends(get_get_branch_use_case)],
) -> BranchResponse:
    """
    Get branch by ID.

    Args:
        branch_id: Branch UUID
        current_user: Authenticated user
        use_case: GetBranchUseCase instance

    Returns:
        Branch data

    Raises:
        HTTPException 404: If branch not found
    """
    try:
        branch_uuid = uuid.UUID(branch_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid branch ID format",
        ) from e

    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    try:
        return await use_case.execute(branch_uuid, current_user.tenant_id)
    except BranchNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e


@router.get(
    "",
    response_model=BranchListResponse,
    summary="List branches",
    description="Retrieves paginated list of branches for the current tenant.",
)
async def list_branches(
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[ListBranchesUseCase, Depends(get_list_branches_use_case)],
    limit: int = 50,
    offset: int = 0,
) -> BranchListResponse:
    """
    List branches with pagination.

    Args:
        current_user: Authenticated user
        use_case: ListBranchesUseCase instance
        limit: Maximum results (default 50, max 100)
        offset: Results to skip (default 0)

    Returns:
        Paginated branch list
    """
    if current_user.tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User has no tenant")
    return await use_case.execute(current_user.tenant_id, limit, offset)
