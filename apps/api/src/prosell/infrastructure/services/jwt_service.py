"""JWT token generation and verification service."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt

from prosell.core.config import settings
from prosell.domain.ports import IJWTService


class JWTService(IJWTService):
    """
    JWT token generation and verification using RS256.

    Uses asymmetric encryption (RSA) for production security.
    """

    def __init__(self) -> None:
        self.private_key = settings.jwt_private_key
        self.public_key = settings.jwt_public_key
        self.algorithm = "RS256"
        self.access_expire_minutes = settings.jwt_access_token_expire_minutes
        self.refresh_expire_days = settings.jwt_refresh_token_expire_days

    def generate_access_token(
        self,
        user_id: UUID,
        roles: list[str],
    ) -> str:
        """
        Generate JWT access token.

        Args:
            user_id: User UUID
            roles: List of role names

        Returns:
            Encoded JWT access token
        """
        payload = {
            "sub": str(user_id),
            "roles": roles,
            "type": "access",
            "exp": datetime.now(UTC) + timedelta(minutes=self.access_expire_minutes),
            "iat": datetime.now(UTC),
        }
        return jwt.encode(payload, self.private_key, algorithm=self.algorithm)

    def generate_refresh_token(self, user_id: UUID) -> str:
        """
        Generate JWT refresh token.

        Args:
            user_id: User UUID

        Returns:
            Encoded JWT refresh token
        """
        payload = {
            "sub": str(user_id),
            "type": "refresh",
            "exp": datetime.now(UTC) + timedelta(days=self.refresh_expire_days),
            "iat": datetime.now(UTC),
        }
        return jwt.encode(payload, self.private_key, algorithm=self.algorithm)

    def verify_token(self, token: str) -> dict:
        """
        Verify and decode JWT token.

        Args:
            token: JWT token to verify

        Returns:
            Decoded token payload

        Raises:
            ValueError: If token is invalid or expired
        """
        try:
            payload = jwt.decode(
                token,
                self.public_key,
                algorithms=[self.algorithm],
            )
            return payload
        except jwt.ExpiredSignatureError as e:
            raise ValueError("Token has expired") from e
        except jwt.InvalidTokenError as e:
            raise ValueError("Invalid token") from e

    def decode_token_without_verification(self, token: str) -> dict:
        """
        Decode token without verification (for debugging).

        Args:
            token: JWT token to decode

        Returns:
            Decoded token payload
        """
        return jwt.decode(token, options={"verify_signature": False})
