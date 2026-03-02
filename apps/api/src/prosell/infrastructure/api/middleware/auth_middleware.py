"""Authentication middleware for JWT verification."""

from typing import Any

from fastapi import Depends, HTTPException, Request, status

from prosell.domain.ports import IJWTService
from prosell.infrastructure.api.dependencies import get_jwt_service


async def get_current_user(
    request: Request,
    jwt_service: IJWTService = Depends(get_jwt_service),
) -> dict[str, Any]:
    """
    FastAPI dependency to verify JWT from httpOnly cookie.

    Args:
        request: Incoming HTTP request (reads access_token cookie)
        jwt_service: JWT service instance

    Returns:
        Decoded JWT payload with user info

    Raises:
        HTTPException: If cookie is missing, token is invalid or expired
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = jwt_service.verify_token(token)
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
    request: Request,
    jwt_service: IJWTService = Depends(get_jwt_service),
) -> dict[str, Any] | None:
    """
    Optional JWT verification — reads from access_token httpOnly cookie.

    Returns None if no cookie present or token is invalid.
    """
    token = request.cookies.get("access_token")
    if not token:
        return None

    try:
        payload = jwt_service.verify_token(token)
        if payload.get("type") == "access":
            return payload
    except ValueError:
        pass

    return None
