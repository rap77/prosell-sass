"""Seed the global category taxonomy (platform-managed verticals, Plan 2).

Categories are GLOBAL templates (tenant_id NULL) maintained by the ProSell
admin. This module declares each niche as nested data and seeds it
idempotently (keyed by slug within the global scope), so re-running never
duplicates nodes. Slugs are stable, human-readable kebab-case — they double
as the classification key for future bulk-upload mapping.

Attribute schemas / presentation templates / filterable flags are seeded in
a later step with a detailed spec; this only lays down the tree structure.
"""

from typing import NotRequired, TypedDict
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel


class _Node(TypedDict):
    name: str
    slug: str
    children: NotRequired[list["_Node"]]


# Niche 1: Vehículos y Transporte — root vertical (level 0), 3 levels below.
VEHICLES_VERTICAL: _Node = {
    "name": "Vehículos y Transporte",
    "slug": "vehiculos-y-transporte",
    "children": [
        {
            "name": "Vehículos Terrestres",
            "slug": "vehiculos-terrestres",
            "children": [
                {
                    "name": "Carros y Camionetas",
                    "slug": "carros-y-camionetas",
                    "children": [
                        {"name": "Sedán", "slug": "sedan"},
                        {"name": "Hatchback", "slug": "hatchback"},
                        {"name": "SUVs", "slug": "suvs"},
                        {"name": "Pick-ups", "slug": "pick-ups"},
                        {"name": "Coupé", "slug": "coupe"},
                    ],
                },
                {
                    "name": "Motos",
                    "slug": "motos",
                    "children": [
                        {"name": "Scooters y Urbanas", "slug": "scooters-y-urbanas"},
                        {"name": "Deportivas", "slug": "deportivas"},
                        {"name": "Enduro y Cross", "slug": "enduro-y-cross"},
                        {"name": "Chopper", "slug": "chopper"},
                    ],
                },
                {
                    "name": "Vehículos Pesados y Comerciales",
                    "slug": "vehiculos-pesados-y-comerciales",
                    "children": [
                        {"name": "Camiones de Carga", "slug": "camiones-de-carga"},
                        {"name": "Tractocamiones", "slug": "tractocamiones"},
                        {"name": "Autobuses", "slug": "autobuses"},
                        {"name": "Vans de Reparto", "slug": "vans-de-reparto"},
                    ],
                },
            ],
        },
        {
            "name": "Vehículos Acuáticos (Náutica)",
            "slug": "vehiculos-acuaticos-nautica",
            "children": [
                {
                    "name": "Embarcaciones de Recreo",
                    "slug": "embarcaciones-de-recreo",
                    "children": [
                        {"name": "Yates", "slug": "yates"},
                        {"name": "Lanchas", "slug": "lanchas"},
                        {"name": "Veleros", "slug": "veleros"},
                    ],
                },
                {
                    "name": "Vehículos Personales",
                    "slug": "vehiculos-personales",
                    "children": [
                        {"name": "Motos de Agua (Jet Skis)", "slug": "motos-de-agua-jet-skis"},
                    ],
                },
            ],
        },
    ],
}


async def _seed_node(
    session: AsyncSession,
    node: _Node,
    *,
    parent_id: object | None,
    level: int,
) -> None:
    """Idempotently create one global category node, then recurse children."""
    stmt = select(CategoryModel).where(
        CategoryModel.slug == node["slug"],
        CategoryModel.tenant_id.is_(None),
    )
    existing = (await session.execute(stmt)).scalar_one_or_none()

    if existing is None:
        existing = CategoryModel(
            id=uuid4(),
            name=node["name"],
            slug=node["slug"],
            tenant_id=None,  # GLOBAL template
            parent_id=parent_id,
            level=level,
            is_active=True,
            sort_order=0,
            field_config=[],
            attribute_schema={},
        )
        session.add(existing)
        await session.flush()

    for child in node.get("children", []):
        await _seed_node(session, child, parent_id=existing.id, level=level + 1)


async def seed_vehicles_vertical(session: AsyncSession) -> None:
    """Seed the global 'Vehículos y Transporte' vertical (idempotent)."""
    await _seed_node(session, VEHICLES_VERTICAL, parent_id=None, level=0)
