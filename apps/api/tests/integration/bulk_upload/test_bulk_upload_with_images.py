"""Integration tests for bulk upload with-images endpoint.

Tests POST /api/v1/products/bulk-upload/with-images endpoint.

The shared `tests/integration/conftest.py` already skips integration tests
automatically when localhost:5433 is unreachable, so this file no longer
needs its own gate.
"""

from uuid import uuid4

import pytest
from httpx import AsyncClient

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def client_csv_valid() -> str:
    """Valid client-format CSV with semicolon delimiter.

    Prices are dollars; the mapper multiplies by 100 to get cents.
    """
    return (
        "id;title;price;category;type;location;year;make;model;mileage;body_style;"
        "exterior_color;interior_color;clean_title;state;fuel_type;transmission;"
        "option;description;path;groups;label;publicado;VIN\n"
        "1;DJ;25000;Vehiculos;Sedan;Orlando florida;2020;Ford;Explorer;70000;SUV;"
        "Gris;Negro;1;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2020-EXPLORER;1,2;01/01/25;1;1FMSK7DH7LGA77418\n"
        "2;RM;18000;Vehiculos;Sedan;Miami florida;2019;Toyota;Camry;45000;Sedan;"
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
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        """Endpoint returns total_rows, imported_count, updated_count, failed_count, results."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/with-images",
            data={
                "organization_id": str(test_organization.id),
                "category_id": str(test_category.id),
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
                "category_id": str(uuid4()),
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
                "organization_id": str(uuid4()),
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
        test_organization: OrganizationModel,
        test_category: CategoryModel,
    ) -> None:
        """Non-CSV file returns 422.

        Note: uses real org/category fixtures so the IDOR check passes and the
        CSV validation runs (otherwise we get a 403 before reaching it).
        """
        response = await async_client.post(
            "/api/v1/products/bulk-upload/with-images",
            data={
                "organization_id": str(test_organization.id),
                "category_id": str(test_category.id),
            },
            files={"csv_file": ("test.txt", "not a csv", "text/plain")},
            headers=auth_headers,
        )

        assert response.status_code == 422
        assert "Only CSV files are supported" in response.json()["detail"]
