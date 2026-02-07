"""Authentication middleware for JWT verification."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from prosell.domain.ports import IJWTService
from prosell.infrastructure.api.dependencies import get_jwt_service

security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    jwt_service: IJWTService = Depends(get_jwt_service),
) -> dict:
    """
    FastAPI dependency to verify JWT and extract user.

    Args:
        credentials: HTTP Bearer credentials
        jwt_service: JWT service instance

    Returns:
        Decoded JWT payload with user info

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt_service.verify_token(credentials.credentials)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        return payload
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        ) from e


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    jwt_service: IJWTService = Depends(get_jwt_service),
) -> dict | None:
    """
    Optional JWT verification.

    Returns None if no token provided or invalid token.
    """
    if not credentials:
        return None

    try:
        payload = jwt_service.verify_token(credentials.credentials)
        if payload.get("type") == "access":
            return payload
    except ValueError:
        pass

    return None
