"""Role/permission-related domain exceptions."""

from prosell.domain.exceptions.auth_exceptions import AuthDomainException


class RoleDomainException(AuthDomainException):
    """Base exception for role/permission domain errors."""


class PermissionEscalationException(RoleDomainException):
    """Raised when an actor tries to grant a (zone, action) pair they do
    not themselves hold — the anti-escalation rule from the diagnostic
    doc §6.2 / §3.1(4): nobody grants what they don't have."""

    def __init__(self, escalated_pairs: list[str]) -> None:
        super().__init__(
            message=(
                "Cannot grant permissions the granting role does not itself hold: "
                + ", ".join(escalated_pairs)
            ),
            details={"escalated_grants": escalated_pairs},
        )


class ScopeEscalationException(RoleDomainException):
    """Raised when an actor tries to grant a data-visibility SCOPE broader
    than their own — bloque 3, item 3.1: strict-subset rule confirmed with
    the user. Companion to `PermissionEscalationException`, which covers
    the zone x action axis; this one covers alcance."""

    def __init__(self, *, granter_scope: object, requested_scope: object) -> None:
        self.granter_scope_name = type(granter_scope).__name__
        self.requested_scope_name = type(requested_scope).__name__
        super().__init__(
            message=(
                f"Cannot grant scope {self.requested_scope_name!r} — the granting role's "
                f"own scope ({self.granter_scope_name!r}) does not cover it"
            ),
            details={
                "granter_scope": self.granter_scope_name,
                "requested_scope": self.requested_scope_name,
            },
        )


class CannotDeleteSystemRoleException(RoleDomainException):
    """Raised when an actor tries to delete a system (template) role —
    bloque 3, item 3.2's DELETE slice. System roles are deleted only by
    removing them from the fixed `RoleType` set and re-migrating, never
    through the admin profiles UI."""

    def __init__(self, role_name: str) -> None:
        super().__init__(
            message=f"Cannot delete system role {role_name!r}",
            details={"role_name": role_name},
        )
