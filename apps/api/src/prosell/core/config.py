"""Configuration settings using Pydantic BaseSettings."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def get_root_dir() -> Path:
    """Get project root directory."""
    return Path(__file__).parent.parent.parent.parent.parent.parent


class Settings(BaseSettings):
    """
    Application settings.

    Loads from environment variables with type validation.
    """

    # =============================================================================
    # ENVIRONMENT
    # =============================================================================
    environment: Literal["development", "staging", "production", "testing"] = Field(
        default="development",
        description="Application environment",
    )
    debug: bool = Field(
        default=True,
        description="Debug mode (stack traces, detailed errors)",
    )

    # =============================================================================
    # API
    # =============================================================================
    api_host: str = Field(
        default="0.0.0.0",
        description="API host to bind to",
    )
    api_port: int = Field(
        default=8000,
        description="API port to bind to",
    )
    allowed_origins_raw: str | None = Field(
        default=None,
        description="CORS allowed origins (raw comma-separated string)",
        exclude=True,
    )

    @property
    def allowed_origins(self) -> list[str]:
        """Get parsed allowed_origins list."""
        if self.allowed_origins_raw:
            return [o.strip() for o in self.allowed_origins_raw.split(",") if o.strip()]
        return ["http://localhost:3000", "http://localhost:8000"]

    # =============================================================================
    # DATABASE
    # =============================================================================
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/prosell_dev",
        description="PostgreSQL database URL (async)",
    )
    database_pool_size: int = Field(
        default=10,
        description="Database connection pool size",
    )
    database_max_overflow: int = Field(
        default=20,
        description="Database connection pool max overflow",
    )

    # =============================================================================
    # REDIS
    # =============================================================================
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis URL for caching and sessions",
    )
    redis_password: str | None = Field(
        default=None,
        description="Redis password (if required)",
    )
    redis_max_connections: int = Field(
        default=50,
        description="Maximum Redis connections",
    )

    # =============================================================================
    # TASK QUEUE
    # =============================================================================
    task_queue_broker_url: str | None = Field(
        default=None,
        description="Task queue broker URL (defaults to redis_url if None)",
    )
    task_queue_max_workers: int = Field(
        default=4,
        description="Maximum number of worker processes",
    )
    task_queue_task_timeout: int = Field(
        default=300,  # 5 minutes
        description="Task execution timeout in seconds",
    )
    task_queue_max_retries: int = Field(
        default=3,
        description="Maximum retry attempts for failed tasks",
    )

    # =============================================================================
    # JWT (RSA Keys)
    # =============================================================================
    jwt_private_key_path: str = Field(
        default="keys/private.pem",
        description="Path to JWT private key file",
    )
    jwt_public_key_path: str = Field(
        default="keys/public.pem",
        description="Path to JWT public key file",
    )
    jwt_access_token_expire_minutes: int = Field(
        default=60,
        description="JWT access token expiration in minutes",
    )
    jwt_refresh_token_expire_days: int = Field(
        default=7,
        description="JWT refresh token expiration in days",
    )

    # =============================================================================
    # OAUTH (Backend Callback Flow)
    # =============================================================================
    # Google OAuth 2.0 Credentials
    # Get credentials from: https://console.cloud.google.com/apis/credentials
    google_oauth_client_id: str | None = Field(
        default=None,
        description="Google OAuth client ID",
    )
    google_oauth_client_secret: str | None = Field(
        default=None,
        description="Google OAuth client secret",
    )
    # Backend callback URI (where Google redirects after authentication)
    google_oauth_redirect_uri: str = Field(
        default="http://localhost:8000/api/auth/oauth/google/callback",
        description="Google OAuth backend callback URI",
    )

    # Facebook OAuth 2.0 Credentials
    # Get credentials from: https://developers.facebook.com/apps
    facebook_oauth_app_id: str | None = Field(
        default=None,
        description="Facebook OAuth app ID",
    )
    facebook_oauth_app_secret: str | None = Field(
        default=None,
        description="Facebook OAuth app secret",
    )
    # Backend callback URI (where Facebook redirects after authentication)
    facebook_oauth_redirect_uri: str = Field(
        default="http://localhost:8000/api/auth/oauth/facebook/callback",
        description="Facebook OAuth backend callback URI",
    )
    # Encryption key for Facebook access tokens (32 bytes)
    # Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
    facebook_encryption_key: str = Field(
        default="",
        description="Encryption key for Facebook access tokens (must be 32 bytes)",
    )

    # Frontend URLs for redirect after OAuth login
    oauth_frontend_success_url: str = Field(
        default="http://localhost:3000/dashboard",
        description="Frontend URL to redirect after successful OAuth login",
    )
    oauth_frontend_failure_url: str = Field(
        default="http://localhost:3000/auth/login?error=",
        description="Frontend URL to redirect after OAuth failure (error appended)",
    )

    # OAuth Security Settings
    oauth_state_token_expire_minutes: int = Field(
        default=10,
        ge=1,
        le=60,
        description="OAuth state token expiration in minutes",
    )

    # =============================================================================
    # DIGITALOCEAN SPACES (File Storage)
    # =============================================================================
    do_region: str = Field(
        default="nyc3",
        description="DigitalOcean Spaces region (e.g., nyc3, sfo2, ams3)",
    )
    do_bucket_name: str = Field(
        default="prosell-assets",
        description="DigitalOcean Spaces bucket name",
    )
    do_access_key_id: str = Field(
        default="",
        description="DigitalOcean Spaces access key ID",
    )
    do_secret_access_key: str = Field(
        default="",
        description="DigitalOcean Spaces secret access key",
    )
    do_cdn_endpoint: str | None = Field(
        default=None,
        description="Optional CDN endpoint for Spaces assets",
    )

    # =============================================================================
    # STRIPE (Payments)
    # =============================================================================
    stripe_secret_key: str = Field(
        default="sk_test_...",
        description="Stripe secret key (test or live)",
    )
    stripe_publishable_key: str = Field(
        default="pk_test_...",
        description="Stripe publishable key (test or live)",
    )
    stripe_webhook_secret: str | None = Field(
        default=None,
        description="Stripe webhook secret for signature verification",
    )
    stripe_price_id_tokens_100: str | None = Field(
        default=None,
        description="Stripe Price ID for 100 token package",
    )
    stripe_price_id_tokens_500: str | None = Field(
        default=None,
        description="Stripe Price ID for 500 token package",
    )
    stripe_price_id_tokens_1000: str | None = Field(
        default=None,
        description="Stripe Price ID for 1000 token package",
    )

    # =============================================================================
    # EMAIL (SendGrid)
    # =============================================================================
    sendgrid_api_key: str | None = Field(
        default=None,
        description="SendGrid API key",
    )
    sendgrid_from_email: str = Field(
        default="noreply@prosell.saas",
        description="From email address for emails",
    )
    sendgrid_from_name: str = Field(
        default="ProSell SaaS",
        description="From name for emails",
    )
    email_templates_dir: str = Field(
        default="./email-templates",
        description="Directory for email templates",
    )
    use_mock_email: bool = Field(
        default=True,
        description="Use mock email service (logs to console)",
    )

    # =============================================================================
    # SECURITY
    # =============================================================================
    bcrypt_rounds: int = Field(
        default=12,
        ge=4,
        le=31,
        description="bcrypt cost factor (higher = slower but more secure)",
    )
    max_login_attempts: int = Field(
        default=5,
        ge=1,
        description="Maximum failed login attempts before lockout",
    )
    account_lock_minutes: int = Field(
        default=15,
        ge=1,
        description="Account lockout duration in minutes",
    )
    rate_limit_enabled: bool = Field(
        default=True,
        description="Enable rate limiting",
    )
    rate_limit_storage: Literal["redis", "memory"] = Field(
        default="memory",
        description="Rate limit storage backend",
    )
    rate_limit_requests_per_minute: int = Field(
        default=60,
        ge=1,
        description="Default requests per minute limit",
    )
    rate_limit_burst: int = Field(
        default=10,
        ge=1,
        description="Burst size for rate limiter",
    )
    rate_limit_by_ip: bool = Field(
        default=True,
        description="Rate limit by IP address",
    )
    rate_limit_by_user: bool = Field(
        default=True,
        description="Rate limit by user ID (if authenticated)",
    )
    rate_limit_trust_proxy: bool = Field(
        default=True,
        description="Trust X-Forwarded-For header for IP detection",
    )
    rate_limit_auth_requests_per_minute: int = Field(
        default=5,
        ge=1,
        description="Auth endpoint rate limit (requests per minute). Raise for dev/test environments.",
    )

    # =============================================================================
    # PUBLISHER ENGINE
    # =============================================================================
    publisher_engine: Literal["playwright", "graph_api", "auto"] = Field(
        default="auto",
        description="Publisher engine: playwright | graph_api | auto",
    )
    graph_api_approved: bool = Field(
        default=False,
        description="Whether Facebook Graph API app review is approved. "
        "When True in auto mode, Graph API becomes primary.",
    )

    # =============================================================================
    # FEATURE FLAGS
    # =============================================================================
    feature_2fa_enabled: bool = Field(
        default=True,
        description="Enable two-factor authentication",
    )
    feature_oauth_google: bool = Field(
        default=True,
        description="Enable Google OAuth",
    )
    feature_oauth_facebook: bool = Field(
        default=False,
        description="Enable Facebook OAuth",
    )
    feature_registration_enabled: bool = Field(
        default=True,
        description="Enable user registration",
    )
    feature_password_reset: bool = Field(
        default=True,
        description="Enable password reset",
    )

    # =============================================================================
    # LOGGING
    # =============================================================================
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO",
        description="Logging level",
    )
    log_format: Literal["json", "text"] = Field(
        default="text",
        description="Log format (json or text)",
    )
    sentry_dsn: str | None = Field(
        default=None,
        description="Sentry DSN for error tracking",
    )

    # =============================================================================
    # PYDANTIC CONFIG
    # =============================================================================
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
        case_sensitive=False,
    )

    # =============================================================================
    # VALIDATORS
    # =============================================================================
    @field_validator("jwt_private_key_path", "jwt_public_key_path")
    @classmethod
    def resolve_key_paths(cls, v: str) -> str:
        """Resolve key paths relative to project root."""
        path = Path(v)
        if not path.is_absolute():
            path = get_root_dir() / "apps/api" / v
        return str(path)

    @property
    def jwt_private_key(self) -> str:
        """Read and return JWT private key content."""
        path = Path(self.jwt_private_key_path)
        if not path.exists():
            raise FileNotFoundError(
                f"JWT private key not found at {path}. Run: ./scripts/generate-jwt-keys.sh"
            )
        return path.read_text()

    @property
    def jwt_public_key(self) -> str:
        """Read and return JWT public key content."""
        path = Path(self.jwt_public_key_path)
        if not path.exists():
            raise FileNotFoundError(
                f"JWT public key not found at {path}. Run: ./scripts/generate-jwt-keys.sh"
            )
        return path.read_text()


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Uses lru_cache to ensure settings are loaded only once.
    """
    return Settings()


class OAuthSettings(BaseSettings):
    """
    OAuth-specific settings for dependency injection.

    This class extracts OAuth-related settings from the main Settings
    for use in OAuth service dependency injection.
    """

    google_oauth_client_id: str | None = Field(
        default=None,
        description="Google OAuth client ID",
    )
    google_oauth_client_secret: str | None = Field(
        default=None,
        description="Google OAuth client secret",
    )
    google_oauth_redirect_uri: str = Field(
        default="http://localhost:8000/api/auth/oauth/google/callback",
        description="Google OAuth backend callback URI",
    )
    facebook_oauth_app_id: str | None = Field(
        default=None,
        description="Facebook OAuth app ID",
    )
    facebook_oauth_app_secret: str | None = Field(
        default=None,
        description="Facebook OAuth app secret",
    )
    facebook_oauth_redirect_uri: str = Field(
        default="http://localhost:8000/api/auth/oauth/facebook/callback",
        description="Facebook OAuth backend callback URI",
    )

    # Redis URL for OAuth state token storage
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis URL for OAuth state token storage",
    )

    frontend_success_url: str = Field(
        default="http://localhost:3000/dashboard",
        description="Frontend URL after successful login",
    )
    frontend_failure_url: str = Field(
        default="http://localhost:3000/auth/login?error=",
        description="Frontend URL after login failure",
    )

    state_token_expire_minutes: int = Field(
        default=10,
        description="State token expiration in minutes",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
        case_sensitive=False,
    )


@lru_cache
def get_oauth_settings() -> OAuthSettings:
    """
    Get cached OAuth settings instance.

    Uses lru_cache to ensure settings are loaded only once.
    """
    return OAuthSettings()


# Global settings instance
settings = get_settings()
