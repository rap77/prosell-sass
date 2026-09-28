"""Bulk upload preview use case — dry-run analysis of CSV before import."""

import csv
import io
import logging
import zipfile
from dataclasses import dataclass
from io import StringIO
from pathlib import Path
from typing import cast
from uuid import UUID, uuid4

from prosell.application.dto.product.bulk_upload import (
    PreviewRowResponse,
    PreviewSummaryResponse,
)
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.csv_field_mapper import CSVFieldMapper, MappedCSVRow
from prosell.domain.services.csv_image_mapper import CSVImageMapper

logger = logging.getLogger(__name__)

# Columns in the client CSV that have no mapping to ProSell fields
UNMAPPED_COLUMNS = frozenset({"id", "type", "option"})

# Values carried in `mapped_fields` per the PreviewRowResponse schema:
# strings (cod_organization, vin, locations, etc.), ints/ floats
# (year, mileage), bools (publicado), and string lists (facebook_groups).
MappedFieldValue = str | int | float | bool | list[str]


@dataclass
class PreviewUseCaseResult:
    """Result produced by the preview use case."""

    total_rows: int
    rows: list[PreviewRowResponse]
    summary: PreviewSummaryResponse


class BulkUploadPreviewUseCase:
    """Dry-run analysis of a client-format CSV file.

    This use case:
    - Reads the CSV (semicolon-delimited, 23 columns)
    - Maps each row using CSVFieldMapper
    - Returns per-row analysis WITHOUT modifying the database
    - Collects summary statistics
    """

    def __init__(
        self,
        organization_repository: AbstractOrganizationRepository,
        product_repository: AbstractProductRepository,
    ) -> None:
        """Initialize the preview use case.

        Args:
            organization_repository: Used to resolve CSV org codes
                against existing organizations, scoped to the caller's tenant.
            product_repository: Used to check `vehicle_code` collisions
                against persisted products during the preview's
                dry-run analysis. Injected (not constructed inside) so
                tests can swap an `AsyncMock` and the router can share
                the same session-bound repo as the rest of the request.
        """
        self._organization_repository = organization_repository
        self._product_repository = product_repository
        self._required_fields = {"VIN", "price", "title"}

    async def execute(
        self,
        csv_content: str,
        zip_bytes: bytes | None = None,
        *,
        tenant_id: UUID,
        can_view_all_orgs: bool = False,
    ) -> PreviewUseCaseResult:
        """Analyze CSV content and produce a preview report.

        Args:
            csv_content: Raw CSV string (semicolon-delimited)
            zip_bytes: Optional ZIP file bytes with images
            tenant_id: Tenant ID from JWT context — org-code existence is
                scoped to this tenant only, so a preview never discloses
                whether a code exists in a DIFFERENT organization, unless
                can_view_all_orgs (ORG_ADMIN_VIEW_ALL) is set
            can_view_all_orgs: True to check org-code existence across
                every tenant (super-admin CSV migration flow)

        Returns:
            PreviewUseCaseResult with per-row analysis
        """
        rows: list[PreviewRowResponse] = []
        importable_count = 0
        error_count = 0
        detected_org_codes: set[str] = set()
        csv_rows_for_image_mapping: list[dict[str, str]] = []
        #: `csv_id` (int) → row numbers that share that id — both for
        #: within-CSV duplicate detection and for batched DB lookup.
        csv_id_to_rows: dict[int, list[int]] = {}

        csv_file = StringIO(csv_content)
        reader = csv.DictReader(csv_file, delimiter=";")

        for idx, row_dict in enumerate(reader, start=2):  # start=2: header is row 1
            try:
                preview_row = self._analyze_row(row_dict, idx)
                rows.append(preview_row)

                if preview_row.importable:
                    importable_count += 1
                else:
                    error_count += 1

                # ponytail: collect rows with image paths for ZIP mapping
                if row_dict.get("path"):
                    csv_rows_for_image_mapping.append(row_dict)

                # ponytail: collect org codes from title field (cod_organization)
                if preview_row.title and preview_row.title.strip():
                    detected_org_codes.add(preview_row.title.strip())

                # ponytail: collect csv_id (the legacy id the export writes
                # into `vehicle_code`) for the duplicate + DB-collision
                # validation below. Parsed from the raw row so we capture
                # it even when `_analyze_row` rejects the row for other
                # reasons (the error-stamped row keeps its csv_id).
                csv_id_raw = row_dict.get("id", "")
                if csv_id_raw is not None:
                    csv_id_stripped = csv_id_raw.strip()
                    if csv_id_stripped:
                        try:
                            csv_id_int = int(csv_id_stripped)
                        except ValueError:
                            csv_id_int = None
                        if csv_id_int is not None:
                            csv_id_to_rows.setdefault(csv_id_int, []).append(idx)

            except (ValueError, KeyError, TypeError) as e:
                # ValueError: csv_field_mapper raises on bad VIN/price/missing required
                # KeyError: row_dict missing expected column
                # TypeError: a parsed field has the wrong shape
                logger.warning("Preview row analysis failed: %s", e)
                error_count += 1
                error_csv_id_raw = row_dict.get("id", "") or ""
                error_csv_id = error_csv_id_raw.strip() or None
                rows.append(
                    PreviewRowResponse(
                        row_number=idx,
                        csv_id=error_csv_id,
                        vin="",
                        title="",
                        importable=False,
                        errors=[str(e)],
                    )
                )
                # Same duplicate/collision bookkeeping for the error-stamped
                # row — we still want to flag a duplicated code even when
                # the row itself fails parsing for an unrelated reason.
                if error_csv_id:
                    try:
                        csv_id_int = int(error_csv_id)
                    except ValueError:
                        csv_id_int = None
                    if csv_id_int is not None:
                        csv_id_to_rows.setdefault(csv_id_int, []).append(idx)

        # ponytail: vehicle_code collisions — single batched DB lookup for
        # every distinct csv_id, then per-row error stamping for both
        # within-CSV duplicates and DB collisions. Done BEFORE the ZIP
        # validation so the order of error messages in `errors[]` is
        # deterministic: code issues first, image issues after.
        await self._apply_vehicle_code_validations(rows, csv_id_to_rows)

        total = len(rows)

        # Map images from ZIP if provided
        images_count = 0
        if zip_bytes and csv_rows_for_image_mapping:
            mapper = CSVImageMapper()
            # ponytail: use dummy UUIDs for preview (no actual tenant/org needed)
            mapping_result = mapper.map_images(
                zip_bytes, csv_rows_for_image_mapping, uuid4(), uuid4()
            )
            images_count = mapping_result.total_images

        # ponytail: image-filename validation — only when a ZIP was
        # actually uploaded. CSV-only previews skip this entirely (per
        # the spec); the existing ZIP-folder-prefix matching done above
        # stays unchanged so legacy CSV formats continue to work.
        if zip_bytes:
            self._apply_image_filename_validations(rows, zip_bytes)

        # Recount after the two post-loop validations: both can flip
        # `importable=False` on rows that were previously green, which
        # means `importable_count` / `error_count` from the analysis loop
        # are stale. A row that survives the analysis loop but trips a
        # validation moves from importable → error; `importable_count`
        # drops, `error_count` rises, both by one.
        importable_count = sum(1 for r in rows if r.importable)
        error_count = total - importable_count

        scope_tenant_id = None if can_view_all_orgs else tenant_id
        existing_org_codes = {
            org.code.strip().upper()
            for org in await self._organization_repository.get_by_codes(
                sorted(code.upper() for code in detected_org_codes), tenant_id=scope_tenant_id
            )
            if org.code
        }
        missing_org_codes = sorted(
            code for code in detected_org_codes if code.upper() not in existing_org_codes
        )
        summary = PreviewSummaryResponse(
            importable_count=importable_count,
            error_count=error_count,
            images_count=images_count,
            detected_org_codes=sorted(detected_org_codes),
            missing_org_codes=missing_org_codes,
        )

        return PreviewUseCaseResult(total_rows=total, rows=rows, summary=summary)

    def _analyze_row(self, row: dict[str, str], row_number: int) -> PreviewRowResponse:
        """Analyze a single CSV row.

        Args:
            row: Dictionary of column values
            row_number: 1-indexed row number (header is row 1)

        Returns:
            PreviewRowResponse for this row
        """
        # Map the row using CSVFieldMapper
        mapped: MappedCSVRow = CSVFieldMapper.map_row(row, row_number)

        # Determine mapped fields (everything that has a value)
        mapped_fields: dict[str, MappedFieldValue] = {}
        missing_fields: list[str] = []
        errors: list[str] = []

        # Check required fields
        if not mapped.vin:
            missing_fields.append("VIN")
            errors.append("VIN is required and missing or empty")
        else:
            mapped_fields["attributes.vin"] = mapped.vin

        if mapped.price_cents is not None and mapped.price_cents > 0:
            mapped_fields["price_cents"] = mapped.price_cents
        else:
            missing_fields.append("price")
            errors.append("price is required and must be greater than 0")

        if mapped.cod_organization:
            mapped_fields["title"] = mapped.cod_organization

        # Optional fields with values
        if mapped.location_city:
            mapped_fields["location_city"] = mapped.location_city
        if mapped.location_state:
            mapped_fields["location_state"] = mapped.location_state
        if mapped.year is not None:
            mapped_fields["attributes.year"] = mapped.year
        if mapped.make:
            mapped_fields["attributes.make"] = mapped.make
        if mapped.model:
            mapped_fields["attributes.model"] = mapped.model
        if mapped.mileage is not None:
            mapped_fields["attributes.mileage"] = mapped.mileage
            mapped_fields["attributes.mileage_unit"] = mapped.mileage_unit
        if mapped.body_style:
            mapped_fields["attributes.body_type"] = mapped.body_style
        if mapped.exterior_color:
            mapped_fields["attributes.exterior_color"] = mapped.exterior_color
        if mapped.interior_color:
            mapped_fields["attributes.interior_color"] = mapped.interior_color
        if mapped.clean_title is not None:
            mapped_fields["attributes.clean_title"] = mapped.clean_title
        if mapped.vehicle_condition:
            mapped_fields["attributes.vehicle_condition"] = mapped.vehicle_condition
        if mapped.fuel_type:
            mapped_fields["attributes.fuel_type"] = mapped.fuel_type
        if mapped.transmission:
            mapped_fields["attributes.transmission"] = mapped.transmission
        if mapped.description:
            mapped_fields["description"] = mapped.description
        if mapped.facebook_groups:
            mapped_fields["attributes.facebook_groups"] = mapped.facebook_groups
        if mapped.label:
            mapped_fields["attributes.label"] = mapped.label
        if mapped.publicado:
            mapped_fields["attributes.publicado"] = mapped.publicado

        # Collect unmapped columns (CSV columns that have no ProSell mapping)
        unmapped_csv_columns = [
            col for col in UNMAPPED_COLUMNS if col in row and row[col] and row[col].strip()
        ]

        # Images found (from path field)
        images_found: list[str] = []
        if mapped.image_path:
            images_found.append(mapped.image_path)

        importable = len(missing_fields) == 0 and len(errors) == 0

        # ponytail: csv_id from original file for error tracking
        csv_id = row.get("id", "").strip() or None

        return PreviewRowResponse(
            row_number=mapped.row_number,
            csv_id=csv_id,
            vin=mapped.vin or "",
            title=mapped.cod_organization or "",
            importable=importable,
            mapped_fields=cast(dict[str, str | int | float | bool | list[object]], mapped_fields),
            missing_fields=missing_fields,
            unmapped_csv_columns=unmapped_csv_columns,
            images_found=images_found,
            errors=errors,
        )

    async def _apply_vehicle_code_validations(
        self,
        rows: list[PreviewRowResponse],
        csv_id_to_rows: dict[int, list[int]],
    ) -> None:
        """Flag rows whose `csv_id` (→ `vehicle_code`) is unusable.

        Two distinct failures, both surfaced as `errors[]` entries on the
        offending `PreviewRowResponse` and `importable=False`:

        1. **Within-CSV duplicate** — the same `csv_id` appears on two or
           more rows. The error message lists the OTHER row numbers (not
           the current one), so the user can locate the conflict in the
           file without rereading the whole CSV.
        2. **DB collision** — the `csv_id` is already persisted on some
           other product. Single batched lookup against
           `vehicle_codes_exist(codes)` regardless of how many distinct
           codes are in the CSV — important because the client's data
           can have thousands of rows.

        Args:
            rows: The preview rows already produced by `_analyze_row`.
                Mutated in place: `importable=False` flipped on rows
                that fail validation, and the new error strings
                appended to `errors[]`.
            csv_id_to_rows: Mapping built during the per-row analysis
                loop, `csv_id` → list of row numbers (1-indexed) that
                carry that id. Empty means the CSV had no parseable
                ids and the method is a no-op.
        """
        if not csv_id_to_rows:
            return

        # Build a quick row_number -> row lookup for O(1) stamping.
        row_by_number = {r.row_number: r for r in rows}

        # 1. Within-CSV duplicates — pure local check, no DB.
        for csv_id, row_numbers in csv_id_to_rows.items():
            if len(row_numbers) < 2:
                continue
            # Sort so the "other rows" list is deterministic; exclude
            # the current row when stamping so the message points the
            # user at the OTHER occurrences, not back at itself.
            sorted_rows = sorted(row_numbers)
            for current in sorted_rows:
                other_rows = [r for r in sorted_rows if r != current]
                other_str = ", ".join(str(r) for r in other_rows)
                target = row_by_number.get(current)
                if target is None:
                    continue
                target.errors.append(
                    f"vehicle_code '{csv_id}' is duplicated in this CSV "
                    f"(also on row(s) {other_str})"
                )
                target.importable = False

        # 2. DB collisions — single batched lookup for every distinct
        # code. Empty input short-circuits inside the repo.
        existing_codes = await self._product_repository.vehicle_codes_exist(csv_id_to_rows.keys())
        for csv_id, row_numbers in csv_id_to_rows.items():
            if csv_id not in existing_codes:
                continue
            for row_number in row_numbers:
                target = row_by_number.get(row_number)
                if target is None:
                    continue
                target.errors.append(
                    f"vehicle_code '{csv_id}' already exists in the platform — must be unique"
                )
                target.importable = False

    def _apply_image_filename_validations(
        self,
        rows: list[PreviewRowResponse],
        zip_bytes: bytes,
    ) -> None:
        """Flag rows whose CSV `path` column references a missing ZIP entry.

        Walks the ZIP entry names once (NEVER reads entry bodies — the
        preview is a dry-run and the runtime path is what actually
        uploads bytes), collects every entry's basename into a set,
        and compares each row's `path` basename against the set.

        A row whose basename is not in the set gets
        `importable=False` and the missing-image error appended to
        `errors[]`. Rows whose `path` is empty (or sanitized away to
        `None`) are skipped — no error, since there's nothing to look
        up. Rows whose `path` references a folder prefix (existing
        client CSVs use that shape for `CSVImageMapper` to match
        against folder names) will fail this check by design: the
        basename of a folder path like `IMG/Vehiculos/MF/2020-EXPLORER`
        is `2020-EXPLORER`, which won't be in the ZIP's basename set.
        The legacy folder-prefix matching done by `CSVImageMapper`
        still runs separately, so existing flows are not broken —
        this check just surfaces the case where the user's `path`
        doesn't name a file that exists in the upload.

        Args:
            rows: Preview rows, mutated in place (same contract as
                `_apply_vehicle_code_validations`).
            zip_bytes: Raw ZIP bytes from the upload. Caller guarantees
                `zip_bytes is not None` — this method is only entered
                from the branch that already checked.
        """
        zip_filenames = self._collect_zip_basenames(zip_bytes)
        if not zip_filenames:
            # Empty ZIP or unreadable archive — nothing to validate
            # against. Fail-open: leave rows untouched so the user can
            # still see what the analyzer caught pre-upload.
            return

        # Walk every preview row carrying at least one image reference
        # (`images_found` is populated from `mapped.image_path`, which is
        # the raw `path` column after `_sanitize_path` rejects `..`
        # traversal and empty strings). For path-traversal-rejected
        # rows the sanitized path is None and `images_found` is empty,
        # so we skip the check silently — the row's other validation
        # errors already cover it via the column-allowlist in
        # `csv_field_mapper`.
        for preview_row in rows:
            if not preview_row.images_found:
                continue
            # `images_found` carries whatever `mapped.image_path` was,
            # which is the sanitized raw `path`. The basename check
            # uses THAT value (already stripped of `..` and empty).
            candidate = preview_row.images_found[0]
            basename = Path(candidate).name
            if not basename or basename in zip_filenames:
                continue
            preview_row.errors.append(
                f"image '{candidate}' not found in upload — referenced by "
                f"'path' column but no file in the ZIP matches"
            )
            preview_row.importable = False

    @staticmethod
    def _collect_zip_basenames(zip_bytes: bytes) -> set[str]:
        """Return the set of every ZIP entry's basename, or empty on error.

        Reads entry NAMES only — never decompresses bodies — so this is
        safe for the multi-hundred-MB client uploads. Defensively wraps
        `BadZipFile` / `LargeZipFile` so a malformed upload produces an
        empty set instead of crashing the whole preview; the runtime
        path will fail more loudly on the same bytes.
        """
        names: set[str] = set()
        try:
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
                for entry in zf.infolist():
                    if entry.is_dir():
                        continue
                    base = Path(entry.filename).name
                    if base:
                        names.add(base)
        except (zipfile.BadZipFile, OSError, ValueError) as e:
            # BadZipFile: not a ZIP at all.
            # OSError: corrupt central directory / truncated file.
            # ValueError: oversized filename, etc.
            logger.warning("Preview ZIP basename collection failed: %s", e)
            return set()
        return names
