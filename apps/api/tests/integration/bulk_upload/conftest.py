"""Fixtures for bulk upload integration tests.

The shared `tests/integration/conftest.py` already skips integration tests
automatically when localhost:5433 is unreachable, so this file no longer
needs its own gate.
"""

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.main import app
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.models.user_model import UserModel


@pytest_asyncio.fixture
async def async_client(
    db_session: AsyncSession, test_user: UserModel
) -> AsyncIterator[AsyncClient]:
    """
    Create an async HTTP client for testing FastAPI endpoints.

    Uses dependency_overrides (Brain #7 Condition B): bypasses JWT/cookies by
    injecting the test user directly into `get_current_auth_user_from_cookie`,
    mirroring the pattern in `tests/integration/api/conftest.py`.
    """

    # Override auth: inject test_user as the current authenticated user
    auth_role = Role(
        id=__import__("uuid").uuid4(),
        role_type=RoleType.SUPER_ADMIN,
        name="Super Admin",
        is_system_role=True,
        tenant_id=None,
    )
    auth_user = User(
        id=test_user.id,
        email=test_user.email,
        full_name=test_user.full_name,
        tenant_id=test_user.tenant_id,
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[auth_role],
    )
    app.dependency_overrides[get_current_auth_user_from_cookie] = lambda: auth_user

    # Override the database dependency
    async def get_test_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_async_session] = get_test_db  # type: ignore[arg-type]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    # Clean up overrides
    app.dependency_overrides.clear()  # type: ignore[attr-defined]


@pytest_asyncio.fixture
async def auth_headers(test_user: UserModel) -> dict[str, str]:
    """
    Kept for compatibility with existing tests. The auth check is now
    bypassed via dependency_overrides, so headers here are sent but
    effectively unused by the auth layer.
    """
    return {
        "Cookie": "access_token=test_token",
        "X-Test-User-Id": str(test_user.id),
        "X-Test-Tenant-Id": str(test_user.tenant_id),
    }


@pytest.fixture
def sample_csv_content() -> str:
    """Sample CSV content with valid vehicle data."""
    return (
        "vin,year,make,model,trim,mileage,price,condition,exterior_color,"
        "interior_color,transmission,fuel_type,body_style,drivetrain,engine,"
        "cylinders,description\n"
        "1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,excellent,Black,"
        "Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Well maintained Honda Civic\n"
        "1HGCM82633A004521,2021,Honda,Accord,LX,30000,22000,excellent,Silver,"
        "Gray,Automatic,Gas,Sedan,FWD,1.5L 4-Cylinder,4,Clean Honda Accord\n"
        "2T1BURHE0FC123456,2019,Toyota,Camry,SE,40000,19500,good,White,Black,"
        "Automatic,Gas,Sedan,FWD,2.5L 4-Cylinder,4,Reliable sedan\n"
    )


@pytest.fixture
def sample_csv_with_errors() -> str:
    """Sample CSV content with some invalid rows."""
    return (
        "vin,year,make,model,trim,mileage,price,condition,exterior_color,"
        "interior_color,transmission,fuel_type,body_style,drivetrain,engine,"
        "cylinders,description\n"
        "1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,excellent,Black,"
        "Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Valid vehicle\n"
        "INVALID_VIN,2020,Toyota,Corolla,LE,40000,18000,good,White,Black,"
        "Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Invalid VIN\n"
        "1HGCM82633A004521,2021,Honda,Accord,LX,30000,22000,excellent,Silver,"
        "Gray,Automatic,Gas,Sedan,FWD,1.5L 4-Cylinder,4,Another valid vehicle\n"
    )


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
    return (
        "vin,year,make,model,trim,mileage,price,condition,exterior_color,"
        "interior_color,transmission,fuel_type,body_style,drivetrain,engine,"
        "cylinders,description\n"
        "1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,excellent,Black,"
        "Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,First occurrence\n"
        "1HGCM82633A123456,2021,Honda,Accord,LX,40000,21000,good,White,Black,"
        "Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Duplicate VIN\n"
    )


# NOTE: The conditional skip based on `_is_test_db_available()` was removed.
# Skipping is now handled by the shared `tests/integration/conftest.py`,
# which inspects localhost:5433 once at collection time and applies
# `pytest.mark.skip` to every integration test if the database is down.
pytestmark: list[pytest.MarkDecorator] = []
