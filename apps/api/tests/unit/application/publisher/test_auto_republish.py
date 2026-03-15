"""Tests for AutoRepublishUseCase — PUBLISH-06."""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 05")
async def test_auto_republish_detects_listings_within_48h():
    """AutoRepublishUseCase finds listings where expires_at < now + 48h."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 05")
async def test_auto_republish_clones_and_creates_new_publication():
    """AutoRepublishUseCase creates new Publication cloned from expiring one."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 05")
async def test_auto_republish_marks_old_publication_expired():
    """AutoRepublishUseCase marks old publication EXPIRED after cloning."""
    pytest.fail("stub")
