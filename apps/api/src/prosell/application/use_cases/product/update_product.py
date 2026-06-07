"""Update product use case with server-side title recomposition.

Plan 1 deferred update-composition because adding an inline category DB
call to the PATCH router broke unit tests that mock only the product repo.
This use case (taking product_repo + category_repo) is the clean home: it
mirrors :class:`CreateProductUseCase`, and the router delegates to it.
"""

from uuid import UUID

from prosell.application.dto.product import ProductResponse
from prosell.application.dto.product.update import UpdateProductRequest
from prosell.domain.exceptions.product_exceptions import ProductNotFoundError
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.services.template_composer import resolve_title


class UpdateProductUseCase:
    """Update a product, recomposing its title from the category template."""

    def __init__(
        self,
        product_repository: AbstractProductRepository,
        category_repository: AbstractCategoryRepository,
    ) -> None:
        self.product_repository = product_repository
        self.category_repository = category_repository

    async def execute(
        self,
        product_id: UUID,
        tenant_id: UUID,
        request: UpdateProductRequest,
    ) -> ProductResponse:
        """
        Execute a product update.

        Args:
            product_id: Product to update
            tenant_id: Caller's tenant (isolation)
            request: UpdateProductRequest DTO (PATCH semantics — None means
                "leave unchanged")

        Returns:
            ProductResponse DTO

        Raises:
            ProductNotFoundError: If the product does not exist for this tenant
            ValueError: If cover_image_key is not in the product's image list
        """
        product = await self.product_repository.get_by_id(product_id, tenant_id)
        if not product:
            raise ProductNotFoundError(str(product_id))

        # Apply the request's set fields (PATCH: None means unchanged).
        if request.title is not None:
            product.title = request.title
        if request.description is not None:
            product.description = request.description
        if request.price_cents is not None:
            product.price_cents = request.price_cents
        if request.category_id is not None:
            product.category_id = request.category_id
        if request.condition is not None:
            product.condition = request.condition
        if request.attributes is not None:
            product.attributes = request.attributes
        if request.image_urls is not None:
            product.image_urls = request.image_urls

        # `cover_image_key` cross-field checks (the DTO cannot enforce these
        # against live product state — see UpdateProductRequest).
        #
        # 1. When set without image_urls (image list unchanged), the cover
        #    must reference an entry in the product's CURRENT image list.
        #    The "current list" merges the top-level column AND the legacy
        #    attributes.image_urls field (see Product.merged_image_keys).
        # 2. When image_urls is cleared to [], drop the cover — a product
        #    with no images has no cover.
        if request.cover_image_key is not None:
            current_images = product.merged_image_keys()
            if request.cover_image_key not in current_images:
                raise ValueError(
                    f"cover_image_key {request.cover_image_key!r} is not in "
                    f"the product's current image list. Add the new key to "
                    f"image_urls first, or set cover_image_key to one of the "
                    f"existing image keys."
                )
            product.cover_image_key = request.cover_image_key
        if request.image_urls is not None and not request.image_urls:
            product.cover_image_key = None

        if request.location_city is not None:
            product.location_city = request.location_city
        if request.location_state is not None:
            product.location_state = request.location_state
        if request.location_zip is not None:
            product.location_zip = request.location_zip

        # Recompose the title from the category's presentation template when
        # it declares one; otherwise keep the current title (the request's
        # title if it set one, else the original). Shared rule with create.
        category = await self.category_repository.get_by_id(
            product.category_id, tenant_id
        )
        presentation = category.presentation if category else None
        new_title = resolve_title(
            presentation, product.attributes or {}, fallback=product.title
        )
        if new_title:
            product.title = new_title

        product = await self.product_repository.update(product)
        return ProductResponse.from_entity(product)
