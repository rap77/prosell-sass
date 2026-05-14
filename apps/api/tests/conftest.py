"""
Pytest configuration and fixtures for ProSell SaaS API testing.

This module provides:
1. Database session fixtures with automatic cleanup
2. Test data seeding and cleanup utilities
3. Transaction-based test isolation
4. Mock services for testing
"""

import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from pathlib import Path
import shutil
import tempfile

from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from prosell.core.config import get_settings
from prosell.infrastructure.database.session import async_session_maker


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_database_url() -> str:
    """Get test database URL with isolation for each test run."""
    settings = get_settings()

    # Use test database or create isolated test database
    if hasattr(settings, 'TEST_DATABASE_URL'):
        return settings.TEST_DATABASE_URL
    else:
        # Create temporary database for testing
        base_url = settings.database_url
        test_db_name = "prosell_test_temp"

        # Extract base URL components
        import urllib.parse
        parsed = urllib.parse.urlparse(base_url)
        test_url = parsed._replace(
            database=test_db_name,
            path=f"/{test_db_name}"
        ).geturl()

        return test_url


@pytest_asyncio.fixture(scope="function")
async def test_db_session(test_database_url: str) -> AsyncGenerator[AsyncSession, None]:
    """
    Create a test database session with automatic cleanup.

    This fixture:
    1. Creates a new database for each test function
    2. Rolls back all changes after the test
    3. Ensures test isolation
    """
    # Create isolated test database
    import urllib.parse
    parsed = urllib.parse.urlparse(test_database_url)

    # Connect to postgres database to create test database
    postgres_url = parsed._replace(
        database="postgres",
        path="/postgres"
    ).geturl()

    # Create test database
    engine = create_engine(postgres_url, poolclass=NullPool)
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        conn.execute(f"DROP DATABASE IF EXISTS {parsed.path[1:]}")
        conn.execute(f"CREATE DATABASE {parsed.path[1:]}")

    # Create async engine for test database
    async_engine = create_async_engine(test_database_url, poolclass=NullPool)

    # Create all tables
    async with async_engine.begin() as conn:
        await conn.run_sync(MetaData().create_all)

    # Create session factory
    async_test_session = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    # Create session
    async with async_test_session() as session:
        try:
            # Begin transaction
            await session.begin()
            yield session

        except Exception as e:
            # Rollback on error
            await session.rollback()
            raise e

        finally:
            # Rollback after test (clean state)
            await session.rollback()

            # Close session
            await session.close()

    # Drop test database
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        conn.execute(f"DROP DATABASE IF EXISTS {parsed.path[1:]}")


@pytest.fixture(scope="function")
def cleanup_temp_dirs():
    """Create temporary directories and clean them up after tests."""
    temp_dirs = []

    def create_temp_dir(prefix: str = "test_") -> Path:
        temp_dir = Path(tempfile.mkdtemp(prefix=prefix))
        temp_dirs.append(temp_dir)
        return temp_dir

    yield create_temp_dir

    # Cleanup all temp directories
    for temp_dir in temp_dirs:
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture(scope="session")
def test_settings():
    """Override settings for testing."""
    original_settings = get_settings()

    # Override test-specific settings
    original_settings.environment = "testing"
    original_settings.debug = True
    original_settings.log_level = "DEBUG"
    original_settings.rate_limit_enabled = True
    original_settings.rate_limit_auth_requests_per_minute = 1000

    yield original_settings

    # Restore original settings
    get_settings().__dict__.update(original_settings.__dict__)


@pytest.fixture(scope="function")
async def seeded_test_db(test_db_session: AsyncSession):
    """
    Database fixture with seeded test data.

    This fixture:
    1. Creates a clean database
    2. Seeds with basic test data
    3. Cleans up after the test
    """
    # Import here to avoid circular imports
    from prosell.infrastructure.database.seeds import init_data

    # Seed initial data
    await init_data(test_db_session)

    yield test_db_session


@pytest.fixture(scope="function")
def mock_external_services():
    """Mock external services for testing."""
    import pytest

    # Mock Redis
    with pytest.MonkeyPatch().context() as m:
        # Mock Redis operations
        mock_redis = {}

        def mock_redis_get(key: str):
            return mock_redis.get(key)

        def mock_redis_set(key: str, value: str, ex: int = None):
            mock_redis[key] = value
            return True

        def mock_redis_delete(key: str):
            if key in mock_redis:
                del mock_redis[key]
            return 1

        # Apply mocks
        m.setattr("redis.Redis", lambda *args, **kwargs: type('MockRedis', (), {
            'get': mock_redis_get,
            'set': mock_redis_set,
            'delete': mock_redis_delete,
            'flushdb': lambda: mock_redis.clear(),
        })())

        yield mock_redis


@pytest.fixture(scope="function")
def test_user_factory():
    """Factory for creating test users."""

    class TestUserFactory:
        def __init__(self):
            self.counter = 0

        def create_user(self, email: str = None, password: str = None, **kwargs):
            """Create a test user with unique email."""
            self.counter += 1
            return {
                "email": email or f"testuser{self.counter}@example.com",
                "password": password or "TestPassword123!",
                "first_name": kwargs.get("first_name", f"Test{self.counter}"),
                "last_name": kwargs.get("last_name", "User"),
                "role": kwargs.get("role", "admin"),
                **kwargs
            }

    return TestUserFactory()


@pytest.fixture(scope="function")
def test_organization_factory():
    """Factory for creating test organizations."""

    class TestOrganizationFactory:
        def __init__(self):
            self.counter = 0

        def create_organization(self, name: str = None, **kwargs):
            """Create a test organization with unique name."""
            self.counter += 1
            return {
                "name": name or f"Test Organization {self.counter}",
                "description": kwargs.get("description", f"Test organization {self.counter}"),
                "owner_email": kwargs.get("owner_email", f"owner{self.counter}@example.com"),
                **kwargs
            }

    return TestOrganizationFactory()


@pytest.fixture(scope="function")
def test_rate_limiter():
    """Mock rate limiter for testing."""

    class MockRateLimiter:
        def __init__(self):
            self.calls = {}
            self.exempt_ips = {"127.0.0.1", "::1"}

        def is_limited(self, identifier: str) -> bool:
            """Check if request is rate limited."""
            if identifier in self.exempt_ips:
                return False

            # Simple counter-based rate limiting
            count = self.calls.get(identifier, 0)
            if count >= 100:  # Allow 100 requests per minute in tests
                return True

            self.calls[identifier] = count + 1
            return False

        def reset(self):
            """Reset rate limiter state."""
            self.calls.clear()

    return MockRateLimiter()