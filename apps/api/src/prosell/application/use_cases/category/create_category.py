"""Create category use case."""

from prosell.application.dto.category import CategoryResponse, CreateCategoryRequest
from prosell.domain.entities.category import Category
from prosell.domain.exceptions.category_exceptions import CategoryAlreadyExistsError
from prosell.domain.repositories.category_repository import AbstractCategoryRepository


class CreateCategoryUseCase:
    """Create a new category."""

    def __init__(self, category_repository: AbstractCategoryRepository) -> None:
        self.category_repository = category_repository

    async def execute(self, request: CreateCategoryRequest) -> CategoryResponse:
        """
        Execute category creation.

        Args:
            request: CreateCategoryRequest DTO

        Returns:
            CategoryResponse DTO

        Raises:
            CategoryAlreadyExistsError: If category with name/slug already exists
            ValueError: If parent_id creates circular reference
        """
        # 1. Check uniqueness by name within parent
        exists = await self.category_repository.exists_by_name(
            request.name,
            request.tenant_id,
            request.parent_id,
        )
        if exists:
            raise CategoryAlreadyExistsError(request.name)

        # 2. Check slug uniqueness
        slug_exists = await self.category_repository.exists_by_slug(request.slug, request.tenant_id)
        if slug_exists:
            raise ValueError(f"Category with slug '{request.slug}' already exists")

        # 3. Determine level and validate circular reference
        level = 0
        if request.parent_id:
            parent = await self.category_repository.get_by_id(request.parent_id, request.tenant_id)
            if parent:
                level = parent.level + 1

                # Get ancestors for circular reference validation
                ancestor_ids = await self.category_repository.get_ancestor_ids(
                    request.parent_id, request.tenant_id
                )
                # Include parent's ancestors plus parent itself
                all_ancestor_ids = [request.parent_id, *ancestor_ids]

                # Create a temporary category object to validate
                temp_category = Category.create(
                    name=request.name,
                    slug=request.slug,
                    tenant_id=request.tenant_id,
                    parent_id=request.parent_id,
                    level=level,
                )
                temp_category.validate_no_circular_reference(request.parent_id, all_ancestor_ids)
            else:
                raise ValueError(f"Parent category not found: {request.parent_id}")

        # 4. Create category entity
        category = Category.create(
            name=request.name,
            slug=request.slug,
            tenant_id=request.tenant_id,
            parent_id=request.parent_id,
            level=level,
            description=request.description,
            icon=request.icon,
            image_url=request.image_url,
            sort_order=request.sort_order,
            is_active=request.is_active,
        )

        # Add field config if provided
        if request.field_config:
            for field in request.field_config:
                category.add_field(field)

        # 5. Persist
        category = await self.category_repository.create(category)

        return CategoryResponse.from_entity(category)
