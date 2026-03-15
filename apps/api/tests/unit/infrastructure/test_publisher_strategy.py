"""Tests for PublisherStrategySelector — PUBLISH-03."""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 03")
def test_strategy_selector_returns_playwright_when_flag_is_playwright():
    """PUBLISHER_ENGINE=playwright always returns PlaywrightPublisherService."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 03")
def test_strategy_selector_auto_returns_playwright_when_graph_api_not_approved():
    """PUBLISHER_ENGINE=auto + graph_api_approved=False → playwright."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 03")
def test_strategy_selector_auto_returns_graph_api_when_approved():
    """PUBLISHER_ENGINE=auto + graph_api_approved=True → graph_api."""
    pytest.fail("stub")
