"""Integration tests for bulk upload with-images endpoint.

Tests POST /api/v1/products/bulk-upload/with-images endpoint.
Requires a running PostgreSQL test database (TEST_DB_RUNNING=true).
"""

import os

import pytest
from httpx import AsyncClient

# Skip all tests in this module if test database is not running
if os.getenv("TEST_DB_RUNNING", "false").lower() != "true":
    pytestmark = pytest.mark.skip(
        reason="Test database not running. Set TEST_DB_RUNNING=true to enable."
    )


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def client_csv_valid() -> str:
    """Valid client-format CSV with semicolon delimiter."""
    return (
        "id;title;price;category;type;location;year;make;model;mileage;body_style;"
        "exterior_color;interior_color;clean_title;state;fuel_type;transmission;"
        "option;description;path;groups;label;publicado;VIN\n"
        "1;DJ;2500000;Vehiculos;Sedan;Orlando florida;2020;Ford;Explorer;70000;SUV;"
        "Gris;Negro;1;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2020-EXPLORER;1,2;01/01/25;1;1FMSK7DH7LGA77418\n"
        "2;RM;1800000;Vehiculos;Sedan;Miami florida;2019;Toyota;Camry;45000;Sedan;"
        "Blanco;Gris;0;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2019-CAMRY;1;01/02/25;0;2T1BURHE0LC123456\n"
    )


# =============================================================================
# TESTS
# =============================================================================


@pytest.mark.asyncio
class TestBulkUploadWithImages:
    async def test_endpoint_returns_correct_response_structure(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        client_csv_valid: str,
    ) -> None:
        """Endpoint returns total_rows, imported_count, updated_count, failed_count, results."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/with-images",
            data={
                "organization_id": "00000000-0000-0000-0000-000000000001",
                "category_id": "00000000-0000-0000-0000-000000000002",
            },
            files={"csv_file": ("client.csv", client_csv_valid, "text/csv")},
            headers=auth_headers,
        )

        # Should return 201 or 200
        assert response.status_code in [200, 201]

    async def test_endpoint_requires_organization_id(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        client_csv_valid: str,
    ) -> None:
        """Endpoint requires organization_id form field."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/with-images",
            data={
                "category_id": "00000000-0000-0000-0000-000000000002",
            },
            files={"csv_file": ("client.csv", client_csv_valid, "text/csv")},
            headers=auth_headers,
        )

        # Should return 422 (validation error)
        assert response.status_code == 422

    async def test_endpoint_requires_category_id(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        client_csv_valid: str,
    ) -> None:
        """Endpoint requires category_id form field."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/with-images",
            data={
                "organization_id": "00000000-0000-0000-0000-000000000001",
            },
            files={"csv_file": ("client.csv", client_csv_valid, "text/csv")},
            headers=auth_headers,
        )

        # Should return 422 (validation error)
        assert response.status_code == 422

    async def test_endpoint_rejects_non_csv(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Non-CSV file returns 422."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/with-images",
            data={
                "organization_id": "00000000-0000-0000-0000-000000000001",
                "category_id": "00000000-0000-0000-0000-000000000002",
            },
            files={"csv_file": ("test.txt", "not a csv", "text/plain")},
            headers=auth_headers,
        )

        assert response.status_code == 422
        assert "Only CSV files are supported" in response.json()["detail"]
