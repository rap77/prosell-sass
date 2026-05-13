"""SQLAlchemy implementation of Category repository."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.category import Category
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.infrastructure.models.category_model import CategoryModel


class SqlAlchemyCategoryRepository(AbstractCategoryRepository):
    """SQLAlchemy implementation of CategoryRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, category: Category) -> Category:
        """Create a new category."""
        model = CategoryModel(
            id=category.id,
            tenant_id=category.tenant_id,
            name=category.name,
            slug=category.slug,
            parent_id=category.parent_id,
            level=category.level,
            icon=category.icon,
            description=category.description,
            image_url=category.image_url,
            sort_order=category.sort_order,
            is_active=category.is_active,
            field_config=category.field_config,
            attribute_schema=category.attribute_schema,
            created_at=category.created_at,
            updated_at=category.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, category_id: UUID, tenant_id: UUID) -> Category | None:
        """Get category by ID with tenant isolation."""
        stmt = select(CategoryModel).where(
            CategoryModel.id == category_id,
            CategoryModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_slug(self, slug: str, tenant_id: UUID) -> Category | None:
        """Get category by slug."""
        stmt = select(CategoryModel).where(
            CategoryModel.slug == slug,
            CategoryModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_all(
        self,
        tenant_id: UUID,
        parent_id: UUID | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Category]:
        """Get all categories with optional filters."""
        stmt = select(CategoryModel).where(CategoryModel.tenant_id == tenant_id)

        if parent_id is not None:
            stmt = stmt.where(CategoryModel.parent_id == parent_id)
        else:
            # None means root categories only
            stmt = stmt.where(CategoryModel.parent_id.is_(None))

        if is_active is not None:
            stmt = stmt.where(CategoryModel.is_active == is_active)

        stmt = stmt.order_by(CategoryModel.sort_order, CategoryModel.name)
        stmt = stmt.offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_children(self, parent_id: UUID, tenant_id: UUID) -> list[Category]:
        """Get direct children of a category."""
        stmt = (
            select(CategoryModel)
            .where(
                CategoryModel.parent_id == parent_id,
                CategoryModel.tenant_id == tenant_id,
            )
            .order_by(CategoryModel.sort_order, CategoryModel.name)
        )

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_ancestor_ids(self, category_id: UUID, tenant_id: UUID) -> list[UUID]:
        """Get all ancestor category IDs (up the tree to root)."""
        ancestor_ids: list[UUID] = []
        current_id: UUID | None = category_id

        while current_id is not None:
            stmt = select(CategoryModel.parent_id).where(
                CategoryModel.id == current_id,
                CategoryModel.tenant_id == tenant_id,
            )
            result = await self.session.execute(stmt)
            parent_id = result.scalar_one_or_none()

            if parent_id is None:
                break

            ancestor_ids.append(parent_id)
            current_id = parent_id

        return ancestor_ids

    async def get_tree(self, tenant_id: UUID) -> list[Category]:
        """Get all categories for tenant."""
        stmt = (
            select(CategoryModel)
            .where(
                CategoryModel.tenant_id == tenant_id,
            )
            .order_by(CategoryModel.sort_order, CategoryModel.name)
        )

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def update(self, category: Category) -> Category:
        """Update an existing category."""
        stmt = select(CategoryModel).where(CategoryModel.id == category.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"Category not found: {category.id}")

        model.name = category.name
        model.slug = category.slug
        model.parent_id = category.parent_id
        model.level = category.level
        model.icon = category.icon
        model.description = category.description
        model.image_url = category.image_url
        model.sort_order = category.sort_order
        model.is_active = category.is_active
        model.field_config = category.field_config
        model.attribute_schema = category.attribute_schema
        # Set updated_at explicitly from domain entity — onupdate="now()" string is not a valid
        # asyncpg value. The domain entity already sets updated_at = datetime.now(UTC).
        model.updated_at = category.updated_at

        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, category_id: UUID, tenant_id: UUID) -> bool:
        """Delete a category."""
        stmt = select(CategoryModel).where(
            CategoryModel.id == category_id,
            CategoryModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return False

        await self.session.delete(model)
        await self.session.flush()
        return True

    async def exists_by_name(
        self, name: str, tenant_id: UUID, parent_id: UUID | None = None
    ) -> bool:
        """Check if category with name exists."""
        stmt = select(func.count(CategoryModel.id)).where(
            CategoryModel.name == name,
            CategoryModel.tenant_id == tenant_id,
        )

        if parent_id is not None:
            stmt = stmt.where(CategoryModel.parent_id == parent_id)
        else:
            # Check root level
            stmt = stmt.where(CategoryModel.parent_id.is_(None))

        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0
        return count > 0

    async def exists_by_slug(self, slug: str, tenant_id: UUID) -> bool:
        """Check if category with slug exists."""
        stmt = select(func.count(CategoryModel.id)).where(
            CategoryModel.slug == slug,
            CategoryModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0
        return count > 0

    async def count(self, tenant_id: UUID, is_active: bool | None = None) -> int:
        """Count total categories."""
        stmt = select(func.count(CategoryModel.id)).where(
            CategoryModel.tenant_id == tenant_id,
        )

        if is_active is not None:
            stmt = stmt.where(CategoryModel.is_active == is_active)

        result = await self.session.execute(stmt)
        return result.scalar() or 0

    def _to_entity(self, model: CategoryModel) -> Category:
        """Convert ORM model to domain entity."""
        return Category.model_validate(model, from_attributes=True)
