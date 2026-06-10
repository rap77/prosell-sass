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

from typing import Any
from uuid import UUID

from prosell.application.dto.organization.verticals import (
    CategoryNode,
    OrgVerticalsResponse,
    VerticalResponse,
)
from prosell.domain.repositories.category_repository import AbstractCategoryRepository
from prosell.domain.services.presentation_resolver import (
    filter_fields,
    resolve_presentation,
)
from prosell.infrastructure.repositories.organization_vertical_repository_impl import (
    SqlAlchemyOrganizationVerticalRepository,
)


def _to_presentation_dict(
    raw: Any,
) -> dict[str, Any] | None:
    """Coerce a Mapping/None into the DTO's dict type, or None."""
    if raw is None:
        return None
    return dict(raw)  # type: ignore[arg-type]


class ListOrgVerticalsUseCase:
    """Return the verticals enabled for an organization, with their subtree."""

    def __init__(
        self,
        org_vertical_repository: SqlAlchemyOrganizationVerticalRepository,
        category_repository: AbstractCategoryRepository,
    ) -> None:
        self._org_vertical_repo = org_vertical_repository
        self._category_repo = category_repository

    async def execute(self, organization_id: UUID) -> OrgVerticalsResponse:
        """Build the OrgVerticalsResponse for the given organization."""
        root_ids = await self._org_vertical_repo.list_root_category_ids(organization_id)

        verticals: list[VerticalResponse] = []
        for root_id in root_ids:
            root = await self._category_repo.get_by_id_any_tenant(root_id)
            if root is None:
                # Stale linkage (root was deleted but the org_vertical row
                # wasn't cascaded). Skip — UI never sees a broken vertical.
                continue

            children = await self._category_repo.get_children_any_tenant(root.id)
            root_presentation = _to_presentation_dict(root.presentation)

            category_nodes = [
                CategoryNode(
                    id=child.id,
                    name=child.name,
                    slug=child.slug,
                    attribute_schema=child.attribute_schema or {},
                    presentation=_to_presentation_dict(
                        resolve_presentation(
                            child.presentation,
                            [root.presentation],
                        ),
                    ),
                    filter_fields=filter_fields(child.attribute_schema or {}),
                )
                for child in children
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
