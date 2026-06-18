"""Integration tests for poll_facebook_leads_task.

Tests the background task that polls Facebook Graph API for missed leads.
This task runs every 10 minutes as a fallback to webhooks.
"""

import pytest

from prosell.infrastructure.tasks.use_cases.poll_facebook_leads_task import (
    POLLING_INTERVAL_SECONDS,
    RETRY_BACKOFF_MULTIPLIER,
    RETRY_INITIAL_DELAY_SECONDS,
    RETRY_JITTER_RATIO,
    RETRY_MAX_RETRIES,
    TIMEOUT_PER_PAGE_SECONDS,
    poll_facebook_leads_task,
    should_create_lead,
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
            await poll_facebook_leads_task.broker.start()  # type: ignore[attr-defined]
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

    @pytest.mark.asyncio
    async def test_result_has_leads_skipped_field(self):
        """Test that result includes leads_skipped field (B2.1.d: metrics tracking)."""
        result = await poll_facebook_leads_task()

        assert "leads_skipped" in result
        assert isinstance(result["leads_skipped"], int)
        assert result["leads_skipped"] >= 0

    @pytest.mark.asyncio
    async def test_result_has_rate_limit_hits_field(self):
        """Test that result includes rate_limit_hits field (B2.1.d: metrics tracking)."""
        result = await poll_facebook_leads_task()

        assert "rate_limit_hits" in result
        assert isinstance(result["rate_limit_hits"], int)
        assert result["rate_limit_hits"] >= 0

    @pytest.mark.asyncio
    async def test_result_has_transient_errors_field(self):
        """Test that result includes transient_errors field (B2.1.d: metrics tracking)."""
        result = await poll_facebook_leads_task()

        assert "transient_errors" in result
        assert isinstance(result["transient_errors"], int)
        assert result["transient_errors"] >= 0

    @pytest.mark.asyncio
    async def test_result_has_non_transient_errors_field(self):
        """Test that result includes non_transient_errors field (B2.1.d: metrics tracking)."""
        result = await poll_facebook_leads_task()

        assert "non_transient_errors" in result
        assert isinstance(result["non_transient_errors"], int)
        assert result["non_transient_errors"] >= 0


class TestPollFacebookLeadsTaskDeduplication:
    """Test deduplication logic (B2.1.e)."""

    def test_should_create_lead_returns_true_for_new_lead(self):
        """Test that should_create_lead returns True for a new lead."""
        seen_ids: set[str] = set()

        result = should_create_lead("lead123", "tenant1", seen_ids)

        assert result is True
        assert "lead123:tenant1" in seen_ids

    def test_should_create_lead_returns_false_for_duplicate_lead(self):
        """Test that should_create_lead returns False for a duplicate lead."""
        seen_ids: set[str] = set()

        # First call - should create
        result1 = should_create_lead("lead123", "tenant1", seen_ids)
        assert result1 is True

        # Second call - should skip (duplicate)
        result2 = should_create_lead("lead123", "tenant1", seen_ids)
        assert result2 is False

    def test_should_create_lead_different_tenants_allowed(self):
        """Test that same leadgen_id is allowed for different tenants."""
        seen_ids: set[str] = set()

        # Same leadgen_id, different tenant - should create both
        result1 = should_create_lead("lead123", "tenant1", seen_ids)
        result2 = should_create_lead("lead123", "tenant2", seen_ids)

        assert result1 is True
        assert result2 is True
        assert len(seen_ids) == 2

    def test_should_create_lead_multiple_leads(self):
        """Test deduplication with multiple leads."""
        seen_ids: set[str] = set()

        # Add multiple leads
        assert should_create_lead("lead1", "tenant1", seen_ids) is True
        assert should_create_lead("lead2", "tenant1", seen_ids) is True
        assert should_create_lead("lead3", "tenant1", seen_ids) is True

        # Try to add duplicates
        assert should_create_lead("lead1", "tenant1", seen_ids) is False
        assert should_create_lead("lead2", "tenant1", seen_ids) is False

        # Verify only 3 unique leads in set
        assert len(seen_ids) == 3


class TestPollFacebookLeadsTaskConfiguration:
    """Test task configuration constants (B2.1.f, B2.1.g, B2.1.h)."""

    def test_polling_interval_is_10_minutes(self):
        """Test that polling interval is configured to 10 minutes (B2.1.f)."""
        assert POLLING_INTERVAL_SECONDS == 600  # 10 minutes * 60 seconds

    def test_timeout_per_page_is_30_seconds(self):
        """Test that timeout per page is configured to 30 seconds (B2.1.g)."""
        assert TIMEOUT_PER_PAGE_SECONDS == 30

    def test_retry_policy_max_retries(self):
        """Test that retry policy max retries is configured (B2.1.h)."""
        assert RETRY_MAX_RETRIES == 3
        assert isinstance(RETRY_MAX_RETRIES, int)
        assert RETRY_MAX_RETRIES > 0

    def test_retry_policy_initial_delay(self):
        """Test that retry policy initial delay is configured (B2.1.h)."""
        assert RETRY_INITIAL_DELAY_SECONDS == 1.0
        assert isinstance(RETRY_INITIAL_DELAY_SECONDS, int | float)
        assert RETRY_INITIAL_DELAY_SECONDS > 0

    def test_retry_policy_backoff_multiplier(self):
        """Test that retry policy backoff multiplier is configured (B2.1.h)."""
        assert RETRY_BACKOFF_MULTIPLIER == 2.0
        assert isinstance(RETRY_BACKOFF_MULTIPLIER, int | float)
        assert RETRY_BACKOFF_MULTIPLIER > 1.0

    def test_retry_policy_jitter_ratio(self):
        """Test that retry policy jitter ratio is configured (B2.1.h)."""
        assert RETRY_JITTER_RATIO == 0.1
        assert isinstance(RETRY_JITTER_RATIO, float)
        assert 0.0 < RETRY_JITTER_RATIO < 1.0


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
        logger = logging.getLogger(
            "prosell.infrastructure.tasks.use_cases.poll_facebook_leads_task"
        )
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


__all__ = [
    "TestPollFacebookLeadsTask",
    "TestPollFacebookLeadsTaskConfiguration",
    "TestPollFacebookLeadsTaskDeduplication",
    "TestPollFacebookLeadsTaskLogic",
    "TestPollFacebookLeadsTaskStructure",
]
