"""RED test — BulkUploadVehiclesUseCase must persist image_urls to the top-level field.

Bug reference: `.mm-flow/planning/changes/product-image-association-bug/`
The use case at `apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py`
has a TODO at line 286 — it counts the mapped images but never attaches
them to the product's `image_urls` top-level field.

This test currently FAILS because the use case:
1. Creates the product via `repo.create(...)` WITHOUT image_urls.
2. Never calls `repo.update(...)` to set image_urls from the ZIP mapping.

After T8 (bulk upload fix), the product persisted/updated by the use
case must have `image_urls` populated with the DO Spaces keys derived
from the ZIP folder-to-CSV path mapping.

NOTE on the csv_image_mapper mock: the upstream CSVImageMapper currently
looks for a `path` key in the row dict while `MappedCSVRow` produces
`image_path` — that's a separate bug. We mock the mapper to return a
pre-built mapping so the test isolates the use-case bug.
"""

from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest

from prosell.application.use_cases.product.bulk_upload_vehicles import (
    BulkUploadVehiclesUseCase,
)
from prosell.domain.services.csv_image_mapper import (
    CSVImageMapper,
    ImageMappingResult,
    MappedImage,
)


class TestBulkUploadPersistsImageUrls:
    """Verify bulk upload persists ZIP-matched images to product.image_urls."""

    @pytest.mark.asyncio
    async def test_bulk_upload_persists_image_urls_top_level(self) -> None:
        """When the csv_image_mapper returns matched images, the product
        created/updated by the use case must carry them on its top-level
        `image_urls` field (NOT buried in `attributes`).
        """
        # Arrange — CSV with one row (VIN=1FMSK7DH7LGA77418)
        sample_csv = (
            "id;title;price;category;type;location;year;make;model;mileage;body_style;"
            "exterior_color;interior_color;clean_title;state;fuel_type;transmission;"
            "option;description;path;groups;label;publicado;VIN\n"
            "1;DJ;2500000;Vehiculos;Sedan;Orlando;2020;Ford;Explorer;70000;SUV;"
            "Gris;Negro;1;FL;Gas;Automatic;;;Ford/Explorer/2020;1,2;01/01/25;1;1FMSK7DH7LGA77418\n"
        )

        tenant_id = uuid4()
        organization_id = uuid4()
        category_id = uuid4()
        vin = "1FMSK7DH7LGA77418"

        # Pre-built mapping that the (mocked) mapper will return: 2 images
        # mapped to this VIN, with realistic DO Spaces keys.
        expected_keys = [
            f"vehicles/{tenant_id}/{organization_id}/{vin}/img1.jpg",
            f"vehicles/{tenant_id}/{organization_id}/{vin}/img2.jpg",
        ]
        preset_mapping = ImageMappingResult(
            mapped=[
                MappedImage(
                    vin=vin,
                    csv_path="Ford/Explorer/2020",
                    original_zip_key="Ford/Explorer/2020/img1.jpg",
                    do_spaces_key=expected_keys[0],
                    file_bytes=b"\xff\xd8\xff\xe0fake-jpeg",
                ),
                MappedImage(
                    vin=vin,
                    csv_path="Ford/Explorer/2020",
                    original_zip_key="Ford/Explorer/2020/img2.jpg",
                    do_spaces_key=expected_keys[1],
                    file_bytes=b"\xff\xd8\xff\xe0fake-jpeg-2",
                ),
            ],
            unmatched=[],
        )
        mocked_mapper = Mock(spec=CSVImageMapper)
        mocked_mapper.map_images = Mock(return_value=preset_mapping)

        # Mock category repo
        category_repo = AsyncMock()
        mock_category = Mock()
        mock_category.id = category_id
        mock_category.tenant_id = tenant_id
        category_repo.get_by_id.return_value = mock_category

        # Mock product repo, capturing every create/update call
        product_repo = AsyncMock()
        product_repo.get_by_vin.return_value = None  # New product (create path)
        captured: list = []

        async def capture(entity):
            captured.append(entity)
            return entity

        product_repo.create.side_effect = capture
        product_repo.update.side_effect = capture

        # Act — pass the mocked mapper so we don't depend on the broken one
        use_case = BulkUploadVehiclesUseCase(
            product_repository=product_repo,
            category_repository=category_repo,
            csv_image_mapper=mocked_mapper,
        )
        result = await use_case.execute(
            csv_content=sample_csv,
            tenant_id=tenant_id,
            organization_id=organization_id,
            category_id=category_id,
            zip_bytes=b"fake-zip-bytes",  # mapper is mocked, this is ignored
        )

        # Sanity — the use case reports the mapped image count
        assert result.results[0].images_uploaded == 2, (
            f"Expected 2 images_uploaded (mapper returned 2 mapped), "
            f"got {result.results[0].images_uploaded}"
        )

        # Assert — the final state of the product (last captured entity) must
        # carry image_urls from the mapping. The bug: the use case never
        # writes them, so captured[-1].image_urls == [].
        assert len(captured) >= 1, "Expected the use case to create or update the product"
        final_product = captured[-1]
        assert final_product.image_urls, (
            "Product.image_urls must be populated from the mapping after bulk upload. "
            f"Got: {final_product.image_urls!r}. "
            "The use case has a TODO at line 286 that must be implemented (T8)."
        )
        # Must NOT be in attributes
        assert "image_urls" not in final_product.attributes, (
            "image_urls must be at the top level of the entity, not in attributes. "
            f"Got attributes keys: {list(final_product.attributes.keys())}"
        )
        # And every DO Spaces key in image_urls should belong to this VIN
        for url in final_product.image_urls:
            assert (
                vin in url
            ), f"Each image_urls entry should reference the product's VIN, got: {url}"
