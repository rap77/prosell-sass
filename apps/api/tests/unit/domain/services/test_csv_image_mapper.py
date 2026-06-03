"""Unit tests for CSVImageMapper."""

import zipfile
from io import BytesIO
from uuid import uuid4

import pytest

from prosell.domain.services.csv_image_mapper import (
    MAX_FILE_SIZE,
    MAX_TOTAL_SIZE,
    CSVImageMapper,
    ImageMappingResult,
    MappedImage,
    UnmatchedPath,
)


def make_zip(files: dict[str, bytes]) -> bytes:
    """Helper to create a ZIP in memory from a dict of name -> bytes."""
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in files.items():
            zf.writestr(name, data)
    return buffer.getvalue()


class TestSanitizeFilename:
    """Tests for _sanitize_filename."""

    def test_strips_path_components(self) -> None:
        mapper = CSVImageMapper()
        assert mapper._sanitize_filename("folder/sub/img.png") == "img.png"
        assert mapper._sanitize_filename(" Ford / Explorer / img1.jpg ") == " img1.jpg "

    def test_rejects_backslash(self) -> None:
        mapper = CSVImageMapper()
        with pytest.raises(ValueError, match="Invalid filename"):
            mapper._sanitize_filename("folder\\img.jpg")

    def test_rejects_path_traversal(self) -> None:
        mapper = CSVImageMapper()
        with pytest.raises(ValueError, match="Invalid filename"):
            mapper._sanitize_filename("../../../etc/passwd")
        with pytest.raises(ValueError, match="Invalid filename"):
            mapper._sanitize_filename("folder/../../etc/passwd")

    def test_rejects_empty(self) -> None:
        mapper = CSVImageMapper()
        with pytest.raises(ValueError, match="Invalid filename"):
            mapper._sanitize_filename("")

    def test_accepts_plain_filename(self) -> None:
        mapper = CSVImageMapper()
        assert mapper._sanitize_filename("img1.jpg") == "img1.jpg"


class TestReadZipContents:
    """Tests for _read_zip_contents."""

    def test_reads_valid_zip(self) -> None:
        zip_bytes = make_zip(
            {"Ford/Explorer/img1.jpg": b"data1", "Ford/Explorer/img2.png": b"data2"}
        )
        mapper = CSVImageMapper()
        contents = mapper._read_zip_contents(zip_bytes)
        assert contents == {"Ford/Explorer/img1.jpg": b"data1", "Ford/Explorer/img2.png": b"data2"}

    def test_ignores_directories(self) -> None:
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w") as zf:
            zf.writestr("Ford/", b"")  # directory
            zf.writestr("Ford/Explorer/img.jpg", b"data")
        mapper = CSVImageMapper()
        contents = mapper._read_zip_contents(buffer.getvalue())
        assert "Ford/" not in contents
        assert "Ford/Explorer/img.jpg" in contents

    def test_rejects_file_over_limit(self) -> None:
        big_data = b"x" * (MAX_FILE_SIZE + 1)
        zip_bytes = make_zip({"big.jpg": big_data})
        mapper = CSVImageMapper()
        with pytest.raises(ValueError, match="exceeds maximum file size"):
            mapper._read_zip_contents(zip_bytes)

    def test_rejects_total_over_limit(self) -> None:
        # Create multiple files that together exceed MAX_TOTAL_SIZE
        file_size = MAX_TOTAL_SIZE // 3
        files = {f"file_{i}.jpg": b"x" * file_size for i in range(4)}
        zip_bytes = make_zip(files)
        mapper = CSVImageMapper()
        with pytest.raises(ValueError, match="exceeds maximum"):
            mapper._read_zip_contents(zip_bytes)

    def test_rejects_invalid_zip(self) -> None:
        mapper = CSVImageMapper()
        with pytest.raises(ValueError, match="Invalid ZIP file"):
            mapper._read_zip_contents(b"not a zip file")


class TestBuildDoSpacesKey:
    """Tests for _build_do_spaces_key."""

    def test_format(self) -> None:
        mapper = CSVImageMapper(do_spaces_prefix="vehicles")
        tid = uuid4()
        oid = uuid4()
        key = mapper._build_do_spaces_key(tid, oid, "VIN123", "img1.jpg")
        assert key == f"vehicles/{tid}/{oid}/VIN123/img1.jpg"

    def test_custom_prefix(self) -> None:
        mapper = CSVImageMapper(do_spaces_prefix="custom")
        tid = uuid4()
        oid = uuid4()
        key = mapper._build_do_spaces_key(tid, oid, "VIN123", "img1.jpg")
        assert key.startswith("custom/")


class TestMapImages:
    """Tests for map_images."""

    def _make_rows(self, *paths_and_vins: tuple[str, str]) -> list[dict]:
        return [{"path": p, "vin": v} for p, v in paths_and_vins]

    def test_maps_images_to_vin(self) -> None:
        zip_bytes = make_zip(
            {
                "Ford/Explorer/2020/img1.jpg": b"data1",
                "Ford/Explorer/2020/img2.jpg": b"data2",
            }
        )
        rows = self._make_rows(("Ford/Explorer/2020", "VIN001"))
        mapper = CSVImageMapper()
        tid, oid = uuid4(), uuid4()
        result = mapper.map_images(zip_bytes, rows, tid, oid)

        assert result.total_rows == 1
        assert result.matched_rows == 1
        assert result.unmatched_rows == 0
        assert result.total_images == 2

        mapped = result.mapped
        assert len(mapped) == 2
        assert all(m.vin == "VIN001" for m in mapped)
        assert all(m.csv_path == "Ford/Explorer/2020" for m in mapped)
        assert {m.original_zip_key for m in mapped} == {
            "Ford/Explorer/2020/img1.jpg",
            "Ford/Explorer/2020/img2.jpg",
        }
        for m in mapped:
            assert (
                m.do_spaces_key
                == f"vehicles/{tid}/{oid}/VIN001/{m.original_zip_key.split('/')[-1]}"
            )

    def test_unmatched_path(self) -> None:
        zip_bytes = make_zip({"Ford/Explorer/img1.jpg": b"data1"})
        rows = self._make_rows(("NonExistent/Path", "VIN001"))
        mapper = CSVImageMapper()
        result = mapper.map_images(zip_bytes, rows, uuid4(), uuid4())

        assert result.total_rows == 1
        assert result.matched_rows == 0
        assert result.unmatched_rows == 1
        assert result.total_images == 0
        assert result.unmatched == [UnmatchedPath(vin="VIN001", csv_path="NonExistent/Path")]

    def test_partial_match(self) -> None:
        zip_bytes = make_zip(
            {
                "Ford/Explorer/2020/img1.jpg": b"data1",
                "Toyota/Camry/2021/img2.jpg": b"data2",
            }
        )
        rows = self._make_rows(
            ("Ford/Explorer/2020", "VIN001"),
            ("Toyota/Camry/2021", "VIN002"),
            ("Honda/Civic/2019", "VIN003"),
        )
        mapper = CSVImageMapper()
        result = mapper.map_images(zip_bytes, rows, uuid4(), uuid4())

        assert result.total_rows == 3
        assert result.matched_rows == 2
        assert result.unmatched_rows == 1
        assert result.total_images == 2
        assert {m.vin for m in result.mapped} == {"VIN001", "VIN002"}

    def test_skips_empty_path(self) -> None:
        zip_bytes = make_zip({"Ford/img1.jpg": b"data"})
        rows = [{"path": "", "vin": "VIN001"}, {"path": "  ", "vin": "VIN002"}]
        mapper = CSVImageMapper()
        result = mapper.map_images(zip_bytes, rows, uuid4(), uuid4())
        assert result.total_rows == 0
        assert result.mapped == []

    def test_skips_rows_without_path_key(self) -> None:
        zip_bytes = make_zip({"Ford/img1.jpg": b"data"})
        rows = [{"path": "NonExistent", "vin": "VIN001"}, {"path": "Ford", "not_vin": "X"}]
        mapper = CSVImageMapper()
        result = mapper.map_images(zip_bytes, rows, uuid4(), uuid4())
        # row 1: unmatched (path doesn't exist in ZIP), row 2: matched (empty vin)
        assert result.total_rows == 2
        assert result.unmatched_rows == 1
        assert result.matched_rows == 1

    def test_multiple_vins_same_path(self) -> None:
        zip_bytes = make_zip(
            {
                "Ford/Explorer/img1.jpg": b"data1",
                "Ford/Explorer/img2.jpg": b"data2",
            }
        )
        rows = self._make_rows(
            ("Ford/Explorer", "VIN001"),
            ("Ford/Explorer", "VIN002"),
        )
        mapper = CSVImageMapper()
        result = mapper.map_images(zip_bytes, rows, uuid4(), uuid4())

        assert result.total_rows == 2
        assert result.matched_rows == 2
        assert result.total_images == 4  # 2 imgs x 2 VINs

    def test_empty_zip(self) -> None:
        zip_bytes = make_zip({})
        rows = self._make_rows(("Ford/Explorer/2020", "VIN001"))
        mapper = CSVImageMapper()
        result = mapper.map_images(zip_bytes, rows, uuid4(), uuid4())
        assert result.total_rows == 1
        assert result.matched_rows == 0
        assert result.unmatched_rows == 1

    def test_matches_image_path_key_from_mapped_csv_row(self) -> None:
        """RED test (T8a): the mapper must read `image_path` (what
        `asdict(MappedCSVRow)` produces at `csv_field_mapper.py:355`)
        instead of the bare `path` key.

        This reproduces the production bug: the bulk-upload use case
        passes `[asdict(row) for row in parsed_rows]` to
        `csv_image_mapper.map_images(...)`. The dict carries
        `image_path` (the dataclass field name), but the mapper looks
        for `path` and always returns unmatched. Result: ZIP folders
        never get associated with CSV rows in production.
        """
        zip_bytes = make_zip(
            {
                "Ford/Explorer/2020/img1.jpg": b"data1",
                "Ford/Explorer/2020/img2.jpg": b"data2",
            }
        )
        # Row dict as produced by `asdict(MappedCSVRow)` — uses `image_path`, NOT `path`
        rows = [{"vin": "VIN001", "image_path": "Ford/Explorer/2020"}]
        mapper = CSVImageMapper()
        result = mapper.map_images(zip_bytes, rows, uuid4(), uuid4())

        assert result.matched_rows == 1, (
            f"Expected 1 matched row, got {result.matched_rows}. "
            "The mapper is looking for `path` but the row dict has `image_path`."
        )
        assert result.unmatched_rows == 0
        assert result.total_images == 2


class TestImageMappingResult:
    """Tests for ImageMappingResult properties."""

    def test_properties(self) -> None:
        mapped = [
            MappedImage(
                vin="VIN001",
                csv_path="p1",
                original_zip_key="p1/a.jpg",
                do_spaces_key="k1",
                file_bytes=b"x",
            ),
            MappedImage(
                vin="VIN001",
                csv_path="p1",
                original_zip_key="p1/b.jpg",
                do_spaces_key="k2",
                file_bytes=b"x",
            ),
            MappedImage(
                vin="VIN002",
                csv_path="p2",
                original_zip_key="p2/c.jpg",
                do_spaces_key="k3",
                file_bytes=b"x",
            ),
        ]
        unmatched = [UnmatchedPath(vin="VIN003", csv_path="p3")]

        result = ImageMappingResult(mapped=mapped, unmatched=unmatched)

        assert result.total_rows == 3  # VIN001, VIN002, VIN003
        assert result.matched_rows == 2  # VIN001, VIN002
        assert result.unmatched_rows == 1  # VIN003
        assert result.total_images == 3
