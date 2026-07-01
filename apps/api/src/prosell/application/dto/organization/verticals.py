"""DTOs for the read-API of an organization's enabled verticals (Plan 2 / Task 4).

Shape:

    OrgVerticalsResponse
    └── verticals: list[VerticalResponse]
        ├── id, name, slug
        ├── presentation: dict | None   (root's own presentation)
        └── categories: list[CategoryNode]
            ├── id, name, slug
            ├── attribute_schema: dict
            ├── presentation: dict | None   (own-or-inherited, resolved)
            └── filter_fields: list[dict]   (filterable fields from schema)
"""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class CategoryNode(BaseModel):
    """A category inside a vertical's subtree, with resolved presentation."""

    id: UUID
    name: str
    slug: str
    attribute_schema: dict[str, dict[str, object]] = {}
    attribute_groups: list[dict[str, object]] = []
    presentation: dict[str, object] | None = None
    filter_fields: list[dict[str, str]] = []
    children: list[CategoryNode] = []


CategoryNode.model_rebuild()


class VerticalResponse(BaseModel):
    """A single enabled vertical (global root category) for an organization."""

    id: UUID
    name: str
    slug: str
    presentation: dict[str, object] | None = None
    categories: list[CategoryNode] = []


class OrgVerticalsResponse(BaseModel):
    """Response envelope: the verticals enabled for an organization."""

    verticals: list[VerticalResponse]
