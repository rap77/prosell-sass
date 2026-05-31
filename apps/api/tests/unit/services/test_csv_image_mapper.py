"""Unit tests for CSVImageMapper service."""

import zipfile
from collections import Counter
from io import BytesIO
from uuid import uuid4

import pytest

from prosell.domain.services.csv_image_mapper import (
    MAX_FILE_SIZE,
    MAX_TOTAL_SIZE,
    CSVImageMapper,
)

# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def tenant_id():
    """Tenant ID for testing."""
    return uuid4()


@pytest.fixture
def organization_id():
    """Organization ID for testing."""
    return uuid4()


@pytest.fixture
def sample_zip_bytes():
    """Create a ZIP with folder structure matching CSV paths."""
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("Ford/Explorer/2020/img1.jpg", b"fake jpeg content 1")
        zf.writestr("Ford/Explorer/2020/img2.jpg", b"fake jpeg content 2")
        zf.writestr("Ford/Mustang/2021/img1.jpg", b"fake jpeg content 3")
        zf.writestr("Honda/Civic/2019/photo.jpg", b"fake jpeg content 4")
    buffer.seek(0)
    return buffer.read()


@pytest.fixture
def parsed_rows():
    """Simulate parsed CSV rows with path field."""
    return [
        {"vin": "1HGBDM82633A123456", "path": "Ford/Explorer/2020"},
        {"vin": "2HGBM8263MA123456", "path": "Ford/Mustang/2021"},
        {"vin": "3HGBM8263MA999999", "path": "Honda/Civic/2019"},
        {"vin": "4HGBM8263MA000000", "path": "Toyota/Camry/2022"},
    ]


# =============================================================================
# TESTS — Constructor and basic validation
# =============================================================================


class TestConstructor:
    def test_default_do_spaces_prefix(self):
        mapper = CSVImageMapper()
        assert mapper.do_spaces_prefix == "vehicles"

    def test_custom_do_spaces_prefix(self):
        mapper = CSVImageMapper(do_spaces_prefix="custom")
        assert mapper.do_spaces_prefix == "custom"


# =============================================================================
# TESTS — ZIP Structure Reading
# =============================================================================


class TestZipStructureReading:
    def test_reads_zip_and_extracts_all_files(self, sample_zip_bytes):
        mapper = CSVImageMapper()
        zip_contents = mapper._read_zip_contents(sample_zip_bytes)
        assert len(zip_contents) == 4
        counts = Counter(k.split("/")[-1] for k in zip_contents)
        assert counts == {"img1.jpg": 2, "img2.jpg": 1, "photo.jpg": 1}

    def test_reads_empty_zip(self):
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED):
            pass
        buffer.seek(0)
        mapper = CSVImageMapper()
        zip_contents = mapper._read_zip_contents(buffer.read())
        assert zip_contents == {}

    def test_invalid_zip_raises(self):
        mapper = CSVImageMapper()
        with pytest.raises(ValueError, match="Invalid ZIP file"):
            mapper._read_zip_contents(b"not a zip file at all")

    def test_max_file_size_limit_constants(self):
        """MAX_FILE_SIZE and MAX_TOTAL_SIZE constants prevent decompression bombs."""
        assert MAX_FILE_SIZE == 100 * 1024 * 1024
        assert MAX_TOTAL_SIZE == 500 * 1024 * 1024

    def test_small_files_within_limits_pass(self):
        """Multiple entries within individual and total size limits succeed."""
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for i in range(4):
                zf.writestr(f"file{i}.jpg", b"x" * (1024 * 1024))
        buffer.seek(0)
        mapper = CSVImageMapper()
        contents = mapper._read_zip_contents(buffer.read())
        assert len(contents) == 4


# =============================================================================
# TESTS — Filename Sanitization
# =============================================================================


class TestFilenameSanitization:
    def test_normal_filename_passed_through(self):
        mapper = CSVImageMapper()
        assert mapper._sanitize_filename("photo.jpg") == "photo.jpg"

    def test_filename_with_underscore_and_numbers(self):
        mapper = CSVImageMapper()
        assert mapper._sanitize_filename("IMG_20231015_001.png") == "IMG_20231015_001.png"

    def test_empty_filename_rejected(self):
        mapper = CSVImageMapper()
        with pytest.raises(ValueError, match="Invalid filename"):
            mapper._sanitize_filename("")

    def test_backslash_separator_rejected(self):
        mapper = CSVImageMapper()
        with pytest.raises(ValueError, match="Invalid filename"):
            mapper._sanitize_filename("Ford\\subdir\\photo.jpg")


# =============================================================================
# TESTS — Path Matching
# =============================================================================


class TestPathMatching:
    def test_match_path_exact_prefix(self, sample_zip_bytes, parsed_rows):
        mapper = CSVImageMapper()
        mapping = mapper.map_images(
            zip_bytes=sample_zip_bytes,
            parsed_rows=parsed_rows,
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )
        explorer_files = [
            m for m in mapping.mapped if m.original_zip_key.startswith("Ford/Explorer/2020/")
        ]
        assert len(explorer_files) == 2

    def test_match_path_returns_do_spaces_keys(
        self, sample_zip_bytes, parsed_rows, tenant_id, organization_id
    ):
        mapper = CSVImageMapper()
        result = mapper.map_images(
            zip_bytes=sample_zip_bytes,
            parsed_rows=parsed_rows,
            tenant_id=tenant_id,
            organization_id=organization_id,
        )
        for mapped in result.mapped:
            assert mapped.do_spaces_key.startswith("vehicles/")
            assert str(tenant_id) in mapped.do_spaces_key
            assert str(organization_id) in mapped.do_spaces_key
            assert mapped.do_spaces_key.endswith(mapped.original_zip_key.split("/")[-1])

    def test_unmatched_paths_reported(self, sample_zip_bytes, parsed_rows):
        mapper = CSVImageMapper()
        result = mapper.map_images(
            zip_bytes=sample_zip_bytes,
            parsed_rows=parsed_rows,
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )
        unmatched_paths = [u.csv_path for u in result.unmatched]
        assert "Toyota/Camry/2022" in unmatched_paths

    def test_empty_path_skipped(self):
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("Ford/Explorer/2020/img1.jpg", b"content")
        buffer.seek(0)
        rows = [
            {"vin": "1HGBDM82633A123456", "path": ""},
            {"vin": "2HGBDM82633A123457", "path": None},  # type: ignore
        ]
        mapper = CSVImageMapper()
        result = mapper.map_images(
            zip_bytes=buffer.read(),
            parsed_rows=rows,  # type: ignore
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )
        assert len(result.mapped) == 0


# =============================================================================
# TESTS — ImageMappingResult
# =============================================================================


class TestImageMappingResult:
    def test_summary_counts(self, sample_zip_bytes, parsed_rows):
        mapper = CSVImageMapper()
        result = mapper.map_images(
            zip_bytes=sample_zip_bytes,
            parsed_rows=parsed_rows,
            tenant_id=uuid4(),
            organization_id=uuid4(),
        )
        assert result.total_rows == 4
        assert result.matched_rows == 3
        assert result.unmatched_rows == 1
        assert result.total_images == 4
        assert len(result.mapped) == 4
        assert len(result.unmatched) == 1
