"""Integration tests for bulk upload preview endpoint.

Tests POST /api/v1/products/bulk-upload/preview dry-run endpoint.
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
# FIXTURES — Client-format CSV (semicolon-delimited, 23 columns)
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


@pytest.fixture
def client_csv_missing_vin() -> str:
    """Client CSV with missing VIN in second row."""
    return (
        "id;title;price;category;type;location;year;make;model;mileage;body_style;"
        "exterior_color;interior_color;clean_title;state;fuel_type;transmission;"
        "option;description;path;groups;label;publicado;VIN\n"
        "1;DJ;2500000;Vehiculos;Sedan;Orlando florida;2020;Ford;Explorer;70000;SUV;"
        "Gris;Negro;1;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2020-EXPLORER;1,2;01/01/25;1;1FMSK7DH7LGA77418\n"
        "2;RM;1800000;Vehiculos;Sedan;Miami florida;2019;Toyota;Camry;45000;Sedan;"
        "Blanco;Gris;0;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2019-CAMRY;1;01/02/25;0;\n"
    )


@pytest.fixture
def client_csv_missing_price() -> str:
    """Client CSV with missing price in second row."""
    return (
        "id;title;price;category;type;location;year;make;model;mileage;body_style;"
        "exterior_color;interior_color;clean_title;state;fuel_type;transmission;"
        "option;description;path;groups;label;publicado;VIN\n"
        "1;DJ;2500000;Vehiculos;Sedan;Orlando florida;2020;Ford;Explorer;70000;SUV;"
        "Gris;Negro;1;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2020-EXPLORER;1,2;01/01/25;1;1FMSK7DH7LGA77418\n"
        "2;RM;;Vehiculos;Sedan;Miami florida;2019;Toyota;Camry;45000;Sedan;"
        "Blanco;Gris;0;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2019-CAMRY;1;01/02/25;0;2T1BURHE0LC123456\n"
    )


@pytest.fixture
def client_csv_all_valid() -> str:
    """Client CSV where all rows are valid (importable)."""
    return (
        "id;title;price;category;type;location;year;make;model;mileage;body_style;"
        "exterior_color;interior_color;clean_title;state;fuel_type;transmission;"
        "option;description;path;groups;label;publicado;VIN\n"
        "1;DJ;2500000;Vehiculos;Sedan;Orlando florida;2020;Ford;Explorer;70000;SUV;"
        "Gris;Negro;1;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2020-EXPLORER;1,2;01/01/25;1;1FMSK7DH7LGA77418\n"
        "2;RM;1800000;Vehiculos;Sedan;Miami florida;2019;Toyota;Camry;45000;Sedan;"
        "Blanco;Gris;0;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2019-CAMRY;1;01/02/25;0;2T1BURHE0LC123456\n"
        "3;AB;3200000;Vehiculos;Sedan;Orlando florida;2021;Honda;Accord;30000;Sedan;"
        "Rojo;Negro;1;FL;Gas;Automatic;;;IMG/Vehiculos/MF/2021-ACCORD;2;01/03/25;1;3FMSK7DH7LGA77419\n"
    )


# =============================================================================
# TESTS
# =============================================================================


@pytest.mark.asyncio
class TestBulkUploadPreview:
    async def test_preview_returns_correct_response_structure(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        client_csv_valid: str,
    ) -> None:
        """Preview returns total_rows, rows list, and summary."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/preview",
            files={"csv_file": ("client.csv", client_csv_valid, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Top-level structure
        assert "total_rows" in data
        assert "rows" in data
        assert "summary" in data

        # Summary structure
        assert "importable_count" in data["summary"]
        assert "error_count" in data["summary"]
        assert "images_count" in data["summary"]

    async def test_preview_maps_fields_correctly(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        client_csv_valid: str,
    ) -> None:
        """Preview correctly maps client CSV fields to ProSell model."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/preview",
            files={"csv_file": ("client.csv", client_csv_valid, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        rows = data["rows"]
        assert len(rows) == 2

        # First row — DJ, Ford Explorer
        row1 = rows[0]
        assert row1["vin"] == "1FMSK7DH7LGA77418"
        assert row1["title"] == "DJ"
        assert row1["importable"] is True
        assert row1["mapped_fields"]["attributes.vin"] == "1FMSK7DH7LGA77418"
        assert row1["mapped_fields"]["price_cents"] == 2500000
        assert row1["mapped_fields"]["location_city"] == "Orlando"
        assert row1["mapped_fields"]["location_state"] == "FL"
        assert row1["mapped_fields"]["attributes.year"] == 2020
        assert row1["mapped_fields"]["attributes.make"] == "Ford"
        assert row1["mapped_fields"]["attributes.model"] == "Explorer"
        assert row1["mapped_fields"]["attributes.mileage"] == 70000
        assert row1["mapped_fields"]["attributes.title_status"] == "clean"
        assert row1["mapped_fields"]["attributes.facebook_groups"] == ["1", "2"]
        assert row1["mapped_fields"]["attributes.publicado"] is True
        assert row1["images_found"] == ["IMG/Vehiculos/MF/2020-EXPLORER"]

    async def test_preview_location_parsing(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        client_csv_valid: str,
    ) -> None:
        """Location 'Orlando florida' is parsed into city=Orlando, state=FL."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/preview",
            files={"csv_file": ("client.csv", client_csv_valid, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        row1 = data["rows"][0]
        assert row1["mapped_fields"]["location_city"] == "Orlando"
        assert row1["mapped_fields"]["location_state"] == "FL"

    async def test_preview_title_status_clean(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        client_csv_valid: str,
    ) -> None:
        """clean_title '1' maps to title_status='clean'."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/preview",
            files={"csv_file": ("client.csv", client_csv_valid, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        row1 = data["rows"][0]
        assert row1["mapped_fields"]["attributes.title_status"] == "clean"

    async def test_preview_title_status_rebuilt(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        client_csv_valid: str,
    ) -> None:
        """clean_title '0' maps to title_status='rebuilt'."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/preview",
            files={"csv_file": ("client.csv", client_csv_valid, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        row2 = data["rows"][1]
        assert row2["mapped_fields"]["attributes.title_status"] == "rebuilt"

    async def test_preview_missing_vin_marks_row_not_importable(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        client_csv_missing_vin: str,
    ) -> None:
        """Row with missing VIN is marked importable=false with error."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/preview",
            files={"csv_file": ("client.csv", client_csv_missing_vin, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        rows = data["rows"]
        assert len(rows) == 2

        # Second row has missing VIN
        row2 = rows[1]
        assert row2["vin"] == ""
        assert row2["importable"] is False
        assert "VIN" in row2["missing_fields"]
        assert len(row2["errors"]) > 0

    async def test_preview_missing_price_marks_row_not_importable(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        client_csv_missing_price: str,
    ) -> None:
        """Row with missing price is marked importable=false."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/preview",
            files={"csv_file": ("client.csv", client_csv_missing_price, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        rows = data["rows"]
        row2 = rows[1]
        assert row2["importable"] is False
        assert "price" in row2["missing_fields"]

    async def test_preview_summary_counts(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        client_csv_all_valid: str,
    ) -> None:
        """Summary correctly counts importable and error rows."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/preview",
            files={"csv_file": ("client.csv", client_csv_all_valid, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert data["total_rows"] == 3
        assert data["summary"]["importable_count"] == 3
        assert data["summary"]["error_count"] == 0
        # 3 rows, each with 1 image path
        assert data["summary"]["images_count"] == 3

    async def test_preview_unmapped_columns_reported(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        client_csv_valid: str,
    ) -> None:
        """Unmapped CSV columns (id, type, option) are listed in unmapped_csv_columns."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/preview",
            files={"csv_file": ("client.csv", client_csv_valid, "text/csv")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        row1 = data["rows"][0]
        # id, type, option have no mapping to ProSell fields
        assert "unmapped_csv_columns" in row1

    async def test_preview_rejects_non_csv(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
    ) -> None:
        """ "Non-CSV file returns 422."""
        response = await async_client.post(
            "/api/v1/products/bulk-upload/preview",
            files={"csv_file": ("test.txt", "not a csv", "text/plain")},
            headers=auth_headers,
        )

        assert response.status_code == 422
        assert "Only CSV files are supported" in response.json()["detail"]
