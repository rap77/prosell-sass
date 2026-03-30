import pytest
from httpx import AsyncClient


@pytest.mark.skip(reason="Requires full integration test setup with DB and auth fixtures")
@pytest.mark.asyncio
class TestBulkUpload:
    async def test_bulk_upload_success(self, client: AsyncClient, auth_headers: dict) -> None:
        """Test successful bulk upload with valid CSV."""
        csv_content = """vin,year,make,model,trim,mileage,price,condition,exterior_color,interior_color,transmission,fuel_type,body_style,drivetrain,engine,cylinders,description
1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,excellent,Black,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Well maintained
"""

        response = await client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["created_count"] == 1
        assert data["failed_count"] == 0
        assert data["total_rows"] == 1
        assert len(data["errors"]) == 0

    async def test_bulk_upload_with_csv_injection(self, client: AsyncClient, auth_headers: dict) -> None:
        """Test that CSV injection is sanitized."""
        csv_content = """vin,year,make,model
=HYPERLINK("http://evil.com"),2020,Honda,Civic
+cmd|' /c calc'!,2020,Toyota,Corolla"""

        response = await client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )

        # Should reject malicious VINs
        assert response.status_code == 200
        data = response.json()
        assert data["failed_count"] == 2
        errors = data["errors"]
        # Verify VINs are sanitized (prefixed with ')
        assert all("=" not in error["vin"] for error in errors)

    async def test_bulk_upload_file_too_large(self, client: AsyncClient, auth_headers: dict) -> None:
        """Test that large files are rejected."""
        # Create a CSV larger than 10MB
        large_csv = "vin,year,make,model\n" + "1HGCM82633A123456,2020,Honda,Civic\n" * 300000

        response = await client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("large.csv", large_csv, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 413  # Payload Too Large

    async def test_bulk_upload_too_many_rows(self, client: AsyncClient, auth_headers: dict) -> None:
        """Test that CSVs with too many rows are rejected."""
        # Create CSV with 1001 rows (over the 1000 limit)
        rows = ["1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,excellent,Black,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Desc"]
        csv_content = "vin,year,make,model,trim,mileage,price,condition,exterior_color,interior_color,transmission,fuel_type,body_style,drivetrain,engine,cylinders,description\n"
        csv_content += "\n".join(rows * 1001)

        response = await client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Too many rows" in response.json()["detail"]

    async def test_bulk_upload_duplicate_vin_in_csv(self, client: AsyncClient, auth_headers: dict) -> None:
        """Test that duplicate VINs in the same CSV are rejected."""
        csv_content = """vin,year,make,model,trim,mileage,price,condition,exterior_color,interior_color,transmission,fuel_type,body_style,drivetrain,engine,cylinders,description
1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,excellent,Black,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Desc
1HGCM82633A123456,2021,Honda,Accord,LX,40000,21000,good,White,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Desc
"""

        response = await client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["failed_count"] == 1
        assert any("Duplicate VIN in CSV" in error["error"] for error in data["errors"])

    async def test_bulk_upload_invalid_vin_checksum(self, client: AsyncClient, auth_headers: dict) -> None:
        """Test that invalid VIN checksums are rejected."""
        csv_content = """vin,year,make,model,trim,mileage,price,condition,exterior_color,interior_color,transmission,fuel_type,body_style,drivetrain,engine,cylinders,description
1HGCM82633A123457,2020,Honda,Civic,EX,35000,18500,excellent,Black,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Desc
"""

        response = await client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["failed_count"] == 1
        assert any("Invalid VIN checksum" in error["error"] for error in data["errors"])

    async def test_bulk_upload_missing_required_columns(self, client: AsyncClient, auth_headers: dict) -> None:
        """Test that CSVs without required columns are rejected."""
        csv_content = """year,make,model
2020,Honda,Civic
"""

        response = await client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Missing required columns" in response.json()["detail"]

    async def test_bulk_upload_all_or_nothing_on_validation_error(self, client: AsyncClient, auth_headers: dict) -> None:
        """Test that all-or-nothing approach works - no vehicles created if any row fails."""
        csv_content = """vin,year,make,model,trim,mileage,price,condition,exterior_color,interior_color,transmission,fuel_type,body_style,drivetrain,engine,cylinders,description
1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,excellent,Black,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Valid vehicle
INVALID,2020,Toyota,Corolla,LE,40000,18000,good,White,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Invalid VIN
1HGCM82633A004521,2021,Honda,Accord,LX,30000,22000,excellent,Silver,Gray,Automatic,Gas,Sedan,FWD,1.5L 4-Cylinder,4,Another valid vehicle
"""

        response = await client.post(
            "/api/v1/vehicles/bulk-upload",
            files={"csv_file": ("test.csv", csv_content, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        # All-or-nothing: 0 created because 1 row failed
        assert data["created_count"] == 0
        assert data["failed_count"] == 1
        assert data["total_rows"] == 3
