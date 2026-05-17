"""Fixtures for bulk upload integration tests.

NOTE: These tests require a running PostgreSQL test database.
To run these tests:
1. Start the test database: docker compose -f docker/docker-compose.test.yml up -d
2. Run tests: cd apps/api && uv run pytest tests/integration/bulk_upload/
"""

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.user_model import UserModel


def _is_test_db_available() -> bool:
    """Check if test database is available."""
    import os

    # Check if TEST_DB_RUNNING flag is set
    return os.getenv("TEST_DB_RUNNING", "false").lower() == "true"


@pytest_asyncio.fixture
async def async_client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    """
    Create an async HTTP client for testing FastAPI endpoints.
    Uses the db_session fixture for database transactions.

    NOTE: This fixture requires the test database to be running.
    """

    # Override the database dependency
    async def get_test_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_async_session] = get_test_db  # type: ignore[arg-type]

    async with AsyncClient(app=app, base_url="http://test") as client:  # type: ignore[call-arg]
        yield client

    # Clean up overrides
    app.dependency_overrides.clear()  # type: ignore[attr-defined]


@pytest_asyncio.fixture
async def auth_headers(test_user: UserModel) -> dict[str, str]:
    """
    Create authentication headers for a test user.
    For now, this returns a mock token since we don't have full JWT generation in tests.
    """
    # TODO: Generate real JWT token for test_user
    # For now, we'll use a mock token that bypasses auth in test mode
    return {
        "Cookie": "access_token=test_token",
        "X-Test-User-Id": str(test_user.id),
        "X-Test-Tenant-Id": str(test_user.tenant_id),
    }


@pytest.fixture
def sample_csv_content() -> str:
    """Sample CSV content with valid vehicle data."""
    return """vin,year,make,model,trim,mileage,price,condition,exterior_color,interior_color,transmission,fuel_type,body_style,drivetrain,engine,cylinders,description
1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,excellent,Black,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Well maintained Honda Civic
1HGCM82633A004521,2021,Honda,Accord,LX,30000,22000,excellent,Silver,Gray,Automatic,Gas,Sedan,FWD,1.5L 4-Cylinder,4,Clean Honda Accord
2T1BURHE0FC123456,2019,Toyota,Camry,SE,40000,19500,good,White,Black,Automatic,Gas,Sedan,FWD,2.5L 4-Cylinder,4,Reliable sedan
"""


@pytest.fixture
def sample_csv_with_errors() -> str:
    """Sample CSV content with some invalid rows."""
    return """vin,year,make,model,trim,mileage,price,condition,exterior_color,interior_color,transmission,fuel_type,body_style,drivetrain,engine,cylinders,description
1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,excellent,Black,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Valid vehicle
INVALID_VIN,2020,Toyota,Corolla,LE,40000,18000,good,White,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Invalid VIN
1HGCM82633A004521,2021,Honda,Accord,LX,30000,22000,excellent,Silver,Gray,Automatic,Gas,Sedan,FWD,1.5L 4-Cylinder,4,Another valid vehicle
"""


@pytest.fixture
def csv_injection_attempts() -> str:
    """CSV with injection attempts (formula attacks)."""
    return """vin,year,make,model,trim
=HYPERLINK("http://evil.com"),2020,Honda,Civic,EX
+cmd|' /c calc'!,2020,Toyota,Corolla,LE
@SUM(1+1),2020,Ford,Fusion,SE
"""


@pytest.fixture
def csv_missing_columns() -> str:
    """CSV missing required columns."""
    return """year,make,model
2020,Honda,Civic
"""


@pytest.fixture
def csv_duplicate_vins() -> str:
    """CSV with duplicate VINs."""
    return """vin,year,make,model,trim,mileage,price,condition,exterior_color,interior_color,transmission,fuel_type,body_style,drivetrain,engine,cylinders,description
1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,excellent,Black,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,First occurrence
1HGCM82633A123456,2021,Honda,Accord,LX,40000,21000,good,White,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Duplicate VIN
"""


# Skip all integration tests if test database is not available
pytestmark: list[pytest.MarkDecorator] = []
if not _is_test_db_available():
    pytestmark.append(
        pytest.mark.skip(reason="Test database not running. Set TEST_DB_RUNNING=true to enable.")
    )
