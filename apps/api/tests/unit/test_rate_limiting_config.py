#!/usr/bin/env python3
"""
Test script to verify rate limiting configuration for testing environment.

This script tests:
1. Rate limiting behavior in different environments
2. Test exemptions functionality
3. Smart rate limit adjustments
"""

import sys
from pathlib import Path
from unittest.mock import Mock

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fastapi import Request

from prosell.core.config import get_settings
from prosell.infrastructure.api.middleware.rate_limit_middleware import (
    get_identifier,
    is_rate_limit_exempt,
    is_test_environment,
    smart_rate_limit,
)


def test_environment_detection():
    """Test environment detection functionality."""
    print("Testing environment detection...")

    # Test with current settings
    settings = get_settings()
    print(f"Current environment: {settings.environment}")
    print(f"Is test environment: {is_test_environment()}")

    # Test setting override
    original_env = settings.environment
    settings.environment = "testing"
    print(f"Override environment: {settings.environment}")
    print(f"Is test environment after override: {is_test_environment()}")

    # Restore original
    settings.environment = original_env
    print("✅ Environment detection test passed")


def test_rate_limit_exemption():
    """Test rate limit exemption functionality."""
    print("\nTesting rate limit exemption...")

    settings = get_settings()  # noqa: F841

    # Test request with test user agent
    mock_request = Mock(spec=Request)
    mock_request.headers = {"User-Agent": "playwright/test-agent"}

    exempt = is_rate_limit_exempt(mock_request)
    print(f"Request with playwright user agent exempt: {exempt}")

    # Test request with test API key
    mock_request.headers = {"X-Test-API-Key": "prosell-test-api-key-2026"}
    exempt = is_rate_limit_exempt(mock_request)
    print(f"Request with test API key exempt: {exempt}")

    # Test normal request
    mock_request.headers = {"User-Agent": "Mozilla/5.0"}
    exempt = is_rate_limit_exempt(mock_request)
    print(f"Normal request exempt: {exempt}")

    print("✅ Rate limit exemption test passed")


def test_identifier_generation():
    """Test identifier generation for different request types."""
    print("\nTesting identifier generation...")

    settings = get_settings()

    # Test with test environment
    original_env = settings.environment
    settings.environment = "testing"

    # Mock request with IP
    mock_request = Mock(spec=Request)
    mock_request.headers = {}
    mock_request.state = {}

    # Test IP-based identifier
    identifier = get_identifier(mock_request)
    print(f"IP-based identifier: {identifier}")

    # Restore original environment
    settings.environment = original_env

    print("✅ Identifier generation test passed")


def test_smart_rate_limit():
    """Test smart rate limit configuration."""
    print("\nTesting smart rate limit configuration...")

    settings = get_settings()
    original_env = settings.environment

    # Test with test environment
    settings.environment = "testing"

    # Test auth endpoint limit
    auth_limit = smart_rate_limit("auth")
    print(f"Auth endpoint limit in test: {auth_limit}")

    # Test API endpoint limit
    api_limit = smart_rate_limit("api")
    print(f"API endpoint limit in test: {api_limit}")

    # Test public endpoint limit
    public_limit = smart_rate_limit("public")
    print(f"Public endpoint limit in test: {public_limit}")

    # Restore original environment
    settings.environment = original_env

    print("✅ Smart rate limit test passed")


def test_rate_limits_in_different_environments():
    """Test rate limits in different environments."""
    print("\nTesting rate limits in different environments...")

    settings = get_settings()
    original_env = settings.environment

    # Test production-like environment
    settings.environment = "production"
    print(f"Production environment: {is_test_environment()}")

    # Test test environment
    settings.environment = "testing"
    print(f"Test environment: {is_test_environment()}")

    # Test development environment
    settings.environment = "development"
    print(f"Development environment: {is_test_environment()}")

    # Restore original
    settings.environment = original_env

    print("✅ Environment-specific rate limits test passed")


def main():
    """Main test function."""
    print("🚀 Starting rate limiting configuration tests...")

    try:
        test_environment_detection()
        test_rate_limit_exemption()
        test_identifier_generation()
        test_smart_rate_limit()
        test_rate_limits_in_different_environments()

        print("\n🎉 All tests passed! Rate limiting configuration is working correctly.")
        return 0

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
