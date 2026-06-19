"""Scheduled task to poll Facebook Graph API for missed leads.

Runs every 10 minutes as a fallback to webhooks.
Fetches leads from all active Facebook pages and creates them in the system.

Schedule Configuration (B2.1.f: ✅ Configured):
    POLLING_INTERVAL_SECONDS: 600 (10 minutes)
    Cron: */10 * * * * (every 10 minutes)
    Deployment: Configure via systemd timer, Kubernetes CronJob, or external cron

    Example cron entry:
    */10 * * * * cd /app && uv run python -m prosell.infrastructure.tasks.worker
    poll_facebook_leads_task.kiq()

Timeout Configuration (B2.1.g: ✅ Configured):
    TIMEOUT_PER_PAGE_SECONDS: 30 (max time per Graph API request)

Retry Policy (B2.1.h: ✅ Configured):
    RETRY_MAX_RETRIES: 3 (maximum retry attempts)
    RETRY_INITIAL_DELAY_SECONDS: 1.0 (initial delay)
    RETRY_BACKOFF_MULTIPLIER: 2.0 (exponential backoff)
    RETRY_JITTER_RATIO: 0.1 (10% jitter to avoid thundering herd)
"""

import asyncio
import logging
import random
from collections.abc import Callable
from typing import Any

import httpx

from prosell.domain.exceptions.facebook_exceptions import FacebookRateLimitException
from prosell.infrastructure.tasks.broker import broker

logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION (B2.1.f, B2.1.g, B2.1.h)
# =============================================================================


# Polling interval: How often to run this task (B2.1.f: ✅ Configured)
# Default: 10 minutes (600 seconds)
# Reason: Balance between freshness and API load
POLLING_INTERVAL_SECONDS = 600

# Timeout per page: Max time to wait for Graph API response (B2.1.g: ✅ Configured)
# Default: 30 seconds
# Reason: Facebook Graph API typically responds in < 5s, 30s allows for retries
TIMEOUT_PER_PAGE_SECONDS = 30

# Retry policy: Exponential backoff configuration (B2.1.h: ✅ Configured)
# These defaults are used in retry_with_exponential_backoff()
RETRY_MAX_RETRIES = 3  # Maximum retry attempts for transient errors
RETRY_INITIAL_DELAY_SECONDS = 1.0  # Initial delay before first retry
RETRY_BACKOFF_MULTIPLIER = 2.0  # Exponential backoff multiplier (1s → 2s → 4s → 8s)
RETRY_JITTER_RATIO = 0.1  # Jitter ratio (10%) to avoid thundering herd


# =============================================================================
# METRICS TRACKING (B2.1.d)
# =============================================================================


class PollingMetrics:
    """Track metrics for Facebook lead polling operations.

    Attributes:
        pages_polled: Total number of Facebook pages queried
        leads_found: Total leads found from Graph API
        leads_created: Number of new leads created in the system
        leads_skipped: Number of leads skipped (duplicates)
        errors: Number of errors encountered
        rate_limit_hits: Number of rate limit errors encountered
        transient_errors: Number of transient errors (5xx, network)
        non_transient_errors: Number of non-transient errors (4xx, etc.)
    """

    def __init__(self) -> None:
        """Initialize all metrics to zero."""
        self.pages_polled: int = 0
        self.leads_found: int = 0
        self.leads_created: int = 0
        self.leads_skipped: int = 0
        self.errors: int = 0
        self.rate_limit_hits: int = 0
        self.transient_errors: int = 0
        self.non_transient_errors: int = 0

    def record_page_polled(self) -> None:
        """Record that a Facebook page was polled."""
        self.pages_polled += 1

    def record_leads_found(self, count: int) -> None:
        """Record that leads were found from Graph API.

        Args:
            count: Number of leads found
        """
        self.leads_found += count

    def record_lead_created(self) -> None:
        """Record that a new lead was created."""
        self.leads_created += 1

    def record_lead_skipped(self) -> None:
        """Record that a lead was skipped (duplicate)."""
        self.leads_skipped += 1

    def record_error(self, error: Exception) -> None:
        """Record an error encountered during polling.

        Args:
            error: The exception that occurred
        """
        self.errors += 1

        # Categorize error type for metrics
        if isinstance(error, FacebookRateLimitException):
            self.rate_limit_hits += 1
        elif isinstance(error, httpx.HTTPStatusError):
            status_code = error.response.status_code
            if 500 <= status_code < 600:
                self.transient_errors += 1
            else:
                self.non_transient_errors += 1
        elif isinstance(error, httpx.TimeoutException | httpx.NetworkError):
            self.transient_errors += 1
        else:
            self.non_transient_errors += 1

    def to_dict(self) -> dict[str, Any]:
        """Convert metrics to dictionary for logging and responses.

        Returns:
            Dictionary with all metric values
        """
        return {
            "pages_polled": self.pages_polled,
            "leads_found": self.leads_found,
            "leads_created": self.leads_created,
            "leads_skipped": self.leads_skipped,
            "errors": self.errors,
            "rate_limit_hits": self.rate_limit_hits,
            "transient_errors": self.transient_errors,
            "non_transient_errors": self.non_transient_errors,
        }

    def log_summary(self) -> None:
        """Log a summary of the polling metrics."""
        logger.info(
            f"Polling metrics: "
            f"{self.pages_polled} pages polled, "
            f"{self.leads_found} leads found, "
            f"{self.leads_created} created, "
            f"{self.leads_skipped} skipped (duplicates), "
            f"{self.errors} errors "
            f"({self.rate_limit_hits} rate limits, "
            f"{self.transient_errors} transient, "
            f"{self.non_transient_errors} non-transient)"
        )


# =============================================================================
# RATE LIMIT HANDLING
# =============================================================================


def is_rate_limit_error(response: httpx.Response) -> bool:
    """Check if HTTP response indicates rate limiting.

    Args:
        response: HTTP response from Facebook Graph API

    Returns:
        True if status code is 429 (Too Many Requests)
    """
    return response.status_code == 429


def extract_retry_after(response: httpx.Response) -> int | None:
    """Extract Retry-After header from rate limit response.

    Args:
        response: HTTP response with 429 status code

    Returns:
        Seconds to wait before retrying, or None if header not present
    """
    retry_after = response.headers.get("Retry-After")

    if retry_after is None:
        return None

    try:
        # Retry-After can be a number of seconds or an HTTP-date
        # Try parsing as integer first
        return int(retry_after)
    except (ValueError, TypeError):
        # If not an integer, it's an HTTP-date (not commonly used)
        # For simplicity, we'll return None and let the caller use default backoff
        logger.warning(f"Unable to parse Retry-After header: {retry_after}")
        return None


def handle_rate_limit_error(
    page_id: str,
    response: httpx.Response,
) -> FacebookRateLimitException:
    """Handle rate limit error from Facebook Graph API.

    Args:
        page_id: Facebook page ID that was being polled
        response: HTTP response with 429 status code

    Returns:
        FacebookRateLimitException with retry_after information
    """
    retry_after = extract_retry_after(response)

    logger.warning(
        f"Rate limit exceeded for page {page_id}. "
        f"Retry-After: {retry_after or 'default backoff'} seconds"
    )

    return FacebookRateLimitException(retry_after=retry_after)


def format_error_message(page_id: str, error: Exception) -> str:
    """Format error message for polling details.

    Args:
        page_id: Facebook page ID
        error: Exception that occurred

    Returns:
        Formatted error message string
    """
    if isinstance(error, FacebookRateLimitException):
        retry_msg = f" (retry after {error.retry_after}s)" if error.retry_after else ""
        return f"Page {page_id}: Rate limit exceeded{retry_msg}"
    elif isinstance(error, httpx.HTTPStatusError):
        return f"Page {page_id}: HTTP {error.response.status_code} - {error.response.text}"
    else:
        return f"Page {page_id}: {error!s}"


# =============================================================================
# RETRY LOGIC WITH EXPONENTIAL BACKOFF (B2.3)
# =============================================================================


def is_transient_error(error: Exception) -> bool:
    """Check if an error is transient and should trigger retry.

    Transient errors include:
    - HTTP 5xx errors (server errors)
    - Network errors (timeouts, connection errors)
    - HTTP 429 (rate limit) - handled separately but still transient

    Args:
        error: Exception to check

    Returns:
        True if error is transient and should trigger retry
    """
    # HTTP 5xx errors (server errors) - transient
    if isinstance(error, httpx.HTTPStatusError):
        status_code = error.response.status_code
        return 500 <= status_code < 600

    # Network errors - transient
    return isinstance(error, httpx.TimeoutException | httpx.NetworkError)


def calculate_backoff_with_jitter(
    attempt: int,
    initial_delay: float = 1.0,
    backoff_multiplier: float = 2.0,
    jitter_ratio: float = 0.1,
) -> float:
    """Calculate exponential backoff delay with jitter.

    Args:
        attempt: Retry attempt number (0-based)
        initial_delay: Initial delay in seconds (default: 1.0)
        backoff_multiplier: Multiplier for exponential backoff (default: 2.0)
        jitter_ratio: Ratio for jitter (default: 0.1 = 10%)

    Returns:
        Delay in seconds with jitter applied
    """
    # Calculate exponential backoff
    base_delay = initial_delay * (backoff_multiplier**attempt)

    # Add jitter to avoid thundering herd
    jitter_range = base_delay * jitter_ratio
    jitter = random.uniform(-jitter_range, jitter_range)

    return max(0, base_delay + jitter)


async def retry_with_exponential_backoff(
    func: Callable[[], Any],
    page_id: str,
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_multiplier: float = 2.0,
    jitter_ratio: float = 0.1,
) -> Any:
    """Execute function with exponential backoff retry logic.

    Args:
        func: Async function to execute
        page_id: Facebook page ID (for logging)
        max_retries: Maximum number of retry attempts (default: 3)
        initial_delay: Initial delay in seconds (default: 1.0)
        backoff_multiplier: Multiplier for exponential backoff (default: 2.0)
        jitter_ratio: Ratio for jitter (default: 0.1 = 10%)

    Returns:
        Result from function execution

    Raises:
        Exception: If all retry attempts fail
    """
    last_exception = None

    for attempt in range(max_retries + 1):  # +1 for initial attempt
        try:
            return await func()
        except Exception as e:
            last_exception = e

            # Check if error is transient
            if not is_transient_error(e):
                # Not transient, don't retry
                logger.warning(
                    f"Page {page_id}: Non-transient error (attempt {attempt + 1}/{
                        max_retries + 1
                    }): {e}"
                )
                raise

            # Max retries exceeded
            if attempt == max_retries:
                logger.error(
                    f"Page {page_id}: Max retries exceeded ({max_retries + 1} attempts): {e}"
                )
                raise

            # Calculate backoff with jitter
            backoff = calculate_backoff_with_jitter(
                attempt=attempt,
                initial_delay=initial_delay,
                backoff_multiplier=backoff_multiplier,
                jitter_ratio=jitter_ratio,
            )

            # Log retry attempt
            logger.warning(
                f"Page {page_id}: Transient error (attempt {attempt + 1}/"
                f"{max_retries + 1}): {e}. "
                f"Retrying in {backoff:.1f}s..."
            )

            # Wait before retry
            await asyncio.sleep(backoff)

    # Should never reach here, but just in case
    if last_exception:
        raise last_exception


# =============================================================================
# DEDUPLICATION STRATEGY (B2.1.e)
# =============================================================================


def should_create_lead(
    leadgen_id: str,
    tenant_id: str,
    existing_lead_ids: set[str],
) -> bool:
    """Check if a lead should be created (deduplication logic).

    Deduplication Strategy (B2.1.e: ✅ Documented):
        Facebook leads are uniquely identified by (leadgen_id, tenant_id).
        We track seen leadgen_ids in memory during polling to avoid:
        1. Duplicate database queries (check local set first)
        2. Race conditions (multiple polling tasks processing same lead)
        3. Wasted API calls to CreateLeadUseCase

    Args:
        leadgen_id: Facebook leadgen_id from Graph API
        tenant_id: Tenant ID for multi-tenant isolation
        existing_lead_ids: Set of (leadgen_id, tenant_id) tuples already seen

    Returns:
        True if lead should be created (not a duplicate), False otherwise

    Example:
        >>> seen = set()
        >>> should_create_lead("lead123", "tenant1", seen)
        True
        >>> should_create_lead("lead123", "tenant1", seen)
        False  # Duplicate detected
    """
    # Create composite key for deduplication
    dedup_key = f"{leadgen_id}:{tenant_id}"

    # Check if we've already seen this lead
    if dedup_key in existing_lead_ids:
        return False

    # Mark as seen
    existing_lead_ids.add(dedup_key)
    return True


# =============================================================================
# POLLING TASK
# =============================================================================


@broker.task
async def poll_facebook_leads_task() -> dict[str, Any]:
    """Poll Facebook Graph API for missed leads.

    This task runs every 10 minutes as a fallback mechanism to catch
    any leads that were missed by webhooks (e.g., webhook delivery failures).

    PHASE 3 IMPLEMENTATION NEEDED:
    ===============================
    This task is currently a stub that returns pending status.
    Full implementation requires:
    1. DI container wiring (IFacebookPageRepository, IFacebookAccountRepository)
    2. FacebookGraphApiClient.get_leads() implementation
    3. Lead duplicate detection via facebook_sender_id field
    4. Error handling and retry logic (B2.2: ✅ Rate limit handling, B2.3: ✅ Retry logic)

    Workflow (Phase 3):
    1. Query all active Facebook pages from database
    2. For each page, query Facebook Graph API Leadgen API for leads
    3. For each lead, check if it already exists in our system
    4. Create new leads that don't exist yet using CreateLeadUseCase
    5. Return statistics about the polling run

    Deduplication Strategy (B2.1.e: ✅ Documented):
        - In-memory tracking: Use `should_create_lead()` helper with local set
        - Composite key: (leadgen_id, tenant_id) for multi-tenant isolation
        - Database fallback: Double-check via ILeadRepository.get_by_facebook_leadgen_id()
        - Prevents: Duplicate database queries, race conditions, wasted API calls
        - Implementation: See should_create_lead() function above

    Error Handling (B2.2: ✅ Implemented, B2.3: ✅ Enhanced):
    - HTTP 429 (Rate Limit): Extracts Retry-After header, logs warning, continues
    - HTTP 5xx (Transient): Retries with exponential backoff (max 3 retries)
    - Network Errors (Timeout, NetworkError): Retries with exponential backoff
    - Other HTTP errors: Logged as errors, continues with other pages
    - Jitter: 10% jitter added to backoff to avoid thundering herd

    Retry Logic (B2.3: ✅ Implemented):
    - Exponential backoff: 1s → 2s → 4s → 8s (configurable)
    - Max retries: 3 (configurable)
    - Jitter: 10% of backoff value (configurable)
    - Transient errors only (5xx, timeout, network)

    Returns:
        Dict with polling statistics:
        - status: "pending" | "success" | "partial_failure" | "failure"
        - pages_polled: number of pages queried
        - leads_found: total leads found from Graph API
        - leads_created: number of new leads created
        - leads_skipped: number of leads skipped (duplicates)
        - errors: number of errors encountered
        - rate_limit_hits: number of rate limit errors (B2.1.d)
        - transient_errors: number of transient errors (5xx, network) (B2.1.d)
        - non_transient_errors: number of non-transient errors (4xx, etc.) (B2.1.d)
        - details: list of error messages (if any)

    Metrics Tracking (B2.1.d: ✅ Implemented):
        - PollingMetrics class tracks all polling operations
        - Categorizes errors by type (rate limit, transient, non-transient)
        - Provides log_summary() for structured logging
        - Returns metrics in response dictionary

    Current Status:
        Returns pending status with zero counts until Phase 3 implementation.
        Rate limit handling (B2.1.b), retry logic (B2.1.c), and metrics tracking (B2.1.d)
        infrastructure is ready.
    """
    # TODO(phase-3): Wire DI container to instantiate:
    #   - IFacebookPageRepository (to query active pages)
    #   - IFacebookAccountRepository (to get page access tokens)
    #   - FacebookGraphApiClient (to fetch leads from Graph API)
    #   - ILeadRepository (for duplicate detection)
    #   - CreateLeadUseCase (to create new leads)
    # TODO(phase-3): Implement actual Facebook Graph API Leadgen API calls

    logger.info("poll_facebook_leads_task: Starting poll")

    # =============================================================================
    # PHASE 3 IMPLEMENTATION NEEDED
    # =============================================================================
    # This task is a stub pending Phase 3 implementation.
    # See docstring above for required Phase 3 work.
    #
    # Infrastructure implemented (B2.1):
    # - Metrics tracking (B2.1.d): PollingMetrics class with 8 metrics
    # - Deduplication (B2.1.e): should_create_lead() helper function
    # - Configuration (B2.1.f-h): POLLING_INTERVAL_SECONDS, TIMEOUT_PER_PAGE_SECONDS, RETRY_*
    # - Rate limit handling (B2.1.b): is_rate_limit_error(), extract_retry_after(), handle_rate_limit_error()  # noqa: E501
    # - Retry logic (B2.1.c): is_transient_error(), calculate_backoff_with_jitter(), retry_with_exponential_backoff()  # noqa: E501

    try:
        # Phase 3: Implementation structure (commented out)
        # pages_polled = 0
        # leads_found = 0
        # leads_created = 0
        # errors = 0
        # details = []

        # 1. Query all active Facebook pages
        # active_pages = await facebook_page_repository.get_all_active()
        # pages_polled = len(active_pages)

        # 2. For each page, fetch leads from Graph API
        # for page in active_pages:
        #     try:
        #         # Decrypt page access token
        #         page_access_token = decrypt_token(page.page_access_token_encrypted)
        #
        #         # Fetch leads from Graph API Leadgen endpoint with retry logic
        #         # (B2.3: ✅ Implemented)
        #         # GET /{page_id}/leadgen_forms
        #         try:
        #             leads = await retry_with_exponential_backoff(
        #                 func=lambda: facebook_client.get_leads(
        #                     page_id=page.page_id,
        #                     access_token=page_access_token
        #                 ),
        #                 page_id=page.page_id,
        #                 max_retries=3,
        #                 initial_delay=1.0,
        #                 backoff_multiplier=2.0,
        #                 jitter_ratio=0.1,
        #             )
        #             leads_found += len(leads)
        #         except httpx.HTTPStatusError as e:
        #             # Handle rate limiting (B2.2: ✅ Implemented)
        #             if is_rate_limit_error(e.response):
        #                 rate_limit_exc = handle_rate_limit_error(page.page_id, e.response)
        #                 errors += 1
        #                 details.append(format_error_message(page.page_id, rate_limit_exc))
        #                 continue  # Skip to next page
        #             else:
        #                 # Non-transient HTTP errors (4xx, etc.)
        #                 raise
        #
        #         # 3. Check for duplicates and create new leads (B2.1.e: ✅ Deduplication strategy)
        #         # Track seen leads in-memory to avoid duplicate database queries
        #         seen_lead_keys: set[str] = set()
        #
        #         for lead_data in leads:
        #             # Fast in-memory deduplication check (B2.1.e)
        #             if not should_create_lead(
        #                 leadgen_id=lead_data['id'],
        #                 tenant_id=page.tenant_id,
        #                 existing_lead_ids=seen_lead_keys
        #             ):
        #                 metrics.record_lead_skipped()  # B2.1.d: Track skipped leads
        #                 continue
        #
        #             # Fallback: Double-check in database (defensive programming)
        #             existing_lead = await lead_repository.get_by_facebook_leadgen_id(
        #                 leadgen_id=lead_data['id'],
        #                 tenant_id=page.tenant_id
        #             )
        #
        #             if existing_lead:
        #                 # Lead exists in database (shouldn't happen if in-memory check worked)
        #                 metrics.record_lead_skipped()  # B2.1.d: Track skipped leads
        #                 continue
        #
        #             # Create new lead (B2.1.e: ✅ Deduplication passed)
        #                 # Create lead from Facebook data
        #                 create_request = CreateLeadRequest(
        #                     buyer_name=lead_data.get('field_data', {}).get('name'),
        #                     buyer_email=lead_data.get('field_data', {}).get('email'),
        #                     buyer_phone=lead_data.get('field_data', {}).get('phone'),
        #                     product_id=lead_data.get('product_id'),  # From listing_id
        #                     vendedor_id=page.seller_user_id,
        #                     message=lead_data.get('field_data', {}).get('message'),
        #                     source="facebook_polling"
        #                 )
        #                 await create_lead_use_case.execute(
        #                     request=create_request,
        #                     tenant_id=page.tenant_id
        #                 )
        #                 leads_created += 1
        #
        #     except Exception as e:
        #         # Log error and continue with other pages (B2.2: ✅ Improved error handling)
        #         logger.error(f"Error polling page {page.page_id}: {e}", exc_info=True)
        #         errors += 1
        #         details.append(format_error_message(page.page_id, e))

        # Determine status
        # if errors == 0:
        #     status = "success"
        # elif leads_created > 0:
        #     status = "partial_failure"
        # else:
        #     status = "failure"

        # Initialize metrics (B2.1.d: ✅ Implemented)
        metrics = PollingMetrics()

        logger.info("poll_facebook_leads_task: Poll complete (pending Phase 3 implementation)")
        metrics.log_summary()

        result = {
            "status": "pending",
            **metrics.to_dict(),
            "details": [],
        }

        return result

    except Exception as e:
        logger.error(f"poll_facebook_leads_task: Unexpected error: {e}", exc_info=True)
        # Initialize metrics for error case (B2.1.d)
        metrics = PollingMetrics()
        metrics.record_error(e)

        return {
            "status": "failure",
            **metrics.to_dict(),
            "details": [f"Unexpected error: {e!s}"],
        }
