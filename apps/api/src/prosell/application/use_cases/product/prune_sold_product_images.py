"""Prune the galleries of long-sold products down to their cover image."""

from datetime import UTC, datetime, timedelta

from prosell.application.ports.ido_spaces import IDOSpacesService
from prosell.domain.repositories.product_repository import AbstractProductRepository


class PruneSoldProductImagesUseCase:
    """Delete every non-cover image of products that have been SOLD for at
    least ``grace_days``, then rewrite the product's image list to the cover
    only. Idempotent: a product already holding just its cover is skipped;
    a product without a cover is skipped (never delete the last reference)."""

    def __init__(
        self,
        product_repository: AbstractProductRepository,
        storage: IDOSpacesService,
        grace_days: int,
    ) -> None:
        self._products = product_repository
        self._storage = storage
        self._grace_days = grace_days

    async def execute(self) -> dict[str, int]:
        cutoff = datetime.now(UTC) - timedelta(days=self._grace_days)
        products = await self._products.get_sold_before(cutoff)

        products_pruned = 0
        images_deleted = 0

        for product in products:
            cover = product.cover_image_key
            if cover is None:
                continue  # never delete the only reference
            to_delete = [key for key in product.image_urls if key != cover]
            if not to_delete:
                continue  # already pruned

            for key in to_delete:
                await self._storage.delete_file(key)
                images_deleted += 1

            product.image_urls = [cover]
            await self._products.update(product)
            products_pruned += 1

        return {"products_pruned": products_pruned, "images_deleted": images_deleted}
