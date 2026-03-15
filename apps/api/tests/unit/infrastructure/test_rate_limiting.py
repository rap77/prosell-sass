"""Tests for publisher rate limiting — PUBLISH-09."""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 06")
async def test_rate_limiter_allows_first_request():
    """Token bucket allows the first publication request through."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 06")
async def test_rate_limiter_blocks_after_quota_exceeded():
    """Token bucket blocks requests when quota is exceeded."""
    pytest.fail("stub")
