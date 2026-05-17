"""Integration tests for bulk upload functionality.

NOTE: These tests require a running PostgreSQL test database.
To run these tests:
1. Start the test database: docker compose -f docker/docker-compose.test.yml up -d
2. Run tests: cd apps/api && uv run pytest tests/integration/bulk_upload/
"""

import os

import pytest
from httpx import AsyncClient

# Skip all tests in this module if test database is not running
if os.getenv("TEST_DB_RUNNING", "false").lower() != "true":
    pytestmark = pytest.mark.skip(
        reason="Test database not running. Set TEST_DB_RUNNING=true to enable."
    )


@pytest.mark.asyncio
class TestBulkUpload:
    async def test_bulk_upload_success(
        self, async_client: AsyncClient, auth_headers: dict[str, str], sample_csv_content: str
    ) -> None:
        """Test successful bulk upload with valid CSV."""
        response = await async_client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", sample_csv_content, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["created_count"] == 1
        assert data["failed_count"] == 0
        assert data["total_rows"] == 1
        assert len(data["errors"]) == 0

    async def test_bulk_upload_with_csv_injection(
        self, async_client: AsyncClient, auth_headers: dict[str, str], csv_injection_attempts: str
    ) -> None:
        """Test that CSV injection is sanitized."""
        response = await async_client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", csv_injection_attempts, "text/csv")},
            headers=auth_headers,
        )

        # Should reject malicious VINs
        assert response.status_code == 200
        data = response.json()
        assert data["failed_count"] == 3  # All 3 rows have injection attempts
        errors = data["errors"]
        # Verify VINs are sanitized (prefixed with ')
        assert all("=" not in error["vin"] for error in errors)

    async def test_bulk_upload_file_too_large(
        self, async_client: AsyncClient, auth_headers: dict[str, str]
    ) -> None:
        """Test that large files are rejected."""
        # Create a CSV larger than 10MB
        large_csv = "vin,year,make,model\n" + "1HGCM82633A123456,2020,Honda,Civic\n" * 300000

        response = await async_client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("large.csv", large_csv, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 413  # Payload Too Large

    async def test_bulk_upload_too_many_rows(
        self, async_client: AsyncClient, auth_headers: dict[str, str]
    ) -> None:
        """Test that CSVs with too many rows are rejected."""
        # Create CSV with 1001 rows (over the 1000 limit)
        rows = [
            "1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,excellent,Black,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Desc"
        ]
        csv_content = "vin,year,make,model,trim,mileage,price,condition,exterior_color,interior_color,transmission,fuel_type,body_style,drivetrain,engine,cylinders,description\n"
        csv_content += "\n".join(rows * 1001)

        response = await async_client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Too many rows" in response.json()["detail"]

    async def test_bulk_upload_duplicate_vin_in_csv(
        self, async_client: AsyncClient, auth_headers: dict[str, str], csv_duplicate_vins: str
    ) -> None:
        """Test that duplicate VINs in the same CSV are rejected."""
        response = await async_client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", csv_duplicate_vins, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["failed_count"] == 1
        assert any("Duplicate VIN in CSV" in error["error"] for error in data["errors"])

    async def test_bulk_upload_invalid_vin_checksum(
        self, async_client: AsyncClient, auth_headers: dict[str, str]
    ) -> None:
        """Test that invalid VIN checksums are rejected."""
        csv_content = """vin,year,make,model,trim,mileage,price,condition,exterior_color,interior_color,transmission,fuel_type,body_style,drivetrain,engine,cylinders,description
1HGCM82633A123457,2020,Honda,Civic,EX,35000,18500,excellent,Black,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Desc
"""

        response = await async_client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["failed_count"] == 1
        assert any("Invalid VIN checksum" in error["error"] for error in data["errors"])

    async def test_bulk_upload_missing_required_columns(
        self, async_client: AsyncClient, auth_headers: dict[str, str], csv_missing_columns: str
    ) -> None:
        """Test that CSVs without required columns are rejected."""
        response = await async_client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", csv_missing_columns, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Missing required columns" in response.json()["detail"]

    async def test_bulk_upload_all_or_nothing_on_validation_error(
        self, async_client: AsyncClient, auth_headers: dict[str, str], sample_csv_with_errors: str
    ) -> None:
        """Test that all-or-nothing approach works - no vehicles created if any row fails."""
        response = await async_client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", sample_csv_with_errors, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        # All-or-nothing: 0 created because 1 row failed
        assert data["created_count"] == 0
        assert data["failed_count"] == 1
        assert data["total_rows"] == 3
