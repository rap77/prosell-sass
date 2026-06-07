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
    # Optional per-leaf data. attribute_schema drives product validation +
    # catalog filters; presentation drives server-side title composition.
    attribute_schema: NotRequired[dict]
    presentation: NotRequired[dict]


# ---------------------------------------------------------------------------
# Attribute specs (initial set). attribute_schema entry shape:
#   {"type": "string"|"number"|"boolean", "required": bool,
#    "filterable": bool, "filter_type": str, "options": [...]}
# Attached to LEAF categories (where products are classified). Brand/model are
# indexed ATTRIBUTES, never categories (per platform strategy).
# ---------------------------------------------------------------------------

_CAR_PRESENTATION: dict = {
    "title_template": "{year} {make} {model}",
    "subtitle_template": "{transmission} · {fuel_type}",
    "card_fields": ["price", "mileage"],
}

_CAR_SCHEMA: dict = {
    "make": {"type": "string", "required": True, "filterable": True, "filter_type": "select"},
    "model": {"type": "string", "required": True, "filterable": True, "filter_type": "text"},
    "year": {"type": "number", "required": True, "filterable": True, "filter_type": "range"},
    "mileage": {"type": "number", "required": False, "filterable": True, "filter_type": "range"},
    "transmission": {
        "type": "string",
        "required": False,
        "filterable": True,
        "filter_type": "select",
        "options": ["Manual", "Automática"],
    },
    "fuel_type": {
        "type": "string",
        "required": False,
        "filterable": True,
        "filter_type": "select",
        "options": ["Gasolina", "Diésel", "Híbrido", "Eléctrico", "GLP"],
    },
    "color": {"type": "string", "required": False, "filterable": True, "filter_type": "select"},
}


def _car_leaf(name: str, slug: str) -> _Node:
    """A 'Carros y Camionetas' leaf carrying the shared automotive spec."""
    return {
        "name": name,
        "slug": slug,
        "attribute_schema": _CAR_SCHEMA,
        "presentation": _CAR_PRESENTATION,
    }


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
                        _car_leaf("Sedán", "sedan"),
                        _car_leaf("Hatchback", "hatchback"),
                        _car_leaf("SUVs", "suvs"),
                        _car_leaf("Pick-ups", "pick-ups"),
                        _car_leaf("Coupé", "coupe"),
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


# Niche 2: Bienes Raíces — root vertical (level 0), 3 levels below.
BIENES_RAICES_VERTICAL: _Node = {
    "name": "Bienes Raíces",
    "slug": "bienes-raices",
    "children": [
        {
            "name": "Propiedades Residenciales",
            "slug": "propiedades-residenciales",
            "children": [
                {
                    "name": "Casas",
                    "slug": "casas",
                    "children": [
                        {"name": "Casa de Ciudad", "slug": "casa-de-ciudad"},
                        {"name": "Casa de Campo o Quinta", "slug": "casa-de-campo-o-quinta"},
                        {"name": "Casa en Condominio", "slug": "casa-en-condominio"},
                    ],
                },
                {
                    "name": "Apartamentos",
                    "slug": "apartamentos",
                    "children": [
                        {"name": "Apartamento Estándar", "slug": "apartamento-estandar"},
                        {"name": "Loft o Estudio", "slug": "loft-o-estudio"},
                        {"name": "Penthouse", "slug": "penthouse"},
                    ],
                },
            ],
        },
        {
            "name": "Propiedades Comerciales e Industriales",
            "slug": "propiedades-comerciales-e-industriales",
            "children": [
                {
                    "name": "Oficinas",
                    "slug": "oficinas",
                    "children": [
                        {"name": "Oficina Corporativa", "slug": "oficina-corporativa"},
                        {"name": "Espacio de Co-working", "slug": "espacio-de-co-working"},
                    ],
                },
                {
                    "name": "Locales Comerciales",
                    "slug": "locales-comerciales",
                    "children": [
                        {"name": "Local en Centro Comercial", "slug": "local-en-centro-comercial"},
                        {"name": "Local a Pie de Calle", "slug": "local-a-pie-de-calle"},
                    ],
                },
            ],
        },
        {
            "name": "Terrenos y Lotes",
            "slug": "terrenos-y-lotes",
            "children": [
                {
                    "name": "Lotes Urbanos",
                    "slug": "lotes-urbanos",
                    "children": [
                        {"name": "Residencial", "slug": "residencial"},
                        {"name": "Comercial", "slug": "comercial"},
                    ],
                },
                {
                    "name": "Terrenos Rurales",
                    "slug": "terrenos-rurales",
                    "children": [
                        {"name": "Agrícola o Productivo", "slug": "agricola-o-productivo"},
                        {"name": "Terreno de Descanso", "slug": "terreno-de-descanso"},
                    ],
                },
            ],
        },
    ],
}


# Niche 3: Artículos (Mundillo General) — root vertical (level 0), 3 levels below.
ARTICULOS_VERTICAL: _Node = {
    "name": "Artículos",
    "slug": "articulos",
    "children": [
        {
            "name": "Tecnología y Electrónica",
            "slug": "tecnologia-y-electronica",
            "children": [
                {
                    "name": "Computación",
                    "slug": "computacion",
                    "children": [
                        {"name": "Laptops", "slug": "laptops"},
                        {
                            "name": "Computadoras de Escritorio",
                            "slug": "computadoras-de-escritorio",
                        },
                        {"name": "Componentes y Piezas", "slug": "componentes-y-piezas"},
                    ],
                },
                {
                    "name": "Celulares y Teléfonos",
                    "slug": "celulares-y-telefonos",
                    "children": [
                        {"name": "Smartphones", "slug": "smartphones"},
                        {"name": "Smartwatches", "slug": "smartwatches"},
                        {"name": "Accesorios", "slug": "accesorios"},
                    ],
                },
            ],
        },
        {
            "name": "Hogar y Electrodomésticos",
            "slug": "hogar-y-electrodomesticos",
            "children": [
                {
                    "name": "Grandes Electrodomésticos (Línea Blanca)",
                    "slug": "grandes-electrodomesticos-linea-blanca",
                    "children": [
                        {"name": "Refrigeradores", "slug": "refrigeradores"},
                        {"name": "Lavadoras y Secadoras", "slug": "lavadoras-y-secadoras"},
                        {"name": "Estufas y Hornos", "slug": "estufas-y-hornos"},
                    ],
                },
                {
                    "name": "Pequeños Electrodomésticos",
                    "slug": "pequenos-electrodomesticos",
                    "children": [
                        {"name": "Microondas", "slug": "microondas"},
                        {"name": "Licuadoras y Batidoras", "slug": "licuadoras-y-batidoras"},
                        {"name": "Cafeteras", "slug": "cafeteras"},
                    ],
                },
            ],
        },
        {
            "name": "Moda y Calzado",
            "slug": "moda-y-calzado",
            "children": [
                {
                    "name": "Ropa y Vestimenta",
                    "slug": "ropa-y-vestimenta",
                    "children": [
                        {"name": "Camisas y Camisetas", "slug": "camisas-y-camisetas"},
                        {"name": "Pantalones y Jeans", "slug": "pantalones-y-jeans"},
                        {"name": "Vestidos", "slug": "vestidos"},
                        {"name": "Chaquetas y Abrigos", "slug": "chaquetas-y-abrigos"},
                    ],
                },
                {
                    "name": "Calzado",
                    "slug": "calzado",
                    "children": [
                        {"name": "Tenis Deportivos", "slug": "tenis-deportivos"},
                        {"name": "Zapatos Formales", "slug": "zapatos-formales"},
                        {"name": "Botas", "slug": "botas"},
                        {"name": "Sandalias", "slug": "sandalias"},
                    ],
                },
            ],
        },
    ],
}


# All global verticals, seeded together by seed_global_taxonomy.
ALL_VERTICALS: list[_Node] = [
    VEHICLES_VERTICAL,
    BIENES_RAICES_VERTICAL,
    ARTICULOS_VERTICAL,
]


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

    node_schema = node.get("attribute_schema", {})
    node_presentation = node.get("presentation")

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
            attribute_schema=node_schema,
            presentation=node_presentation,
        )
        session.add(existing)
        await session.flush()
    else:
        # Fill template fields ONLY when currently unset — never clobber edits
        # the ProSell admin made via the API. Lets a structure-only seed gain
        # its attribute_schema/presentation on a later run.
        changed = False
        if node_schema and not existing.attribute_schema:
            existing.attribute_schema = node_schema
            changed = True
        if node_presentation and existing.presentation is None:
            existing.presentation = node_presentation
            changed = True
        if changed:
            await session.flush()

    for child in node.get("children", []):
        await _seed_node(session, child, parent_id=existing.id, level=level + 1)


async def seed_vehicles_vertical(session: AsyncSession) -> None:
    """Seed the global 'Vehículos y Transporte' vertical (idempotent)."""
    await _seed_node(session, VEHICLES_VERTICAL, parent_id=None, level=0)


async def seed_global_taxonomy(session: AsyncSession) -> None:
    """Seed every global niche vertical (Vehículos, Bienes Raíces, Artículos).

    Idempotent — re-running never duplicates nodes. Slugs are globally unique
    across niches.
    """
    for vertical in ALL_VERTICALS:
        await _seed_node(session, vertical, parent_id=None, level=0)
