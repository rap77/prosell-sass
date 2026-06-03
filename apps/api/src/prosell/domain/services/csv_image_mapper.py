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

import zipfile
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import PurePosixPath
from uuid import UUID

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
        parsed_rows: list[dict],
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
            vin = row.get("vin", "")

            # Skip rows without a usable path
            if not csv_path or not isinstance(csv_path, str):
                continue

            csv_path = csv_path.strip()
            if not csv_path:
                continue

            # Find all ZIP entries under this path prefix
            prefix = csv_path + "/"
            matching_keys = [k for k in zip_contents if k.startswith(prefix)]

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

        Strips all path components, keeping only the base name.
        Rejects filenames containing path separators (path traversal attempts).

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
        return base

    def _build_do_spaces_key(
        self,
        tenant_id: UUID,
        organization_id: UUID,
        vin: str,
        filename: str,
    ) -> str:
        """
        Build a normalized DO Spaces object key.

        Format: {prefix}/{tenant_id}/{organization_id}/{vin}/{filename}

        Args:
            tenant_id: Tenant ID
            organization_id: Organization ID
            vin: Vehicle VIN
            filename: Sanitized filename from ZIP

        Returns:
            DO Spaces key string
        """
        return f"{self.do_spaces_prefix}/{tenant_id}/{organization_id}/{vin}/{filename}"
