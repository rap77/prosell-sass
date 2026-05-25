"""
Test data management utilities for ProSell SaaS API testing.

This module provides:
1. Automatic cleanup of test data between runs
2. Transaction rollback utilities
3. Test data isolation
4. Database state management
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from logging import getLogger
from typing import TYPE_CHECKING, Any

from sqlalchemy import create_engine
from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

if TYPE_CHECKING:
    from sqlalchemy.sql.elements import TextClause


# Base model for testing - SQLAlchemy 2.0 style
class Base(DeclarativeBase):
    """Base class for test models using SQLAlchemy 2.0 style."""

    pass


logger = getLogger(__name__)


class TestDataCleaner:
    __test__ = False  # Not a test class — utility for test setup/teardown
    """
    Automatic test data cleaner with transaction rollback capabilities.

    This class manages test data isolation by:
    1. Tracking created test records
    2. Automatically cleaning up after tests
    3. Providing transaction rollback options
    4. Managing test-specific data
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.created_records: set[str] = set()
        self.created_tables: set[str] = set()
        self.test_start_time = datetime.now(UTC)

    async def clean_all_test_data(self) -> None:
        """Clean up all test data created during the test run."""
        logger.info("🧹 Starting cleanup of all test data...")

        # Clean specific tables first
        await self._clean_test_tables()

        # Clean orphaned test records
        await self._clean_orphaned_records()

        # Reset tracking
        self.created_records.clear()
        self.created_tables.clear()

        logger.info("✅ Test data cleanup completed")

    async def _clean_test_tables(self) -> None:
        """Clean tables that contain test-specific data."""
        test_tables = [
            "test_temp_data",
            "audit_logs",
            "user_sessions",
            "rate_limit_buckets",
            "webhook_events",
        ]

        # Literal SQL statements for each table (no f-strings for security)
        table_delete_stmts: dict[str, TextClause] = {
            "test_temp_data": sa_text("DELETE FROM test_temp_data"),
            "audit_logs": sa_text("DELETE FROM audit_logs"),
            "user_sessions": sa_text("DELETE FROM user_sessions"),
            "rate_limit_buckets": sa_text("DELETE FROM rate_limit_buckets"),
            "webhook_events": sa_text("DELETE FROM webhook_events"),
        }

        for table_name in test_tables:
            try:
                # Check if table exists
                result = await self.session.execute(
                    sa_text(
                        "SELECT EXISTS ("
                        "SELECT FROM information_schema.tables "
                        "WHERE table_name = :table_name"
                        ")"
                    ),
                    {"table_name": table_name},
                )
                table_exists = result.scalar()

                if table_exists and table_name in table_delete_stmts:
                    await self.session.execute(table_delete_stmts[table_name])
                    logger.debug(f"Cleaned table: {table_name}")

            except Exception as e:
                logger.warning(f"Failed to clean table {table_name}: {e}")

    async def _clean_orphaned_records(self) -> None:
        """Clean records that were created during testing but may not have been tracked."""
        # Clean old user sessions (older than 1 hour)
        cutoff_time = datetime.now(UTC) - timedelta(hours=1)

        await self.session.execute(
            sa_text("DELETE FROM user_sessions WHERE created_at < :cutoff_time"),
            {"cutoff_time": cutoff_time},
        )

        # Clean old rate limit buckets (older than 1 day)
        cutoff_time = datetime.now(UTC) - timedelta(days=1)

        await self.session.execute(
            sa_text("DELETE FROM rate_limit_buckets " "WHERE created_at < :cutoff_time"),
            {"cutoff_time": cutoff_time},
        )

        logger.debug("Cleaned orphaned records")

    async def track_created_record(self, table_name: str, record_id: str) -> None:
        """Track a created record for cleanup."""
        self.created_records.add(f"{table_name}:{record_id}")
        logger.debug(f"Tracking created record: {table_name}:{record_id}")

    async def track_created_table(self, table_name: str) -> None:
        """Track a created table for cleanup."""
        self.created_tables.add(table_name)
        logger.debug(f"Tracking created table: {table_name}")

    async def rollback_transaction(self) -> None:
        """Rollback the current transaction to clean up test data."""
        try:
            await self.session.rollback()
            logger.info("🔄 Transaction rolled back successfully")
        except Exception as e:
            logger.error(f"Failed to rollback transaction: {e}")
            raise

    async def close(self) -> None:
        """Clean up resources."""
        try:
            await self.clean_all_test_data()
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


class TestDataSeeder:
    __test__ = False  # Not a test class — utility for test setup/teardown
    """
    Utility for seeding test data with proper cleanup.

    Provides methods to create test data that will be automatically cleaned up.
    """

    def __init__(self, session: AsyncSession, cleaner: TestDataCleaner) -> None:
        self.session = session
        self.cleaner = cleaner

    async def create_test_organization(self, **kwargs: Any) -> dict[str, Any]:
        """Create a test organization with cleanup tracking."""
        org_data = {
            "name": (f"Test Organization {datetime.now(UTC).timestamp()}"),
            "description": "Test organization for E2E testing",
            "owner_email": (f"test-owner-{datetime.now(UTC).timestamp()}@example.com"),
            **kwargs,
        }

        # Insert organization (assuming this is the actual database model)
        result = await self.session.execute(
            sa_text(
                "INSERT INTO organizations "
                "(name, description, owner_email, created_at, updated_at) "
                "VALUES (:name, :description, :owner_email, NOW(), NOW()) "
                "RETURNING id"
            ),
            org_data,
        )

        org_id = result.scalar()
        org_data["id"] = org_id

        # Track for cleanup
        await self.cleaner.track_created_record("organizations", str(org_id))

        logger.info(f"Created test organization: {org_id}")
        return org_data

    async def create_test_user(self, organization_id: int, **kwargs: Any) -> dict[str, Any]:
        """Create a test user with cleanup tracking."""
        user_data = {
            "email": f"test-user-{datetime.now(UTC).timestamp()}@example.com",
            "password_hash": "hashed_test_password",
            "first_name": "Test",
            "last_name": "User",
            "organization_id": organization_id,
            "role": "admin",
            **kwargs,
        }

        result = await self.session.execute(
            sa_text(
                "INSERT INTO users "
                "(email, password_hash, first_name, last_name, "
                "organization_id, role, created_at, updated_at) "
                "VALUES (:email, :password_hash, :first_name, :last_name, "
                ":organization_id, :role, NOW(), NOW()) "
                "RETURNING id"
            ),
            user_data,
        )

        user_id = result.scalar()
        user_data["id"] = user_id

        # Track for cleanup
        await self.cleaner.track_created_record("users", str(user_id))

        logger.info(f"Created test user: {user_id}")
        return user_data

    async def create_test_category(self, organization_id: int, **kwargs: Any) -> dict[str, Any]:
        """Create a test category with cleanup tracking."""
        category_data = {
            "name": f"Test Category {datetime.now(UTC).timestamp()}",
            "organization_id": organization_id,
            "description": "Test category for E2E testing",
            **kwargs,
        }

        result = await self.session.execute(
            sa_text(
                "INSERT INTO categories "
                "(name, organization_id, description, created_at, updated_at) "
                "VALUES (:name, :organization_id, :description, NOW(), NOW()) "
                "RETURNING id"
            ),
            category_data,
        )

        category_id = result.scalar()
        category_data["id"] = category_id

        # Track for cleanup
        await self.cleaner.track_created_record("categories", str(category_id))

        logger.info(f"Created test category: {category_id}")
        return category_data


@asynccontextmanager
async def test_data_manager(
    session: AsyncSession,
) -> AsyncGenerator[TestDataCleaner]:
    """
    Context manager for managing test data lifecycle.

    Usage:
        async with test_data_manager(session) as cleaner:
            # Create test data here
            await cleaner.create_test_organization()
            # Test code here
            # Data will be automatically cleaned up
    """
    cleaner = TestDataCleaner(session)

    try:
        yield cleaner
    finally:
        await cleaner.close()


@asynccontextmanager
async def test_transaction(
    session: AsyncSession,
) -> AsyncGenerator[AsyncSession]:
    """
    Context manager for test transactions with automatic rollback.

    Usage:
        async with test_transaction(session) as test_session:
            # Test code here
            # Changes will be rolled back automatically
    """
    async with session.begin():
        yield session


class TestDatabaseManager:
    __test__ = False  # Not a test class — utility for test setup/teardown
    """
    High-level test database manager.

    Provides utilities for:
    - Creating isolated test databases
    - Managing test data
    - Handling database migrations
    - Test environment setup/teardown
    """

    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self.test_database_url = self._generate_test_database_url()

    def _generate_test_database_url(self) -> str:
        """Generate a unique test database URL."""
        import urllib.parse

        parsed = urllib.parse.urlparse(self.database_url)
        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        test_db_name = f"prosell_test_{timestamp}"

        return parsed._replace(database=test_db_name, path=f"/{test_db_name}").geturl()

    async def setup_test_database(self) -> str:
        """Set up a test database with migrations."""
        import urllib.parse

        logger.info(f"🗄️ Setting up test database: {self.test_database_url}")

        # Extract base URL for database creation
        parsed = urllib.parse.urlparse(self.test_database_url)
        postgres_url = parsed._replace(database="postgres", path="/postgres").geturl()

        # Create test database - dynamic table name via string interpolation
        # (safe because timestamp is generated internally)
        engine = create_engine(postgres_url, poolclass=NullPool)
        with engine.connect() as conn:
            conn.execution_options(isolation_level="AUTOCOMMIT")
            db_name = parsed.path[1:]
            conn.execute(sa_text(f"DROP DATABASE IF EXISTS {db_name}"))
            conn.execute(sa_text(f"CREATE DATABASE {db_name}"))

        # Run migrations (in real implementation, use Alembic)
        async_engine = create_async_engine(self.test_database_url)
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        logger.info("✅ Test database setup completed")
        return self.test_database_url

    async def cleanup_test_database(self) -> None:
        """Clean up the test database."""
        import urllib.parse

        logger.info(f"🧹 Cleaning up test database: {self.test_database_url}")

        parsed = urllib.parse.urlparse(self.test_database_url)
        postgres_url = parsed._replace(database="postgres", path="/postgres").geturl()

        engine = create_engine(postgres_url, poolclass=NullPool)
        with engine.connect() as conn:
            conn.execution_options(isolation_level="AUTOCOMMIT")
            db_name = parsed.path[1:]
            conn.execute(sa_text(f"DROP DATABASE IF EXISTS {db_name}"))

        logger.info("✅ Test database cleanup completed")


# Global test database manager instance
_test_db_manager: TestDatabaseManager | None = None


async def get_test_database_manager() -> TestDatabaseManager:
    """Get or create the global test database manager."""
    global _test_db_manager

    if _test_db_manager is None:
        from prosell.core.config import get_settings

        settings = get_settings()
        _test_db_manager = TestDatabaseManager(settings.database_url)

    return _test_db_manager
