"""User-Branch assignment router."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from prosell.application.dto.user_branch import (
    AssignBranchRequest,
    BulkAssignRequest,
    UserBranchListResponse,
    UserBranchResponse,
)
from prosell.application.use_cases.user_branch.assign_user_branch import (
    AssignUserBranchUseCase,
)
from prosell.application.use_cases.user_branch.bulk_assign import BulkAssignUseCase
from prosell.application.use_cases.user_branch.remove_user_branch import (
    RemoveUserBranchUseCase,
)
from prosell.domain.entities.user import User
from prosell.domain.repositories.user_branch_repository import (
    AbstractUserBranchRepository,
)
from prosell.infrastructure.api.dependencies import (
    get_assign_user_branch_use_case,
    get_bulk_assign_use_case,
    get_current_auth_user_from_cookie,
    get_remove_user_branch_use_case,
    get_user_branch_repository,
)

router = APIRouter(prefix="/api/users", tags=["user-branches"])


@router.post(
    "/{id}/branches", response_model=UserBranchResponse, status_code=status.HTTP_201_CREATED
)
async def assign_branch(
    id: UUID,
    request: AssignBranchRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[AssignUserBranchUseCase, Depends(get_assign_user_branch_use_case)],
) -> UserBranchResponse:
    """
    Assign a branch to a user.

    Args:
        id: User UUID to assign branch to
        request: AssignBranchRequest with branch_id
        current_user: Authenticated user (from JWT)
        use_case: AssignUserBranchUseCase

    Returns:
        UserBranchResponse

    Raises:
        HTTPException 403: If user is not admin/manager
        HTTPException 404: If branch not found
    """
    # Role check: admin or manager only
    if not current_user.has_role(["admin", "manager"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager role required",
        )

    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User must belong to a tenant",
        )

    return await use_case.execute(
        user_id=id,
        request=request,
        tenant_id=current_user.tenant_id,
        assigned_by=current_user.id,
    )


@router.post("/bulk-assign", response_model=dict[str, int])
async def bulk_assign_branches(
    request: BulkAssignRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[BulkAssignUseCase, Depends(get_bulk_assign_use_case)],
) -> dict[str, int]:
    """
    Bulk assign users to branches (Cartesian product).

    Args:
        request: BulkAssignRequest with user_ids and branch_ids lists
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

    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User must belong to a tenant",
        )

    return await use_case.execute(
        request=request,
        tenant_id=current_user.tenant_id,
        assigned_by=current_user.id,
    )


@router.delete("/{id}/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_branch_assignment(
    id: UUID,
    branch_id: UUID,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[RemoveUserBranchUseCase, Depends(get_remove_user_branch_use_case)],
) -> None:
    """
    Remove a user-branch assignment.

    Args:
        id: User UUID
        branch_id: Branch UUID
        current_user: Authenticated user (from JWT)
        use_case: RemoveUserBranchUseCase

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
        branch_id=branch_id,
        tenant_id=current_user.tenant_id,
    )


@router.get("/{id}/branches", response_model=UserBranchListResponse)
async def list_user_branches(
    id: UUID,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    user_branch_repository: Annotated[
        AbstractUserBranchRepository, Depends(get_user_branch_repository)
    ],
) -> UserBranchListResponse:
    """
    List user's assigned branches.

    Args:
        id: User UUID to list branches for
        current_user: Authenticated user (from JWT)
        user_branch_repository: UserBranchRepository

    Returns:
        UserBranchListResponse with items and total count

    Note:
        No role check - users can see their own assignments
    """
    # Get branch IDs for user
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User must belong to a tenant",
        )
    branch_ids = await user_branch_repository.get_user_branch_ids(
        user_id=id,
        tenant_id=current_user.tenant_id,
    )

    # Get full assignment records
    items = []
    for branch_id in branch_ids:
        assignment = await user_branch_repository.get_assignment(
            user_id=id,
            branch_id=branch_id,
            tenant_id=current_user.tenant_id,
        )
        if assignment:
            items.append(
                UserBranchResponse(
                    id=assignment.id,
                    user_id=assignment.user_id,
                    branch_id=assignment.branch_id,
                    tenant_id=assignment.tenant_id,
                    assigned_at=assignment.assigned_at,
                    assigned_by=assignment.assigned_by,
                )
            )

    return UserBranchListResponse(items=items, total=len(items))
