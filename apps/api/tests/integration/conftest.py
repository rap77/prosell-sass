"""Pytest configuration for integration tests."""

import pytest


@pytest.fixture(autouse=True)
def disable_rate_limiting(monkeypatch):
    """Disable rate limiting during integration tests."""
    # Import the limiter and disable it
    from prosell.infrastructure.api.middleware.rate_limit_middleware import limiter

    # Check if limiter has _enabled or _storage_uri attribute
    # The slowapi Limiter class stores enabled state in the underlying storage
    # We'll disable it by setting enabled=False on the limiter instance
    if hasattr(limiter, "enabled"):
        monkeypatch.setattr(limiter, "enabled", False)
    else:
        # Fallback: mock the check_rate_limit method to always pass
        def mock_check(*_args, **_kwargs):
            return None  # No rate limit hit

        monkeypatch.setattr(limiter, "_check_rate_limit", mock_check)
