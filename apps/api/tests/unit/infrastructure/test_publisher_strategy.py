"""Tests for PublisherStrategySelector — PUBLISH-03."""

from unittest.mock import MagicMock, patch

import pytest

from prosell.domain.ports.i_encryption_service import IEncryptionService
from prosell.domain.ports.i_publisher_service import IPublisherService
from prosell.infrastructure.services.graph_api_publisher import GraphAPIPublisherService
from prosell.infrastructure.services.playwright_publisher import PlaywrightPublisherService
from prosell.infrastructure.services.publisher_strategy import (
    PublisherStrategySelector,
    build_publisher_selector,
)


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


class TestBuildPublisherSelector:
    """PUBLISH-03 follow-up (backend decomposition Stage 1.4 / 3.7).

    `publish_product_task.py` used to wire `NullGraphAPIPublisherService` (a dead-end
    stub, replaced nowhere) while `update_listing_task.py` and `delete_listing_task.py`
    already wired the real `GraphAPIPublisherService` — a silent divergence that would
    only surface the day `graph_api_approved` flips. This factory is the single
    construction point all three tasks now share.
    """

    def test_wires_real_playwright_and_graph_api_services(self):
        encryption = MagicMock(spec=IEncryptionService)

        selector = build_publisher_selector(encryption)

        assert isinstance(selector, PublisherStrategySelector)
        assert isinstance(selector._playwright, PlaywrightPublisherService)
        assert isinstance(selector._graph_api, GraphAPIPublisherService)

    def test_graph_api_service_is_constructed_with_the_given_encryption(self):
        encryption = MagicMock(spec=IEncryptionService)

        selector = build_publisher_selector(encryption)
        graph_api_svc = selector._graph_api
        assert isinstance(graph_api_svc, GraphAPIPublisherService)

        assert graph_api_svc._encryption is encryption

    def test_never_wires_the_null_graph_api_placeholder(self):
        """Regression guard for the exact divergence this factory fixes."""
        encryption = MagicMock(spec=IEncryptionService)

        selector = build_publisher_selector(encryption)

        assert type(selector._graph_api).__name__ != "NullGraphAPIPublisherService"
