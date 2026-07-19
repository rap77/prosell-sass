"""
Pytest configuration and fixtures for ProSell SaaS API testing.

This module provides:
1. Database session fixtures with automatic cleanup
2. Test data seeding and cleanup utilities
3. Transaction-based test isolation
4. Mock services for testing
"""

import asyncio
import os
import shutil
import tempfile
from collections.abc import AsyncGenerator, Callable, Iterator
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy import create_engine
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Load ONLY the test DB URLs from .env.test BEFORE any Settings import.
# We can't naively load the whole file: pydantic-settings is strict about
# list types (rate_limit_exempt_ips needs JSON, not comma-separated) and
# Literal fields (environment) — loading them all would crash Settings()
# before pytest even gets to run a test. The DB URLs are what we actually
# need; other settings stay at their .env defaults which already work for
# tests. The file lives at apps/api/.env.test (one directory up from this
# conftest).
_ENV_TEST_PATH = Path(__file__).parent.parent / ".env.test"
if _ENV_TEST_PATH.exists():
    for _line in _ENV_TEST_PATH.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#") or "=" not in _line:
            continue
        _k, _, _v = _line.partition("=")
        if _k.strip() not in {"DATABASE_URL", "TEST_DATABASE_URL"}:
            continue
        os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

# Import all models so they register with Base.metadata
import prosell.infrastructure.models  # noqa: E402, F401
from prosell.core.config import Settings, get_settings  # noqa: E402
from prosell.infrastructure.database import session as _db_session  # noqa: E402
from prosell.infrastructure.database.base import Base  # noqa: E402

# Replace the application-level engine with a NullPool one for tests.
# The default engine in prosell.infrastructure.database.session is created
# at module import time and binds its connection pool to whatever event loop
# is active then. Under pytest-asyncio with function-scoped loops the pool
# ends up attached to loop N while tests run on loop N+1, N+2, ... — every
# connection close on a stale loop raises
# `RuntimeError: Event loop is closed` inside SQLAlchemy's greenlet_spawn
# wrapper. NullPool skips pooling entirely (each AsyncSession opens a
# fresh connection bound to the current loop), which is the standard fix
# for this exact pattern. See encode/starlette#1438 for the broader
# middleware context.

_db_session.engine = create_async_engine(
    str(get_settings().database_url),
    poolclass=NullPool,
)
_db_session.async_session_maker = async_sessionmaker(
    _db_session.engine,
    class_=_db_session.AsyncSession,
    expire_on_commit=False,
)

# DDL statements interpolate the test database name as an identifier, which
# cannot be passed as a bound parameter. Quote it through the dialect preparer
# so a hostile or malformed name can never break out of the identifier.
_PG_IDENTIFIER_PREPARER = postgresql.dialect().identifier_preparer


@pytest.fixture(scope="session", autouse=True)
def ensure_jwt_keys() -> None:
    """Generate an ephemeral RSA JWT keypair when none is present.

    The signing keys were removed from version control (they must never live in
    the repo), so a fresh checkout or a CI runner starts with no keys. Tests
    that sign or verify JWTs read them lazily via ``settings.jwt_private_key``
    and fail with ``FileNotFoundError`` if they are missing. Generating a
    throwaway keypair here keeps the suite hermetic without committing secrets.

    No-op when both keys already exist, so a developer's real keys are left
    untouched. The generated keys land in the gitignored ``apps/api/keys/`` dir.
    """
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    settings = get_settings()
    private_path = Path(settings.jwt_private_key_path)
    public_path = Path(settings.jwt_public_key_path)
    if private_path.exists() and public_path.exists():
        return

    private_path.parent.mkdir(parents=True, exist_ok=True)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_path.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    public_path.write_bytes(
        key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )


@pytest.fixture(scope="session")
async def test_database_url() -> str:
    """Get test database URL with isolation for each test run."""
    settings = get_settings()

    # Use test database or create isolated test database
    test_db_url: str | None = getattr(settings, "TEST_DATABASE_URL", None)
    if test_db_url:
        return test_db_url
    else:
        # Create temporary database for testing
        base_url = settings.database_url
        test_db_name = "prosell_test_temp"

        # Extract base URL components
        import urllib.parse

        parsed = urllib.parse.urlparse(base_url)
        test_url = parsed._replace(path=f"/{test_db_name}").geturl()

        return test_url


@pytest_asyncio.fixture(scope="function")
async def test_db_session(test_database_url: str) -> AsyncGenerator[AsyncSession]:
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

    # Connect to the postgres admin database so we can DROP/CREATE the test DB.
    # `parsed.path` is the database name; replace it with `/postgres` (the
    # default admin DB that always exists in a Postgres cluster).
    # ponytail: sync DDL needs sync driver (psycopg2), not asyncpg
    postgres_url = parsed._replace(path="/postgres").geturl()
    postgres_url = postgres_url.replace("postgresql+asyncpg://", "postgresql://")

    from sqlalchemy import text as sa_text

    # Create test database (quote the name so it is a safe SQL identifier)
    db_name = parsed.path[1:]
    quoted_db = _PG_IDENTIFIER_PREPARER.quote(db_name)

    # DDL like DROP/CREATE DATABASE is intentionally run through a sync engine
    # inside run_in_executor so the test's event loop is never blocked. The
    # sync path uses NullPool + AUTOCOMMIT isolation (DDL can't run inside a
    # transaction), which is the standard psycopg2/sqlalchemy pattern.
    loop = asyncio.get_running_loop()

    def _create_test_db() -> None:
        sync_engine = create_engine(postgres_url, poolclass=NullPool)
        with sync_engine.connect() as conn:
            conn.execution_options(isolation_level="AUTOCOMMIT")
            conn.execute(sa_text(f"DROP DATABASE IF EXISTS {quoted_db}"))
            conn.execute(sa_text(f"CREATE DATABASE {quoted_db}"))
        sync_engine.dispose()

    await loop.run_in_executor(None, _create_test_db)

    # Create async engine for test database
    async_engine = create_async_engine(test_database_url, poolclass=NullPool)

    # Create all tables from model definitions
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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

        except BaseException:
            # Rollback on error (broad catch is intentional: the finally block
            # needs to run for ANY exit path, including KeyboardInterrupt).
            # Bare `raise` preserves the original traceback.
            await session.rollback()
            raise

        finally:
            # Rollback after test (clean state)
            await session.rollback()

            # Close session
            await session.close()

    # Drop test database — same executor pattern as the create step above.
    def _drop_test_db() -> None:
        sync_engine = create_engine(postgres_url, poolclass=NullPool)
        with sync_engine.connect() as conn:
            conn.execution_options(isolation_level="AUTOCOMMIT")
            conn.execute(sa_text(f"DROP DATABASE IF EXISTS {quoted_db}"))
        sync_engine.dispose()

    await loop.run_in_executor(None, _drop_test_db)


@pytest.fixture(scope="function")
def cleanup_temp_dirs() -> Iterator[Callable[..., Path]]:
    """Create temporary directories and clean them up after tests."""
    temp_dirs: list[Path] = []

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
def test_settings() -> Iterator[Settings]:
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
    get_settings.cache_clear()  # type: ignore[attr-defined]


@pytest.fixture(scope="function")
async def seeded_test_db(test_db_session: AsyncSession) -> AsyncGenerator[AsyncSession]:
    """Database fixture with seeded test data (stub — seeds module not available)."""
    yield test_db_session


@pytest.fixture(scope="function")
def mock_external_services() -> Iterator[dict[str, str]]:
    """Mock external services for testing."""
    with pytest.MonkeyPatch().context() as m:
        # In-memory Redis stub. Uses a typed class (NOT a lambda-built type()
        # with function attrs) so the methods get bound `self` correctly and
        # pyright can check the signatures.
        mock_redis: dict[str, str] = {}

        class _MockRedis:
            def get(self, key: str) -> str | None:
                return mock_redis.get(key)

            def set(self, key: str, value: str, _ex: int | None = None) -> bool:
                mock_redis[key] = value
                return True

            def delete(self, key: str) -> int:
                mock_redis.pop(key, None)
                return 1

            def flushdb(self) -> None:
                mock_redis.clear()

        def _factory(*_args: object, **_kwargs: object) -> _MockRedis:
            return _MockRedis()

        m.setattr("redis.Redis", _factory)

        yield mock_redis


class UserFactory:
    """Factory for creating test user payloads with unique emails."""

    def __init__(self) -> None:
        self.counter = 0

    def create_user(
        self, email: str | None = None, password: str | None = None, **kwargs: object
    ) -> dict[str, object]:
        """Create a test user with unique email."""
        self.counter += 1
        return {
            "email": email or f"testuser{self.counter}@example.com",
            "password": password or "TestPassword123!",
            "first_name": kwargs.get("first_name", f"Test{self.counter}"),
            "last_name": kwargs.get("last_name", "User"),
            "role": kwargs.get("role", "admin"),
            **kwargs,
        }


@pytest.fixture(scope="function")
def test_user_factory() -> UserFactory:
    """Factory for creating test users."""
    return UserFactory()


class OrganizationFactory:
    """Factory for creating test organization payloads with unique names."""

    def __init__(self) -> None:
        self.counter = 0

    def create_organization(self, name: str | None = None, **kwargs: object) -> dict[str, object]:
        """Create a test organization with unique name."""
        self.counter += 1
        return {
            "name": name or f"Test Organization {self.counter}",
            "description": kwargs.get("description", f"Test organization {self.counter}"),
            "owner_email": kwargs.get("owner_email", f"owner{self.counter}@example.com"),
            **kwargs,
        }


@pytest.fixture(scope="function")
def test_organization_factory() -> OrganizationFactory:
    """Factory for creating test organizations."""
    return OrganizationFactory()


class MockRateLimiter:
    """In-memory rate limiter stub for tests."""

    def __init__(self) -> None:
        self.calls: dict[str, int] = {}
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

    def reset(self) -> None:
        """Reset rate limiter state."""
        self.calls.clear()


@pytest.fixture(scope="function")
def test_rate_limiter() -> MockRateLimiter:
    """Mock rate limiter for testing."""
    return MockRateLimiter()
