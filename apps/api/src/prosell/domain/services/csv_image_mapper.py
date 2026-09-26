"""CSV Image Mapper — associates ZIP images with CSV rows via path matching.

This service reads a ZIP file containing vehicle images organized in folders,
matches each folder to a CSV row using the `path` column, and generates
normalized DO Spaces keys for upload.

Matching strategy:
- CSV `path` (e.g. "Ford/Explorer/2020") is matched as a folder prefix in the ZIP
- All files under that folder are associated with the vehicle VIN
- Unmatched paths are reported separately

DO Spaces key format:
  {do_spaces_prefix}/{tenant_id}/{organization_id}/{vin}/{filename}
"""

import re
import zipfile
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import PurePosixPath
from uuid import UUID

# Characters allowed in the DO Spaces key beyond the base filename alphabet
# `[A-Za-z0-9._-]`. Anything outside this set is replaced with `_` so the
# resulting key round-trips through the DTO storage-key validator in
# `application/dto/product/create.py` (whose `[A-Za-z0-9._/\-]+` regex
# would otherwise reject e.g. spaces, parens, colons).
#
# The DTO regex is ALSO relaxed to accept spaces + parens for backward
# compatibility with already-imported products (see create.py), but the
# mapper still normalizes aggressively here so every fresh import lands
# on a clean, predictable key — fewer special chars means fewer places
# that need URL-encoding-aware code.
_FILENAME_NORMALIZE_RE = re.compile(r"[^A-Za-z0-9._\-]")
_FILENAME_COLLAPSE_RE = re.compile(r"_+")

# =============================================================================
# SIZE LIMITS (prevent ZIP bomb / decompression bomb attacks)
# =============================================================================

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB per file
MAX_TOTAL_SIZE = 500 * 1024 * 1024  # 500 MB total decompressed


# =============================================================================
# DATA CLASSES
# =============================================================================


@dataclass
class MappedImage:
    """A single image matched from ZIP to a vehicle."""

    vin: str
    csv_path: str
    original_zip_key: str  # e.g. "Ford/Explorer/2020/img1.jpg"
    do_spaces_key: str  # e.g. "vehicles/{tid}/{oid}/{vin}/img1.jpg"
    file_bytes: bytes


@dataclass
class UnmatchedPath:
    """A CSV row with a path that has no matching folder in the ZIP."""

    vin: str
    csv_path: str


@dataclass
class ImageMappingResult:
    """Result of mapping ZIP images to CSV rows."""

    mapped: list[MappedImage] = field(default_factory=list)
    unmatched: list[UnmatchedPath] = field(default_factory=list)

    @property
    def total_rows(self) -> int:
        matched_vins = {m.vin for m in self.mapped}
        unmatched_vins = {u.vin for u in self.unmatched}
        return len(matched_vins | unmatched_vins)

    @property
    def matched_rows(self) -> int:
        return len({m.vin for m in self.mapped})

    @property
    def unmatched_rows(self) -> int:
        return len({u.vin for u in self.unmatched})

    @property
    def total_images(self) -> int:
        return len(self.mapped)


# =============================================================================
# SERVICE
# =============================================================================


class CSVImageMapper:
    """
    Maps vehicle images from a ZIP archive to CSV rows based on path matching.

    The ZIP is expected to have a folder-per-vehicle structure:
      Ford/Explorer/2020/img1.jpg
      Ford/Explorer/2020/img2.jpg

    Each CSV row carries a `path` column. If that path matches a folder
    prefix inside the ZIP, all files under that folder are associated with
    the VIN from that row.
    """

    def __init__(self, do_spaces_prefix: str = "vehicles") -> None:
        """
        Initialize CSVImageMapper.

        Args:
            do_spaces_prefix: Prefix for DO Spaces object keys (default: "vehicles")
        """
        self.do_spaces_prefix = do_spaces_prefix

    def map_images(
        self,
        zip_bytes: bytes,
        parsed_rows: Sequence[Mapping[str, object]],
        tenant_id: UUID,
        organization_id: UUID,
    ) -> ImageMappingResult:
        """
        Map ZIP images to CSV rows by matching paths.

        Args:
            zip_bytes: Raw bytes of the ZIP archive
            parsed_rows: List of dicts with at least `vin` and `path` keys
            tenant_id: Tenant ID for DO Spaces key generation
            organization_id: Organization ID for DO Spaces key generation

        Returns:
            ImageMappingResult with matched images and unmatched paths
        """
        zip_contents = self._read_zip_contents(zip_bytes)

        mapped: list[MappedImage] = []
        unmatched: list[UnmatchedPath] = []

        for row in parsed_rows:
            # `asdict(MappedCSVRow)` produces `image_path` (the dataclass
            # field name set in `csv_field_mapper.py:355`). Fall back to
            # `path` for backwards compatibility with callers that hand
            # the mapper a raw CSV row dict instead of a mapped one.
            csv_path = row.get("image_path") or row.get("path", "")
            vin_value = row.get("vin", "")
            vin = vin_value if isinstance(vin_value, str) else ""

            # Skip rows without a usable path
            if not csv_path or not isinstance(csv_path, str):
                continue

            csv_path = csv_path.strip()
            if not csv_path:
                continue

            # Try two matching strategies to handle both cases:
            # 1. Full path match: "Ford/Explorer/2020" → "Ford/Explorer/2020/img1.jpg"
            # 2. Last segment match, at any nesting depth: "Users/.../2016-KIA-OPTIMA"
            #    matches both "2016-KIA-OPTIMA/img1.jpg" (folder at ZIP root) and
            #    "DK/2016-KIA-OPTIMA/img1.jpg" (client zips multiple vehicles for
            #    the same org together under one org-code parent folder, so the
            #    vehicle folder is nested one level deeper than the ZIP root).

            # Strategy 1: exact prefix match (original behavior)
            prefix = csv_path + "/"
            matching_keys = [k for k in zip_contents if k.startswith(prefix)]

            # Strategy 2: if no match, try last segment as a full path
            # component anywhere in the key (not just at the ZIP root).
            # Wrapping both sides in "/" requires the segment to be a whole
            # folder name at a "/" boundary, so "VL" never matches inside
            # "OTHER-VL-EXTRA" — only an exact folder named "VL".
            if not matching_keys:
                last_segment = csv_path.rstrip("/").split("/")[-1]
                needle = f"/{last_segment}/"
                matching_keys = [k for k in zip_contents if needle in f"/{k}"]

            if matching_keys:
                for zip_key in matching_keys:
                    filename = self._sanitize_filename(zip_key.split("/")[-1])
                    do_spaces_key = self._build_do_spaces_key(
                        tenant_id=tenant_id,
                        organization_id=organization_id,
                        vin=vin,
                        filename=filename,
                    )
                    mapped.append(
                        MappedImage(
                            vin=vin,
                            csv_path=csv_path,
                            original_zip_key=zip_key,
                            do_spaces_key=do_spaces_key,
                            file_bytes=zip_contents[zip_key],
                        )
                    )
            else:
                unmatched.append(UnmatchedPath(vin=vin, csv_path=csv_path))

        return ImageMappingResult(mapped=mapped, unmatched=unmatched)

    def _read_zip_contents(self, zip_bytes: bytes) -> dict[str, bytes]:
        """
        Read ZIP bytes and return a dict mapping file paths to their bytes.

        Args:
            zip_bytes: Raw bytes of the ZIP archive

        Returns:
            Dict mapping ZIP entry names (e.g. "Ford/Explorer/img1.jpg") to bytes

        Raises:
            ValueError: If the bytes do not represent a valid ZIP file,
                       or if any entry exceeds MAX_FILE_SIZE, or total
                       decompressed size exceeds MAX_TOTAL_SIZE.
        """
        try:
            buffer = BytesIO(zip_bytes)
            total_size = 0
            contents: dict[str, bytes] = {}
            with zipfile.ZipFile(buffer) as zf:
                for info in zf.infolist():
                    if info.is_dir():
                        continue
                    if info.file_size > MAX_FILE_SIZE:
                        raise ValueError(
                            f"ZIP entry '{info.filename}' exceeds maximum file size "
                            f"{MAX_FILE_SIZE} bytes (uncompressed: {info.file_size})"
                        )
                    file_bytes = zf.read(info.filename)
                    total_size += len(file_bytes)
                    if total_size > MAX_TOTAL_SIZE:
                        raise ValueError(
                            f"ZIP total decompressed size exceeds maximum {MAX_TOTAL_SIZE} bytes"
                        )
                    contents[info.filename] = file_bytes
            return contents
        except zipfile.BadZipFile as e:
            raise ValueError(f"Invalid ZIP file: {e}") from e

    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize a filename extracted from a ZIP entry.

        Strips all path components, keeping only the base name. Rejects
        filenames containing path separators (path traversal attempts).
        Normalizes characters that the DTO storage-key regex
        (`application/dto/product/create.py`) would reject — without
        this step, a real-world phone-cam filename like
        ``WhatsApp Image 2026-09-12 at 8.42.31 AM (1).jpeg`` lands in
        the DB with spaces/parens and the product becomes uneditable
        (the PATCH validator raises 422 on the round-trip). Anything
        outside ``[A-Za-z0-9._-]`` is replaced with ``_``; runs of ``_``
        collapse to a single ``_``; leading/trailing ``_`` are stripped.

        Args:
            filename: Raw filename from ZIP entry

        Returns:
            Sanitized base filename safe for use in DO Spaces keys

        Raises:
            ValueError: If filename is empty or contains path separators.
        """
        # Reject Windows-style backslash separators outright (invalid in POSIX paths)
        if "\\" in filename:
            raise ValueError(f"Invalid filename in ZIP: '{filename}'")
        # Reject path traversal: ".." as a path component would escape the
        # intended directory after PurePosixPath normalizes it away.
        # We check parts directly so traversal like "../../../etc/passwd" is caught.
        if ".." in PurePosixPath(filename).parts:
            raise ValueError(f"Invalid filename in ZIP: '{filename}'")
        # Use PurePosixPath to extract base name (handles edge cases)
        base = PurePosixPath(filename).name
        if not base:
            raise ValueError(f"Invalid filename in ZIP: '{filename}'")
        # Normalize characters outside `[A-Za-z0-9._-]` to `_`, collapse
        # runs, strip leading/trailing underscores. Applied AFTER the path-
        # component strip so the basename keeps its dot (extension separator).
        normalized = _FILENAME_NORMALIZE_RE.sub("_", base)
        normalized = _FILENAME_COLLAPSE_RE.sub("_", normalized).strip("_")
        if not normalized:
            # Filename was made entirely of disallowed chars (e.g. " ( ).jpeg"
            # would normalize to "jpeg" because the dot and letters survive,
            # but " ( ) " alone would collapse to ""). Reject as invalid.
            raise ValueError(f"Invalid filename in ZIP: '{filename}'")
        return normalized

    def _build_do_spaces_key(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        vin: str,
        filename: str,
    ) -> str:
        """
        Build a normalized DO Spaces object key.

        Format: orgs/{tenant_id}/{prefix}/{organization_id}/{vin}/{filename}

        The `orgs/<tenant-uuid>/` prefix is the canonical storage key shape
        required by the image_urls DTO validator (create.py) and the
        tenant-scope check (validate_image_urls_for_tenant) — without it,
        the edit form's round-trip of an unchanged bulk-uploaded product's
        existing image keys gets rejected on save.

        Args:
            tenant_id: Tenant ID
            organization_id: Organization ID
            vin: Vehicle VIN
            filename: Sanitized filename from ZIP

        Returns:
            DO Spaces key string
        """
        return f"orgs/{tenant_id}/{self.do_spaces_prefix}/{organization_id}/{vin}/{filename}"
