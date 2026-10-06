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
