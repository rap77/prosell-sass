"""Export a tenant's published catalog as client-format CSV + image ZIP.

u1-catalog-export-api: assembles a single ZIP (BR1.5) containing the
client-format CSV (24 columns, ';' separator, BR1.3/BR1.4) at its root
plus one folder per vehicle with its available images (BR2.1-BR2.4).
Read-only — no persisted entity is created or modified (Domain Design
ADR-002, `entities.md`).
"""

import asyncio
import csv
import io
import logging
import time
import zipfile
from collections import defaultdict
from collections.abc import Mapping
from dataclasses import dataclass
from uuid import UUID

from prosell.application.ports.ido_spaces import IDOSpacesService, StorageReadError
from prosell.domain.entities.product import Product
from prosell.domain.exceptions.product_exceptions import (
    EmptyCatalogExportError,
    ExportLimitExceededError,
)
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.category_translation import resolve_client_category_type
from prosell.domain.services.csv_export import (
    CLIENT_FORMAT_COLUMNS,
    build_client_format_path,
    build_client_format_row,
    build_image_folder_name,
    build_vehicle_zip_folder_name,
)
from prosell.domain.services.csv_image_mapper import CSVImageMapper
from prosell.domain.services.storage_keys import extract_storage_key_from_value
from prosell.domain.value_objects.product_status import ProductStatus

logger = logging.getLogger(__name__)

# Resource cap (scalability-design.md NFR3.1) — a single named constant so
# the business ever revising it has one point of change.
EXPORT_MAX_PRODUCTS = 500

# performance-design.md NFR-PERF-1 — bounds simultaneous DO Spaces reads
# regardless of how many products/images the export covers.
_MAX_CONCURRENT_IMAGE_READS = 20

# reliability-design.md NFR-REL-1 — 1 retry per image before giving up.
_IMAGE_READ_RETRY_BACKOFF_SECONDS = 0.2

_CSV_FILENAME = "catalogo.csv"


def _attr_str(attributes: Mapping[str, object], key: str) -> str | None:
    """Read one `Product.attributes` value as `str | None` (FR7) — the
    JSONB column is typed `object` per key; every FR7 column this use
    case resolves explicitly (`vin`, `body_type`, `title_status`,
    `title_state`) is expected to already be a plain string, so this is
    a type-narrowing helper, not a format conversion."""
    value = attributes.get(key)
    return None if value is None else str(value)


def _attr_str_list(attributes: Mapping[str, object], key: str) -> list[str] | None:
    """Read `attributes["facebook_groups"]` as `list[str] | None` (BR1.2)."""
    value = attributes.get(key)
    if isinstance(value, list):
        return [str(item) for item in value]
    return None


@dataclass(frozen=True)
class ExportCatalogClientFormatResult:
    """The assembled export (`ExportCatalogResult`, entities.md).

    `organization_code` is surfaced only so the router can build a
    readable download filename — it plays no role in the ZIP's own
    content, which already embeds the sanitized code in every folder
    name via `build_vehicle_zip_folder_name()`. It is `None` for a
    single-organization export whose organization has no code AND for
    every `all_organizations=True` export (u1-cross-org-export-api) —
    ambiguous across 2+ organizations, so the router's own filename for
    that mode never depends on it (BR2.8: fixed `catalogo_TODAS_*`
    pattern instead).

    `organization_count` is `None` for a single-organization export
    (the concept doesn't apply) and the count of DISTINCT organizations
    actually represented in the export for `all_organizations=True`
    (BR2.5/FR6.1) — surfaced so the router's own cross-org audit log
    (`product_router.py`, "Cross-org catalog export: ...") can report it
    without re-deriving it from the ZIP.
    """

    zip_bytes: bytes
    product_count: int
    organization_code: str | None
    organization_count: int | None = None


class ExportCatalogClientFormatUseCase:
    """Export a tenant's `published` catalog as client-format CSV + image ZIP."""

    def __init__(
        self,
        product_repository: AbstractProductRepository,
        organization_repository: AbstractOrganizationRepository,
        do_spaces_service: IDOSpacesService,
        category_repository: AbstractCategoryRepository,
        image_mapper: CSVImageMapper | None = None,
    ) -> None:
        self._product_repository = product_repository
        self._organization_repository = organization_repository
        self._do_spaces_service = do_spaces_service
        self._category_repository = category_repository
        # Reuses CSVImageMapper's proven filename sanitizer (BR2.4/NFR2 —
        # security-design.md sanctions either `_slug_part()` or this one;
        # this one is the right choice for a FILE name because it keeps
        # the extension instead of collapsing it into the slug).
        self._image_mapper = image_mapper or CSVImageMapper()

    async def execute(
        self,
        *,
        organization_id: UUID | None,
        all_organizations: bool,
        base_folder: str,
        facebook_groups_fallback: str,
    ) -> ExportCatalogClientFormatResult:
        """Build the export ZIP for the resolved catalog scope.

        `organization_id` is the effective tenant ALREADY RESOLVED and
        authorized by the router (u1-cross-org-export-api) — this use
        case makes no authorization decision of its own. When
        `all_organizations` is `True`, `organization_id` is ignored and
        the catalog scope is every `published` product on the platform
        (BR2.2); otherwise `organization_id` is the single effective
        tenant (the caller's own organization or an already-authorized
        cross-org target).

        Raises:
            EmptyCatalogExportError: No `published` products in scope
                (BR4.1).
            ExportLimitExceededError: More than `EXPORT_MAX_PRODUCTS`
                `published` products in scope — a GLOBAL cap across all
                organizations when `all_organizations=True` (BR2.4/BR3.1).
        """
        if not all_organizations and organization_id is None:
            # Defense in depth: the router always resolves a concrete
            # `organization_id` before calling execute() when
            # `all_organizations` is False (never omitted, per BR2.2/FR1.4).
            # Fail closed here too, so a future caller can't silently widen
            # the scope to every tenant by omitting both.
            raise ValueError("organization_id is required when all_organizations is False")

        started_at = time.monotonic()

        tenant_filter = None if all_organizations else organization_id

        count = await self._product_repository.count(
            tenant_id=tenant_filter,
            status=ProductStatus.PUBLISHED,
        )
        if count == 0:
            raise EmptyCatalogExportError(
                tenant_id="ALL_ORGS" if all_organizations else str(organization_id)
            )
        if count > EXPORT_MAX_PRODUCTS:
            logger.warning(
                "catalog_export.limit_exceeded scope=%s organization_id=%s attempted_count=%s "
                "limit=%s",
                "ALL_ORGS" if all_organizations else "SINGLE",
                None if all_organizations else organization_id,
                count,
                EXPORT_MAX_PRODUCTS,
            )
            raise ExportLimitExceededError(count=count, limit=EXPORT_MAX_PRODUCTS)

        products = await self._product_repository.get_all(
            tenant_id=tenant_filter,
            status=ProductStatus.PUBLISHED,
            skip=0,
            limit=EXPORT_MAX_PRODUCTS,
        )

        # Batch-resolve every distinct organization's code in ONE round
        # trip before the per-product loop (BR2.3) — same pattern as
        # `bulk_upload_vehicles.py:_resolve_org_codes()`, cross-tenant
        # direction. Works identically for the single-organization path
        # (the set has exactly one element) — no separate code path.
        distinct_org_ids = list({p.organization_id for p in products})
        organizations = await self._organization_repository.get_by_ids(distinct_org_ids)
        org_code_by_id: dict[UUID, str | None] = {o.id: o.code for o in organizations}

        # Lazy cache: leaf category_id -> resolved root vertical slug
        # (BR1.3) — avoids repeating the parent_id walk-up for products
        # that share a category.
        vertical_slug_by_leaf_category_id: dict[UUID, str | None] = {}

        rows: list[list[str]] = []
        # Per-INCLUDED-product metadata needed to place images in the
        # right ZIP folder, kept parallel to `included_products` by
        # index. A product excluded by BR1.7 (no category translation)
        # gets no row and no image folder at all.
        folder_names: list[str] = []
        image_urls_by_product: list[list[str]] = []
        included_products: list[Product] = []

        for product in products:
            vertical_slug = await self._resolve_vertical_slug(
                product.category_id, vertical_slug_by_leaf_category_id
            )
            translation = (
                resolve_client_category_type(vertical_slug) if vertical_slug is not None else None
            )
            if translation is None:
                # BR1.7 — vertical outside the translated vocabulary
                # (e.g. not the vehicles vertical): exclude the product
                # entirely, no row and no image folder.
                continue
            category, vehicle_type = translation

            attrs = product.attributes or {}
            org_code = org_code_by_id.get(product.organization_id)
            product_folder_name = build_image_folder_name(
                year=attrs.get("year"),
                make=attrs.get("make"),
                model=attrs.get("model"),
                mileage=attrs.get("mileage"),
                color=attrs.get("exterior_color"),
                org_code=org_code,
            )

            rows.append(
                build_client_format_row(
                    product_id=product.id,
                    org_code=org_code,
                    price_cents=product.price_cents,
                    description=product.description,
                    attributes=attrs,
                    vin=_attr_str(attrs, "vin"),
                    body_style=_attr_str(attrs, "body_type"),
                    title_status=_attr_str(attrs, "title_status"),
                    facebook_groups=_attr_str_list(attrs, "facebook_groups"),
                    facebook_groups_fallback=facebook_groups_fallback,
                    state=_attr_str(attrs, "title_state"),
                    category=category,
                    vehicle_type=vehicle_type,
                    location_city=product.location_city,
                    location_state=product.location_state,
                    path=build_client_format_path(base_folder, org_code, product_folder_name),
                )
            )
            folder_names.append(
                build_vehicle_zip_folder_name(
                    year=attrs.get("year"),
                    make=attrs.get("make"),
                    model=attrs.get("model"),
                    mileage=attrs.get("mileage"),
                    color=attrs.get("exterior_color"),
                    org_code=org_code,
                )
            )
            image_urls_by_product.append(list(product.image_urls or []))
            included_products.append(product)

        images_by_product = await self._read_all_images(
            product_ids=[p.id for p in included_products],
            image_urls_by_product=image_urls_by_product,
        )

        zip_bytes = self._assemble_zip(rows, folder_names, images_by_product)

        duration_ms = int((time.monotonic() - started_at) * 1000)
        if all_organizations:
            # BR2.5/FR6.1 — distinguishable from a single-organization
            # export by event name AND `scope=ALL_ORGS`, so it's
            # grep-able if the platform's whole catalog is ever exported
            # at once. `user`/`own_org` are NOT logged here — the use
            # case has no identity context; the router's own existing
            # cross-org audit log ("Cross-org catalog export: user=...
            # own_org=...") is extended (Step 10) to carry them for this
            # mode, using `organization_count` from this result.
            logger.info(
                "catalog_export.completed_all_orgs scope=ALL_ORGS product_count=%s "
                "organization_count=%s duration_ms=%s",
                len(included_products),
                len(distinct_org_ids),
                duration_ms,
            )
        else:
            logger.info(
                "catalog_export.completed organization_id=%s product_count=%s duration_ms=%s",
                organization_id,
                len(included_products),
                duration_ms,
            )

        organization_code = None
        if not all_organizations and organization_id is not None:
            organization_code = org_code_by_id.get(organization_id)

        return ExportCatalogClientFormatResult(
            zip_bytes=zip_bytes,
            product_count=len(included_products),
            organization_code=organization_code,
            organization_count=len(distinct_org_ids) if all_organizations else None,
        )

    async def _resolve_vertical_slug(
        self,
        leaf_category_id: UUID,
        cache: dict[UUID, str | None],
    ) -> str | None:
        """Walk `parent_id` up from a leaf category to its root vertical
        and return that vertical's `slug` (BR1.3), cached per leaf id.

        `product.category_id` always points at a LEAF node, never the
        vertical itself — a category tree is multi-level (parent_id,
        level), so this walk-up is required; a direct lookup by
        `category_id` would incorrectly treat almost every product as
        having no translation. Returns `None` when the leaf category
        itself can't be resolved (deleted/invalid `category_id`) —
        the caller then excludes the product via BR1.7's same path.
        """
        if leaf_category_id in cache:
            return cache[leaf_category_id]

        current = await self._category_repository.get_by_id_cross_tenant(leaf_category_id)
        while current is not None and current.parent_id is not None:
            current = await self._category_repository.get_by_id_cross_tenant(current.parent_id)

        vertical_slug = current.slug if current is not None else None
        cache[leaf_category_id] = vertical_slug
        return vertical_slug

    async def _read_all_images(
        self,
        *,
        product_ids: list[UUID],
        image_urls_by_product: list[list[str]],
    ) -> dict[int, list[tuple[str, bytes]]]:
        """Read every image for every product, bounded by one shared
        semaphore across the whole export (NFR-PERF-1) — a failed image
        is skipped, never aborts its product or the export (BR4.2).

        Returns a mapping of product index -> [(filename, bytes), ...].
        """
        jobs: list[tuple[int, str]] = [
            (index, url) for index, urls in enumerate(image_urls_by_product) for url in urls
        ]
        if not jobs:
            return {}

        semaphore = asyncio.Semaphore(_MAX_CONCURRENT_IMAGE_READS)
        file_bytes_results = await asyncio.gather(
            *(
                self._read_image_with_retry(product_ids[index], url, semaphore)
                for index, url in jobs
            )
        )

        images_by_product: dict[int, list[tuple[str, bytes]]] = defaultdict(list)
        for (index, image_url), file_bytes in zip(jobs, file_bytes_results, strict=True):
            if file_bytes is None:
                continue
            raw_filename = (extract_storage_key_from_value(image_url) or image_url).rsplit("/", 1)[
                -1
            ]
            try:
                # Reaches into CSVImageMapper's proven sanitizer rather
                # than duplicating it (BR2.4) — see security-design.md.
                filename = self._image_mapper._sanitize_filename(raw_filename)
            except ValueError:
                logger.warning(
                    "catalog_export.image_read_failed product_id=%s image_key=%s",
                    product_ids[index],
                    image_url,
                )
                continue
            images_by_product[index].append((filename, file_bytes))
        return images_by_product

    async def _read_image_with_retry(
        self,
        product_id: UUID,
        image_url: str,
        semaphore: asyncio.Semaphore,
    ) -> bytes | None:
        """Read one image's bytes, with 1 retry + 200ms backoff (NFR-REL-1).

        Never raises — a failure (missing key, storage error, or both
        attempts exhausted) is logged as a warning and returns `None`
        so the caller can drop just this image (BR4.2).
        """
        key = extract_storage_key_from_value(image_url)
        if not key:
            logger.warning(
                "catalog_export.image_read_failed product_id=%s image_key=%s",
                product_id,
                image_url,
            )
            return None

        async with semaphore:
            for attempt in range(2):  # original attempt + 1 retry
                started_at = time.monotonic()
                try:
                    file_bytes = await self._do_spaces_service.get_object(key)
                    logger.info(
                        "catalog_export.image_read duration_ms=%d product_id=%s",
                        (time.monotonic() - started_at) * 1000,
                        product_id,
                    )
                    return file_bytes
                except StorageReadError:
                    if attempt == 0:
                        await asyncio.sleep(_IMAGE_READ_RETRY_BACKOFF_SECONDS)
                        continue
                    logger.warning(
                        "catalog_export.image_read_failed product_id=%s image_key=%s",
                        product_id,
                        key,
                    )
                    return None
        return None

    def _assemble_zip(
        self,
        rows: list[list[str]],
        folder_names: list[str],
        images_by_product: dict[int, list[tuple[str, bytes]]],
    ) -> bytes:
        """Combine the CSV and every vehicle's images into one ZIP (BR1.5).

        Every path written inside the archive is built exclusively from
        `folder_names` (already sanitized end-to-end by
        `build_vehicle_zip_folder_name()`) and a sanitized filename
        (NFR2/BR2.4) — never a raw, unsanitized product attribute.
        """
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            csv_buffer = io.StringIO()
            writer = csv.writer(csv_buffer, delimiter=";")
            writer.writerow(CLIENT_FORMAT_COLUMNS)
            writer.writerows(rows)
            archive.writestr(_CSV_FILENAME, csv_buffer.getvalue())

            for index, folder_name in enumerate(folder_names):
                for filename, file_bytes in images_by_product.get(index, []):
                    archive.writestr(f"{folder_name}{filename}", file_bytes)

        return buffer.getvalue()
