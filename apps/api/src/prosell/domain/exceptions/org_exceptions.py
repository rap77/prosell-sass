"""Organization-related domain exceptions."""

from prosell.domain.exceptions.auth_exceptions import AuthDomainException


class OrgDomainException(AuthDomainException):
    """Base exception for organization domain errors."""


class OrganizationNotFoundException(OrgDomainException):
    """Raised when organization is not found."""

    def __init__(self, org_id: str | None = None) -> None:
        if org_id:
            message = f"Organization not found: '{org_id}'"
            details = {"org_id": org_id}
        else:
            message = "Organization not found"
            details = {}
        super().__init__(message=message, details=details)


class OrganizationAlreadyExistsException(OrgDomainException):
    """Raised when organization name already exists for tenant."""

    def __init__(self, name: str) -> None:
        super().__init__(
            message=f"An organization with name '{name}' already exists",
            details={"name": name},
        )


class OrganizationNotActiveException(OrgDomainException):
    """Raised when operation requires an active organization."""

    def __init__(self, status: str) -> None:
        super().__init__(
            message=f"Organization is not active. Current status: {status}",
            details={"status": status},
        )


class OrganizationVerificationException(OrgDomainException):
    """Raised when organization verification fails."""

    def __init__(self, reason: str) -> None:
        super().__init__(
            message=f"Organization verification failed: {reason}",
            details={"reason": reason},
        )


class TeamNotFoundException(OrgDomainException):
    """Raised when team is not found."""

    def __init__(self, team_id: str | None = None) -> None:
        if team_id:
            message = f"Team not found: '{team_id}'"
            details = {"team_id": team_id}
        else:
            message = "Team not found"
            details = {}
        super().__init__(message=message, details=details)


class TeamAlreadyExistsException(OrgDomainException):
    """Raised when team name already exists in org."""

    def __init__(self, name: str) -> None:
        super().__init__(
            message=f"A team with name '{name}' already exists in this organization",
            details={"name": name},
        )


class TeamMemberNotFoundException(OrgDomainException):
    """Raised when team member is not found."""

    def __init__(self, member_id: str | None = None) -> None:
        if member_id:
            message = f"Team member not found: '{member_id}'"
            details = {"member_id": member_id}
        else:
            message = "Team member not found"
            details = {}
        super().__init__(message=message, details=details)


class WalletNotFoundException(OrgDomainException):
    """Raised when wallet is not found."""

    def __init__(self, org_id: str | None = None) -> None:
        if org_id:
            message = f"Wallet not found for organization: '{org_id}'"
            details = {"org_id": org_id}
        else:
            message = "Wallet not found"
            details = {}
        super().__init__(message=message, details=details)


class InsufficientFundsException(OrgDomainException):
    """Raised when wallet has insufficient funds."""

    def __init__(self, available: int, required: int) -> None:
        super().__init__(
            message=(
                f"Insufficient funds. Available: {available} cents, Required: {required} cents"
            ),
            details={"available_cents": available, "required_cents": required},
        )
