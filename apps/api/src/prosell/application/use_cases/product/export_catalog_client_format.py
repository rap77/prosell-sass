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
from dataclasses import dataclass
from uuid import UUID

from prosell.application.ports.ido_spaces import IDOSpacesService, StorageReadError
from prosell.domain.exceptions.product_exceptions import (
    EmptyCatalogExportError,
    ExportLimitExceededError,
)
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.csv_export import (
    CLIENT_FORMAT_COLUMNS,
    build_client_format_row,
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


@dataclass(frozen=True)
class ExportCatalogClientFormatResult:
    """The assembled export (`ExportCatalogResult`, entities.md).

    `organization_code` is surfaced only so the router can build a
    readable download filename — it plays no role in the ZIP's own
    content, which already embeds the sanitized code in every folder
    name via `build_vehicle_zip_folder_name()`.
    """

    zip_bytes: bytes
    product_count: int
    organization_code: str | None


class ExportCatalogClientFormatUseCase:
    """Export a tenant's `published` catalog as client-format CSV + image ZIP."""

    def __init__(
        self,
        product_repository: AbstractProductRepository,
        organization_repository: AbstractOrganizationRepository,
        do_spaces_service: IDOSpacesService,
        image_mapper: CSVImageMapper | None = None,
    ) -> None:
        self._product_repository = product_repository
        self._organization_repository = organization_repository
        self._do_spaces_service = do_spaces_service
        # Reuses CSVImageMapper's proven filename sanitizer (BR2.4/NFR2 —
        # security-design.md sanctions either `_slug_part()` or this one;
        # this one is the right choice for a FILE name because it keeps
        # the extension instead of collapsing it into the slug).
        self._image_mapper = image_mapper or CSVImageMapper()

    async def execute(self, *, tenant_id: UUID) -> ExportCatalogClientFormatResult:
        """Build the export ZIP for `tenant_id`'s `published` catalog.

        Raises:
            EmptyCatalogExportError: No `published` products (BR4.1).
            ExportLimitExceededError: More than `EXPORT_MAX_PRODUCTS`
                `published` products (BR3.1).
        """
        started_at = time.monotonic()

        count = await self._product_repository.count(
            tenant_id=tenant_id,
            status=ProductStatus.PUBLISHED,
        )
        if count == 0:
            raise EmptyCatalogExportError(tenant_id=str(tenant_id))
        if count > EXPORT_MAX_PRODUCTS:
            logger.warning(
                "catalog_export.limit_exceeded organization_id=%s attempted_count=%s limit=%s",
                tenant_id,
                count,
                EXPORT_MAX_PRODUCTS,
            )
            raise ExportLimitExceededError(count=count, limit=EXPORT_MAX_PRODUCTS)

        organization = await self._organization_repository.get_by_tenant_id(tenant_id)
        org_code = organization.code if organization else None

        products = await self._product_repository.get_all(
            tenant_id=tenant_id,
            status=ProductStatus.PUBLISHED,
            skip=0,
            limit=EXPORT_MAX_PRODUCTS,
        )

        rows: list[list[str]] = []
        # Per-product metadata needed to place images in the right ZIP
        # folder, kept parallel to `products` by index.
        folder_names: list[str] = []
        image_urls_by_product: list[list[str]] = []

        for product in products:
            attrs = product.attributes or {}
            rows.append(
                build_client_format_row(
                    product_id=product.id,
                    org_code=org_code,
                    price_cents=product.price_cents,
                    description=product.description,
                    attributes=attrs,
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

        images_by_product = await self._read_all_images(
            product_ids=[p.id for p in products],
            image_urls_by_product=image_urls_by_product,
        )

        zip_bytes = self._assemble_zip(rows, folder_names, images_by_product)

        duration_ms = int((time.monotonic() - started_at) * 1000)
        logger.info(
            "catalog_export.completed organization_id=%s product_count=%s duration_ms=%s",
            tenant_id,
            len(products),
            duration_ms,
        )

        return ExportCatalogClientFormatResult(
            zip_bytes=zip_bytes,
            product_count=len(products),
            organization_code=org_code,
        )

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
