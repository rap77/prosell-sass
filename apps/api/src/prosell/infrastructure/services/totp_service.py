"""TOTP (Time-based One-Time Password) service for 2FA."""

import base64
from io import BytesIO

import pyotp
import qrcode

from prosell.domain.ports import ITOTPService


class TOTPService(ITOTPService):
    """
    TOTP service for two-factor authentication.

    Compatible with Google Authenticator and similar apps.
    """

    ISSUER_NAME = "ProSell SaaS"

    def generate_secret(self) -> str:
        """
        Generate a new TOTP secret.

        Returns:
            Base32-encoded secret key
        """
        return pyotp.random_base32()

    def generate_qr_code_uri(self, email: str, secret: str) -> str:
        """
        Generate QR code URI for authenticator apps.

        Args:
            email: User email
            secret: TOTP secret

        Returns:
            otpauth:// URI for QR code generation
        """
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(
            name=email,
            issuer_name=self.ISSUER_NAME,
        )

    def generate_qr_code_base64(self, email: str, secret: str) -> str:
        """
        Generate QR code as base64-encoded image.

        Args:
            email: User email
            secret: TOTP secret

        Returns:
            Base64-encoded PNG image data URI
        """
        uri = self.generate_qr_code_uri(email, secret)

        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)

        # Convert to PIL image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = BytesIO()
        img.save(buffer)
        img_str = base64.b64encode(buffer.getvalue()).decode()

        return f"data:image/png;base64,{img_str}"

    def generate_backup_codes(self, count: int = 10) -> list[str]:
        """
        Generate backup codes for 2FA.

        Args:
            count: Number of codes to generate

        Returns:
            List of backup codes
        """
        return [pyotp.random_base32()[:8] for _ in range(count)]

    def verify_code(self, secret: str, code: str) -> bool:
        """
        Verify TOTP code.

        Args:
            secret: TOTP secret
            code: 6-digit code from authenticator app

        Returns:
            True if code is valid
        """
        totp = pyotp.TOTP(secret)
        # Allow 1 step (30 seconds) window for clock skew
        return totp.verify(code, valid_window=1)
