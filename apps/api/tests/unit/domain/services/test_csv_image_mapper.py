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
        # Spaces around the name (left by `PurePosixPath.name` when the
        # original had whitespace) are normalized to `_` then stripped,
        # yielding a clean basename. The path-component strip happens
        # BEFORE character normalization, so the basename is preserved.
        assert mapper._sanitize_filename(" Ford / Explorer / img1.jpg ") == "img1.jpg"

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

    def test_normalizes_phone_cam_filenames(self) -> None:
        """Regression: real-world phone-cam filenames contain spaces,
        parens, and colons — all of which the DTO storage-key regex
        rejects. The sanitizer must rewrite them to the safe alphabet
        so the resulting DO Spaces key round-trips through every PATCH
        / GET. Verified by the production error where a product with
        `WhatsApp Image 2026-09-12 at 8.42.31 AM (1).jpeg` became
        uneditable (422 on save) until the bad key was cleaned up.
        """
        mapper = CSVImageMapper()
        assert (
            mapper._sanitize_filename("WhatsApp Image 2026-09-12 at 8.42.31 AM (1).jpeg")
            == "WhatsApp_Image_2026-09-12_at_8.42.31_AM_1_.jpeg"
        )

    def test_collapses_runs_of_underscores(self) -> None:
        """Adjacent disallowed chars must collapse to a single `_` so
        the resulting filename stays readable (no `___` runs)."""
        mapper = CSVImageMapper()
        # Three disallowed chars in a row — ` ( ` — collapse to `_`.
        assert mapper._sanitize_filename("a ( b.jpg") == "a_b.jpg"

    def test_strips_leading_trailing_underscores(self) -> None:
        """A filename that starts/ends with disallowed chars (e.g. a
        leading space) should not produce a key with leading `_`."""
        mapper = CSVImageMapper()
        assert mapper._sanitize_filename(" img.jpg") == "img.jpg"
        assert mapper._sanitize_filename("img.jpg ") == "img.jpg"

    def test_rejects_all_disallowed_filename(self) -> None:
        """A filename made entirely of disallowed chars (e.g. spaces +
        parens only) is invalid — there is no recoverable basename."""
        mapper = CSVImageMapper()
        with pytest.raises(ValueError, match="Invalid filename"):
            mapper._sanitize_filename(" ( ) ")


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
        """Canonical shape: orgs/<tenant-uuid>/<prefix>/... -- the DTO-level
        image_urls validator (create.py) and the tenant-scope check
        (validate_image_urls_for_tenant) both require the orgs/<uuid>/
        prefix; a bare vehicles/<uuid>/... key (the old shape) fails the
        edit form's round-trip on any bulk-uploaded product."""
        mapper = CSVImageMapper(do_spaces_prefix="vehicles")
        tid = uuid4()
        oid = uuid4()
        key = mapper._build_do_spaces_key(tid, oid, "VIN123", "img1.jpg")
        assert key == f"orgs/{tid}/vehicles/{oid}/VIN123/img1.jpg"

    def test_custom_prefix(self) -> None:
        mapper = CSVImageMapper(do_spaces_prefix="custom")
        tid = uuid4()
        oid = uuid4()
        key = mapper._build_do_spaces_key(tid, oid, "VIN123", "img1.jpg")
        assert key.startswith(f"orgs/{tid}/custom/")


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
                == f"orgs/{tid}/vehicles/{oid}/VIN001/{m.original_zip_key.split('/')[-1]}"
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

    def test_matches_by_last_path_segment(self) -> None:
        """Test that mapper matches by last segment of path, not full path.

        CSV path: Users/juanl/.../DK/2016-KIA-OPTIMA-118K-BLANCO-DK
        ZIP entry: 2016-KIA-OPTIMA-118K-BLANCO-DK/1.jpeg
        Should match because last segment is identical.
        """
        zip_bytes = make_zip(
            {
                "2016-KIA-OPTIMA-118K-BLANCO-DK/1.jpeg": b"img1",
                "2016-KIA-OPTIMA-118K-BLANCO-DK/2.jpeg": b"img2",
                "2017-KIA-FORTE-131K-AZUL-DK/1.jpeg": b"img3",
            }
        )
        rows = self._make_rows(
            (
                "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/DK/"
                "2016-KIA-OPTIMA-118K-BLANCO-DK",
                "VIN001",
            ),
            (
                "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/DK/2017-KIA-FORTE-131K-AZUL-DK",
                "VIN002",
            ),
        )
        mapper = CSVImageMapper()
        result = mapper.map_images(zip_bytes, rows, uuid4(), uuid4())

        assert result.matched_rows == 2
        assert result.total_images == 3

    def test_matches_last_segment_nested_under_an_extra_parent_folder(self) -> None:
        """Real client scenario: multiple vehicles for the same org are
        zipped together under one parent folder per org code (e.g. `VL/`),
        so the vehicle folder isn't at the ZIP root -- it's nested one level
        deeper. The last-segment match must still find it.

        CSV path: Users/juanl/.../VL/2025-TOYOTA-COROLLA-5K-AZUL-VL
        ZIP entry: VL/2025-TOYOTA-COROLLA-5K-AZUL-VL/1.jpg  (note the extra
            leading VL/ folder -- this is what broke the original match)
        """
        zip_bytes = make_zip(
            {
                "VL/2025-TOYOTA-COROLLA-5K-AZUL-VL/1.jpg": b"img1",
                "VL/2025-TOYOTA-COROLLA-5K-AZUL-VL/2.jpg": b"img2",
                "VL/2012-JEEP-WRANGLER-144K-ROJO-TG/1.jpg": b"img3",
            }
        )
        rows = self._make_rows(
            (
                "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/VL/"
                "2025-TOYOTA-COROLLA-5K-AZUL-VL",
                "WD4PF1CD0KT011895",
            ),
        )
        mapper = CSVImageMapper()
        result = mapper.map_images(zip_bytes, rows, uuid4(), uuid4())

        assert result.matched_rows == 1
        assert result.total_images == 2
        assert result.unmatched_rows == 0
        matched_keys = {m.original_zip_key for m in result.mapped}
        assert matched_keys == {
            "VL/2025-TOYOTA-COROLLA-5K-AZUL-VL/1.jpg",
            "VL/2025-TOYOTA-COROLLA-5K-AZUL-VL/2.jpg",
        }

    def test_last_segment_match_does_not_false_positive_on_partial_name(self) -> None:
        """A ZIP folder whose name merely CONTAINS the last segment as a
        substring (not as a full path component) must not match -- avoids
        e.g. `2025-TOYOTA-COROLLA-5K-AZUL-VL` matching
        `OTHER-2025-TOYOTA-COROLLA-5K-AZUL-VL-EXTRA`."""
        zip_bytes = make_zip({"OTHER-2025-TOYOTA-COROLLA-5K-AZUL-VL-EXTRA/1.jpg": b"img1"})
        rows = self._make_rows(
            (
                "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/VL/"
                "2025-TOYOTA-COROLLA-5K-AZUL-VL",
                "WD4PF1CD0KT011895",
            ),
        )
        mapper = CSVImageMapper()
        result = mapper.map_images(zip_bytes, rows, uuid4(), uuid4())

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
