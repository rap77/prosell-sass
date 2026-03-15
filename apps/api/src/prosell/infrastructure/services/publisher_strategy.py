"""PublisherStrategySelector — selects publisher engine based on settings.

Pattern:
  - publisher_engine = "playwright"  → always returns PlaywrightPublisherService
  - publisher_engine = "graph_api"   → always returns GraphAPIPublisherService
  - publisher_engine = "auto"        → Playwright unless graph_api_approved=True
"""

from prosell.core.config import settings
from prosell.domain.ports.i_publisher_service import IPublisherService


class PublisherStrategySelector:
    """Selects the active publisher service based on runtime settings.

    Injected with both service instances at construction time so tests
    can pass mocks without touching module-level state.
    """

    def __init__(
        self,
        playwright_service: IPublisherService,
        graph_api_service: IPublisherService,
    ) -> None:
        self._playwright = playwright_service
        self._graph_api = graph_api_service

    def select(self) -> tuple[IPublisherService, str]:
        """Return (service, engine_name) based on current settings.

        Returns:
            Tuple of (IPublisherService, str) where str is "playwright" or "graph_api".
        """
        engine = settings.publisher_engine

        if engine == "graph_api":
            return self._graph_api, "graph_api"

        if engine == "playwright":
            return self._playwright, "playwright"

        # engine == "auto"
        if getattr(settings, "graph_api_approved", False):
            return self._graph_api, "graph_api"

        return self._playwright, "playwright"
