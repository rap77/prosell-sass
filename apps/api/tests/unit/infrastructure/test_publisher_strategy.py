"""Tests for PublisherStrategySelector — PUBLISH-03."""

from unittest.mock import MagicMock, patch

import pytest

from prosell.domain.ports.i_publisher_service import IPublisherService
from prosell.infrastructure.services.publisher_strategy import PublisherStrategySelector


@pytest.fixture
def services() -> tuple[IPublisherService, IPublisherService]:
    playwright_svc = MagicMock(spec=IPublisherService)
    graph_api_svc = MagicMock(spec=IPublisherService)
    return playwright_svc, graph_api_svc


def test_strategy_selector_returns_playwright_when_flag_is_playwright(services):
    """PUBLISHER_ENGINE=playwright always returns PlaywrightPublisherService."""
    playwright_svc, graph_api_svc = services
    selector = PublisherStrategySelector(playwright_svc, graph_api_svc)

    with patch("prosell.infrastructure.services.publisher_strategy.settings") as s:
        s.publisher_engine = "playwright"
        s.graph_api_approved = False
        service, name = selector.select()

    assert service is playwright_svc
    assert name == "playwright"


def test_strategy_selector_auto_returns_playwright_when_graph_api_not_approved(services):
    """PUBLISHER_ENGINE=auto + graph_api_approved=False → playwright."""
    playwright_svc, graph_api_svc = services
    selector = PublisherStrategySelector(playwright_svc, graph_api_svc)

    with patch("prosell.infrastructure.services.publisher_strategy.settings") as s:
        s.publisher_engine = "auto"
        s.graph_api_approved = False
        service, name = selector.select()

    assert service is playwright_svc
    assert name == "playwright"


def test_strategy_selector_auto_returns_graph_api_when_approved(services):
    """PUBLISHER_ENGINE=auto + graph_api_approved=True → graph_api."""
    playwright_svc, graph_api_svc = services
    selector = PublisherStrategySelector(playwright_svc, graph_api_svc)

    with patch("prosell.infrastructure.services.publisher_strategy.settings") as s:
        s.publisher_engine = "auto"
        s.graph_api_approved = True
        service, name = selector.select()

    assert service is graph_api_svc
    assert name == "graph_api"
