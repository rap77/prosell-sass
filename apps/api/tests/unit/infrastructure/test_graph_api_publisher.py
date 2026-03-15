"""Tests for GraphAPIPublisherService stub — PUBLISH-02."""

import pytest

from prosell.domain.ports.i_publisher_service import IPublisherService
from prosell.infrastructure.services.graph_api_publisher import GraphAPIPublisherService


def test_graph_api_publisher_implements_i_publisher_service():
    """GraphAPIPublisherService implements IPublisherService interface."""
    assert issubclass(GraphAPIPublisherService, IPublisherService)


async def test_graph_api_publisher_raises_not_implemented():
    """GraphAPIPublisherService.publish() raises NotImplementedError in Phase 1."""
    service = GraphAPIPublisherService(encryption_service=None)
    with pytest.raises(NotImplementedError, match="Graph API App Review"):
        await service.publish(publication=None, access_token="", image_bytes_list=[])
