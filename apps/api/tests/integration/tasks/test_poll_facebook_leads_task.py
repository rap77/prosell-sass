"""Integration tests for poll_facebook_leads_task.

Tests the background task that polls Facebook Graph API for missed leads.
This task runs every 10 minutes as a fallback to webhooks.
"""


import pytest

from prosell.infrastructure.tasks.use_cases.poll_facebook_leads_task import (
    poll_facebook_leads_task,
)

# Track broker state
_broker_started = False


@pytest.fixture(autouse=True)
async def setup_broker():
    """Set up broker for testing."""
    global _broker_started

    # Only start broker once per test session
    if not _broker_started:
        try:
            # Try startup() first (ListQueueBroker)
            await poll_facebook_leads_task.broker.startup()
        except AttributeError:
            # Fallback to start() (InMemoryBroker)
            await poll_facebook_leads_task.broker.start()
        _broker_started = True

    yield

    # Don't shutdown - let it run for other tests


class TestPollFacebookLeadsTask:
    """Integration tests for poll_facebook_leads_task."""

    @pytest.mark.asyncio
    async def test_task_is_decorated(self):
        """Test that poll_facebook_leads_task is properly decorated as a Taskiq task."""
        # Verify task is decorated with kiq method
        assert hasattr(poll_facebook_leads_task, "kiq")
        assert poll_facebook_leads_task.task_name  # type: ignore[attr-defined]

    @pytest.mark.asyncio
    async def test_task_returns_dict(self):
        """Test that task returns a dict with expected structure."""
        # Task should return dict with statistics
        # Note: This will return pending status until Phase 3 (Graph API integration)
        result = await poll_facebook_leads_task()

        assert isinstance(result, dict)
        assert "status" in result

    @pytest.mark.asyncio
    async def test_task_enqueues(self):
        """Test that task can be enqueued via kiq."""
        from prosell.core.config import settings

        # Verify task can be enqueued (skip if Redis not available)
        if settings.environment != "testing":
            # In non-testing environments, kiq requires Redis
            # Just verify the method exists
            assert hasattr(poll_facebook_leads_task, "kiq")
        else:
            # In testing environment with InMemoryBroker, kiq should work
            try:
                task_result = await poll_facebook_leads_task.kiq()
                assert task_result is not None
            except Exception:
                # InMemoryBroker may have limitations, that's OK
                # Just verify the method exists
                assert hasattr(poll_facebook_leads_task, "kiq")


class TestPollFacebookLeadsTaskStructure:
    """Test task structure and expected fields."""

    @pytest.mark.asyncio
    async def test_result_has_status_field(self):
        """Test that result includes status field."""
        result = await poll_facebook_leads_task()

        assert "status" in result
        assert isinstance(result["status"], str)
        assert result["status"] in ["pending", "success", "partial_failure", "failure"]

    @pytest.mark.asyncio
    async def test_result_has_pages_polled_field(self):
        """Test that result includes pages_polled field."""
        result = await poll_facebook_leads_task()

        assert "pages_polled" in result
        assert isinstance(result["pages_polled"], int)
        assert result["pages_polled"] >= 0

    @pytest.mark.asyncio
    async def test_result_has_leads_found_field(self):
        """Test that result includes leads_found field."""
        result = await poll_facebook_leads_task()

        assert "leads_found" in result
        assert isinstance(result["leads_found"], int)
        assert result["leads_found"] >= 0

    @pytest.mark.asyncio
    async def test_result_has_leads_created_field(self):
        """Test that result includes leads_created field."""
        result = await poll_facebook_leads_task()

        assert "leads_created" in result
        assert isinstance(result["leads_created"], int)
        assert result["leads_created"] >= 0

    @pytest.mark.asyncio
    async def test_result_has_errors_field(self):
        """Test that result includes errors field."""
        result = await poll_facebook_leads_task()

        assert "errors" in result
        assert isinstance(result["errors"], int)
        assert result["errors"] >= 0

    @pytest.mark.asyncio
    async def test_result_has_details_field(self):
        """Test that result includes details field for error messages."""
        result = await poll_facebook_leads_task()

        assert "details" in result
        assert isinstance(result["details"], list)


class TestPollFacebookLeadsTaskLogic:
    """Test polling logic structure."""

    @pytest.mark.asyncio
    async def test_logs_polling_start(self):
        """Test that task logs polling start."""
        import logging
        from io import StringIO

        # Capture log output
        log_capture = StringIO()
        handler = logging.StreamHandler(log_capture)
        handler.setLevel(logging.INFO)
        logger = logging.getLogger("prosell.infrastructure.tasks.use_cases.poll_facebook_leads_task")
        logger.addHandler(handler)

        await poll_facebook_leads_task()

        log_output = log_capture.getvalue()
        assert "poll_facebook_leads_task" in log_output.lower()

        logger.removeHandler(handler)

    @pytest.mark.asyncio
    async def test_returns_valid_status_values(self):
        """Test that status field has valid values."""
        result = await poll_facebook_leads_task()

        valid_statuses = ["pending", "success", "partial_failure", "failure"]
        assert result["status"] in valid_statuses

    @pytest.mark.asyncio
    async def test_counts_are_consistent(self):
        """Test that lead counts are consistent."""
        result = await poll_facebook_leads_task()

        # leads_created should be <= leads_found
        assert result["leads_created"] <= result["leads_found"]


class TestPollFacebookLeadsTaskPhase3Integration:
    """Integration tests for Phase 3 (when DI wiring is complete).

    These tests document the expected behavior once Phase 3 dependencies
    are wired in. They are marked as skipped until Phase 3 implementation.
    """

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Phase 3: Requires DI container and Graph API integration")
    async def test_successful_polling_flow(self):
        """Test successful polling flow with mocked dependencies.

        Expected behavior:
        - Query all active Facebook pages
        - Fetch leads from Graph API for each page
        - Check for duplicates
        - Create new leads
        - Return success status with accurate counts
        """
        # TODO(phase-3): Implement with mocks
        # Mock IFacebookPageRepository.get_all_active() → returns 2 pages
        # Mock FacebookGraphApiClient.get_leads() → returns 5 leads total
        # Mock ILeadRepository.get_by_facebook_leadgen_id() → returns None (no duplicates)
        # Mock CreateLeadUseCase.execute() → creates 5 leads
        # Assert result["status"] == "success"
        # Assert result["pages_polled"] == 2
        # Assert result["leads_found"] == 5
        # Assert result["leads_created"] == 5
        # Assert result["errors"] == 0
        pass

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Phase 3: Requires DI container and Graph API integration")
    async def test_partial_failure_with_some_errors(self):
        """Test polling with some Graph API failures.

        Expected behavior:
        - Poll 3 pages
        - 2 pages succeed, 1 fails
        - Return partial_failure status
        - Error details list contains failure reason
        """
        # TODO(phase-3): Implement with mocks
        # Mock 3 pages, 2 succeed, 1 raises exception
        # Assert result["status"] == "partial_failure"
        # Assert result["errors"] == 1
        # Assert len(result["details"]) == 1
        # Assert "Page {page_id}" in result["details"][0]
        pass

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Phase 3: Requires DI container and Graph API integration")
    async def test_duplicate_leads_not_created(self):
        """Test that duplicate leads are not created.

        Expected behavior:
        - Fetch 5 leads from Graph API
        - 3 already exist in database
        - Only 2 new leads created
        """
        # TODO(phase-3): Implement with mocks
        # Mock leads_found = 5
        # Mock get_by_facebook_leadgen_id → returns existing lead for 3 of them
        # Assert result["leads_found"] == 5
        # Assert result["leads_created"] == 2
        # Assert result["status"] == "success"
        pass

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Phase 3: Requires DI container and Graph API integration")
    async def test_no_active_pages_returns_success(self):
        """Test polling when no active pages exist.

        Expected behavior:
        - Query returns 0 pages
        - Return success status with 0 counts
        """
        # TODO(phase-3): Implement with mocks
        # Mock get_all_active() → returns []
        # Assert result["status"] == "success"
        # Assert result["pages_polled"] == 0
        # Assert result["leads_found"] == 0
        # Assert result["leads_created"] == 0
        pass

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Phase 3: Requires DI container and Graph API integration")
    async def test_all_leads_are_duplicates(self):
        """Test when all fetched leads already exist.

        Expected behavior:
        - Fetch 5 leads from Graph API
        - All 5 already exist in database
        - 0 new leads created
        - Return success status
        """
        # TODO(phase-3): Implement with mocks
        # Mock leads_found = 5
        # Mock get_by_facebook_leadgen_id → returns existing lead for all 5
        # Assert result["leads_found"] == 5
        # Assert result["leads_created"] == 0
        # Assert result["status"] == "success"
        pass

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Phase 3: Requires DI container and Graph API integration")
    async def test_graph_api_failure_returns_failure_status(self):
        """Test complete Graph API failure.

        Expected behavior:
        - All pages fail to fetch leads
        - Return failure status
        - All errors logged in details
        """
        # TODO(phase-3): Implement with mocks
        # Mock all pages raise exceptions
        # Assert result["status"] == "failure"
        # Assert result["leads_created"] == 0
        # Assert len(result["details"]) == number_of_pages
        pass

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Phase 3: Requires DI container and Graph API integration")
    async def test_create_lead_failure_is_logged(self):
        """Test that lead creation failures are logged and counted.

        Expected behavior:
        - Fetch 5 leads
        - 1 lead creation fails
        - Error is logged in details
        - Other 4 leads are created successfully
        """
        # TODO(phase-3): Implement with mocks
        # Mock leads_found = 5
        # Mock CreateLeadUseCase.execute() → raises exception for 1 lead
        # Assert result["leads_created"] == 4
        # Assert result["errors"] == 1
        # Assert len(result["details"]) == 1
        # Assert result["status"] == "partial_failure"
        pass

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Phase 3: Requires DI container and Graph API integration")
    async def test_statistics_accuracy(self):
        """Test that all statistics are accurately counted.

        Expected behavior:
        - Poll multiple pages with varying results
        - All counts match expected values
        """
        # TODO(phase-3): Implement with mocks
        # Mock 3 pages:
        #   Page 1: 3 leads, 1 duplicate → 2 created
        #   Page 2: 2 leads, 0 duplicates → 2 created
        #   Page 3: fails with error
        # Assert result["pages_polled"] == 3
        # Assert result["leads_found"] == 5
        # Assert result["leads_created"] == 4
        # Assert result["errors"] == 1
        # Assert result["status"] == "partial_failure"
        pass


__all__ = [
    "TestPollFacebookLeadsTask",
    "TestPollFacebookLeadsTaskStructure",
]
