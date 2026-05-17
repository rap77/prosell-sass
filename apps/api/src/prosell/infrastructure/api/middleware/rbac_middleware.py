"""Role-Based Access Control (RBAC) middleware."""

from collections.abc import Callable
from functools import wraps
from typing import Any, ParamSpec

from fastapi import HTTPException, status

from prosell.domain.entities.role import RoleType

P = ParamSpec("P")


class RBACMiddleware:
    """
    Role-Based Access Control middleware.

    Checks if users have required roles or permissions.
    """

    @staticmethod
    def require_roles(
        *roles: str,
    ) -> Callable[[Callable[P, Any]], Callable[P, Any]]:
        """
        Decorator to require specific roles.

        Args:
            *roles: Required role names

        Example:
            @router.get("/admin")
            @require_roles("admin", "super_admin")
            async def admin_endpoint(current_user: dict[str, Any], ...):
                ...
        """

        def decorator(func: Callable[P, Any]) -> Callable[P, Any]:
            @wraps(func)
            async def wrapper(*args: P.args, **kwargs: P.kwargs) -> Any:
                # Extract current_user from kwargs
                current_user_dict = kwargs.pop("current_user", {})
                user_roles: list[str] = (
                    current_user_dict.get("roles", [])
                    if isinstance(current_user_dict, dict)
                    else []
                )

                # Check if user has any of the required roles
                if not any(role in user_roles for role in roles):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access denied. Required roles: {', '.join(roles)}",
                    )

                # Call original function without current_user (it's already extracted)
                return await func(*args, **kwargs)

            return wrapper

        return decorator

    @staticmethod
    def require_permissions(
        *permissions: str,
    ) -> Callable[[Callable[P, Any]], Callable[P, Any]]:
        """
        Decorator to require specific permissions.

        Args:
            *permissions: Required permission names

        Example:
            @router.post("/users")
            @require_permissions("user:create")
            async def create_user(current_user: dict[str, Any], ...):
                ...
        """

        def decorator(func: Callable[P, Any]) -> Callable[P, Any]:
            @wraps(func)
            async def wrapper(*args: P.args, **kwargs: P.kwargs) -> Any:
                # Extract current_user from kwargs
                current_user_dict = kwargs.pop("current_user", {})
                user_roles: list[str] = (
                    current_user_dict.get("roles", [])
                    if isinstance(current_user_dict, dict)
                    else []
                )

                # Get permissions for user's roles
                from prosell.domain.entities.role import ROLE_PERMISSIONS

                user_permissions: set[str] = set()
                for role in user_roles:
                    try:
                        role_type = RoleType(role)
                        user_permissions.update(ROLE_PERMISSIONS.get(role_type, set()))
                    except ValueError:
                        pass

                # Check if user has all required permissions
                missing = [p for p in permissions if p not in user_permissions]
                if missing:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access denied. Missing permissions: {', '.join(missing)}",
                    )

                # Call original function without current_user (it's already extracted)
                return await func(*args, **kwargs)

            return wrapper

        return decorator


# Convenience decorators
require_roles = RBACMiddleware.require_roles
require_permissions = RBACMiddleware.require_permissions
