"""Role-Based Access Control (RBAC) middleware."""

from collections.abc import Callable
from functools import wraps

from fastapi import HTTPException, status

from prosell.domain.entities.role import RoleType


class RBACMiddleware:
    """
    Role-Based Access Control middleware.

    Checks if users have required roles or permissions.
    """

    @staticmethod
    def require_roles(*roles: str) -> Callable:
        """
        Decorator to require specific roles.

        Args:
            *roles: Required role names

        Example:
            @router.get("/admin")
            @require_roles("admin", "super_admin")
            async def admin_endpoint(...):
                ...
        """

        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(*args, current_user: dict, **kwargs):
                user_roles = current_user.get("roles", [])

                # Check if user has any of the required roles
                if not any(role in user_roles for role in roles):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access denied. Required roles: {', '.join(roles)}",
                    )

                return await func(*args, current_user=current_user, **kwargs)

            return wrapper

        return decorator

    @staticmethod
    def require_permissions(*permissions: str) -> Callable:
        """
        Decorator to require specific permissions.

        Args:
            *permissions: Required permission names

        Example:
            @router.post("/users")
            @require_permissions("user:create")
            async def create_user(...):
                ...
        """

        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(*args, current_user: dict, **kwargs):
                user_roles = current_user.get("roles", [])

                # Get permissions for user's roles
                from prosell.domain.entities.role import ROLE_PERMISSIONS

                user_permissions = set()
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

                return await func(*args, current_user=current_user, **kwargs)

            return wrapper

        return decorator


# Convenience decorators
require_roles = RBACMiddleware.require_roles
require_permissions = RBACMiddleware.require_permissions
