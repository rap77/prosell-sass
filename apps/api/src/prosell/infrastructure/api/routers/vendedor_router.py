"""Vendedor router for ProSell SaaS API."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.vendedor import VendedorListResponse
from prosell.application.use_cases.vendedor import GetVendedoresUseCase
from prosell.domain.entities.user import User
from prosell.domain.exceptions.org_exceptions import OrgDomainException
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.user_repository_impl import SqlAlchemyUserRepository

router = APIRouter()


# =============================================================================
# DEPENDENCY FACTORIES
# =============================================================================


def get_user_repository(
    session: AsyncSession = Depends(get_async_session),
) -> SqlAlchemyUserRepository:
    """Get user repository instance."""
    return SqlAlchemyUserRepository(session)


def get_get_vendedores_use_case(
    user_repo: SqlAlchemyUserRepository = Depends(get_user_repository),
) -> GetVendedoresUseCase:
    """Get GetVendedoresUseCase instance."""
    return GetVendedoresUseCase(user_repository=user_repo)


# =============================================================================
# VENDEDOR ENDPOINTS
# =============================================================================


@router.get(
    "",
    response_model=VendedorListResponse,
    summary="List all vendedores (salespersons) in the organization",
)
async def list_vendedores(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_auth_user_from_cookie),
    use_case: GetVendedoresUseCase = Depends(get_get_vendedores_use_case),
) -> VendedorListResponse:
    """
    List all vendedores in the current user's organization.

    Only returns users with the 'vendedor' role. Requires authentication.

    Args:
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        current_user: Authenticated user (from cookie)
        use_case: GetVendedoresUseCase instance

    Returns:
        VendedorListResponse with list of vendedores

    Raises:
        HTTPException: 400 if user has no tenant_id
        HTTPException: 500 for domain exceptions
    """
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )

    try:
        return await use_case.execute(
            tenant_id=current_user.tenant_id,
            skip=skip,
            limit=limit,
        )
    except OrgDomainException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        ) from e
