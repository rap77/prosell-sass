"""Authentication middleware for JWT verification."""

from typing import Annotated, NotRequired, TypedDict

from fastapi import Depends, HTTPException, Request, status

from prosell.domain.ports import IJWTService
from prosell.infrastructure.api.dependencies import get_jwt_service


class AuthTokenPayload(TypedDict):
    """Typed JWT payload used by auth dependencies."""

    sub: str
    type: str
    roles: NotRequired[list[str]]
    is_2fa_enabled: NotRequired[bool]


def _coerce_auth_payload(payload: dict[str, object]) -> AuthTokenPayload:
    """Validate and coerce a raw JWT payload into the typed auth shape."""
    sub = payload.get("sub")
    token_type = payload.get("type")
    roles_value = payload.get("roles")
    is_2fa_enabled = payload.get("is_2fa_enabled")

    if not isinstance(sub, str) or not isinstance(token_type, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    typed_payload: AuthTokenPayload = {"sub": sub, "type": token_type}

    if isinstance(roles_value, list) and all(isinstance(role, str) for role in roles_value):
        typed_payload["roles"] = roles_value

    if isinstance(is_2fa_enabled, bool):
        typed_payload["is_2fa_enabled"] = is_2fa_enabled

    return typed_payload


async def get_current_user(
    request: Request,
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
) -> AuthTokenPayload:
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
        return _coerce_auth_payload(payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        ) from e


async def get_optional_user(
    request: Request,
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
) -> AuthTokenPayload | None:
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
            return _coerce_auth_payload(payload)
    except ValueError:
        pass

    return None
