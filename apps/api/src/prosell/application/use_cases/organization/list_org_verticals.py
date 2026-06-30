"""List the verticals (global root categories) enabled for an organization.

Plan 2 / Task 4 read-API. For each enabled root the use case:
1. Loads the root category (tenant-agnostic — roots are global templates)
2. Loads its direct children (also tenant-agnostic — children of a global
   root are also global in Plan 2)
3. Resolves each child's effective presentation using
   ``presentation_resolver.resolve_presentation`` with the root as the
   nearest ancestor
4. Computes ``filter_fields`` from each child's ``attribute_schema`` using
   ``presentation_resolver.filter_fields``
"""

from collections.abc import Mapping
from uuid import UUID

from prosell.application.dto.organization.verticals import (
    CategoryNode,
    OrgVerticalsResponse,
    VerticalResponse,
)
from prosell.domain.entities.category import Category
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.repositories.organization_vertical_repository import (
    AbstractOrganizationVerticalRepository,
)
from prosell.domain.services.presentation_resolver import (
    filter_fields,
    resolve_presentation,
)


def _to_presentation_dict(
    raw: Mapping[str, object] | None,
) -> dict[str, object] | None:
    """Coerce a Mapping/None into the DTO's dict type, or None."""
    if raw is None:
        return None
    return dict(raw)


class ListOrgVerticalsUseCase:
    """Return the verticals enabled for an organization, with their subtree."""

    def __init__(
        self,
        org_vertical_repository: AbstractOrganizationVerticalRepository,
        category_repository: AbstractCategoryRepository,
    ) -> None:
        self._org_vertical_repo = org_vertical_repository
        self._category_repo = category_repository

    async def _build_node(
        self,
        category: Category,
        ancestor_presentations: list[Mapping[str, object] | None],
    ) -> CategoryNode:
        """Recursively build a CategoryNode with its full subtree."""
        children_entities = await self._category_repo.get_children_cross_tenant(category.id)
        children = [
            await self._build_node(child, [*ancestor_presentations, category.presentation])
            for child in children_entities
        ]
        return CategoryNode(
            id=category.id,
            name=category.name,
            slug=category.slug,
            attribute_schema=category.attribute_schema or {},
            presentation=_to_presentation_dict(
                resolve_presentation(category.presentation, ancestor_presentations)
            ),
            filter_fields=filter_fields(category.attribute_schema or {}),
            children=children,
        )

    async def execute(self, organization_id: UUID) -> OrgVerticalsResponse:
        """Build the OrgVerticalsResponse for the given organization."""
        root_ids = await self._org_vertical_repo.list_root_category_ids(organization_id)

        verticals: list[VerticalResponse] = []
        for root_id in root_ids:
            root = await self._category_repo.get_by_id_cross_tenant(root_id)
            if root is None:
                continue

            root_presentation = _to_presentation_dict(root.presentation)
            children_entities = await self._category_repo.get_children_cross_tenant(root.id)
            category_nodes = [
                await self._build_node(child, [root.presentation]) for child in children_entities
            ]

            verticals.append(
                VerticalResponse(
                    id=root.id,
                    name=root.name,
                    slug=root.slug,
                    presentation=root_presentation,
                    categories=category_nodes,
                )
            )

        return OrgVerticalsResponse(verticals=verticals)
