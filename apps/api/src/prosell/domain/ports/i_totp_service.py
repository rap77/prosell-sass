"""TOTP service interface (port) for secondary actor."""

from typing import Protocol


class ITOTPService(Protocol):
    """
    Interface for TOTP (Time-based One-Time Password) generation and verification.

    This is a secondary port (interface) that the infrastructure layer
    must implement. The application layer depends on this interface,
    not on the concrete implementation.
    """

    def generate_secret(self) -> str:
        """
        Generate a new TOTP secret.

        Returns:
            Base32-encoded secret key
        """
        ...

    def generate_qr_code_uri(self, email: str, secret: str) -> str:
        """
        Generate QR code URI for authenticator apps.

        Args:
            email: User email
            secret: TOTP secret

        Returns:
            otpauth:// URI for QR code generation
        """
        ...

    def generate_backup_codes(self, count: int = 10) -> list[str]:
        """
        Generate backup codes for 2FA.

        Args:
            count: Number of codes to generate

        Returns:
            List of backup codes
        """
        ...

    def verify_code(self, secret: str, code: str) -> bool:
        """
        Verify TOTP code.

        Args:
            secret: TOTP secret
            code: 6-digit code from authenticator app

        Returns:
            True if code is valid
        """
        ...
