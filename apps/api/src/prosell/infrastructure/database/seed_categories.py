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
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.repositories.organization_vertical_repository_impl import (
    SqlAlchemyOrganizationVerticalRepository,
)


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
    "card_fields": [
        {"key": "price", "source": "attributes.price"},
        {"key": "mileage", "source": "attributes.mileage"},
    ],
}

_CAR_SCHEMA: dict = {
    "make": {"type": "string", "required": True, "filterable": True, "filter_type": "select"},
    "model": {"type": "string", "required": True, "filterable": True, "filter_type": "text"},
    "year": {
        "type": "number",
        "required": True,
        "filterable": True,
        "filter_type": "range",
        "validation_rules": {"min": 1980, "max": 2026},
    },
    "mileage": {
        "type": "number",
        "required": False,
        "filterable": True,
        "filter_type": "range",
        "unit": "km",
        "validation_rules": {"min": 0, "max": 500_000},
    },
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


def _f(
    type_: str,
    *,
    required: bool = False,
    filterable: bool = True,
    filter_type: str = "text",
    options: list[str] | None = None,
    validation_rules: dict | None = None,
) -> dict:
    """Compact attribute-schema field builder."""
    entry: dict = {
        "type": type_,
        "required": required,
        "filterable": filterable,
        "filter_type": filter_type,
    }
    if options is not None:
        entry["options"] = options
    if validation_rules is not None:
        entry["validation_rules"] = validation_rules
    return entry


def _leaf(name: str, slug: str, schema: dict, presentation: dict) -> _Node:
    """A leaf category carrying its attribute_schema + presentation."""
    return {
        "name": name,
        "slug": slug,
        "attribute_schema": schema,
        "presentation": presentation,
    }


def _car_leaf(name: str, slug: str) -> _Node:
    """A 'Carros y Camionetas' leaf carrying the shared automotive spec."""
    return _leaf(name, slug, _CAR_SCHEMA, _CAR_PRESENTATION)


# ── Other vehicle branches ───────────────────────────────────────────────────
_VEHICLE_PRESENTATION: dict = {
    "title_template": "{year} {make} {model}",
    "card_fields": [{"key": "price", "source": "attributes.price"}],
}
_MOTO_SCHEMA: dict = {
    "make": _f("string", required=True, filter_type="select"),
    "model": _f("string", required=True),
    "year": _f("number", required=True, filter_type="range"),
    "engine_cc": _f("number", filter_type="range"),
    "mileage": _f("number", filter_type="range"),
    "color": _f("string", filter_type="select"),
}
_HEAVY_SCHEMA: dict = {
    "make": _f("string", required=True, filter_type="select"),
    "model": _f("string", required=True),
    "year": _f("number", required=True, filter_type="range"),
    "mileage": _f("number", filter_type="range"),
    "transmission": _f("string", filter_type="select", options=["Manual", "Automática"]),
    "fuel_type": _f(
        "string", filter_type="select", options=["Diésel", "Gasolina", "Eléctrico", "GLP"]
    ),
    "load_capacity_kg": _f("number", filter_type="range"),
}
_BOAT_SCHEMA: dict = {
    "make": _f("string", required=True, filter_type="select"),
    "model": _f("string", required=True),
    "year": _f("number", required=True, filter_type="range"),
    "length_ft": _f("number", filter_type="range"),
    "fuel_type": _f("string", filter_type="select", options=["Gasolina", "Diésel", "Eléctrico"]),
}
_WATERCRAFT_SCHEMA: dict = {
    "make": _f("string", required=True, filter_type="select"),
    "model": _f("string", required=True),
    "year": _f("number", required=True, filter_type="range"),
    "engine_hours": _f("number", filter_type="range"),
}

# ── Real estate ──────────────────────────────────────────────────────────────
_OPERATION = _f("string", required=True, filter_type="select", options=["Venta", "Alquiler"])
_HOUSE_PRESENTATION: dict = {
    "title_template": "{operation} · {bedrooms} hab · {area_m2} m²",
    "card_fields": [
        {"key": "price", "source": "attributes.price"},
        {"key": "area_m2", "source": "attributes.area_m2"},
    ],
}
_COMMERCIAL_PRESENTATION: dict = {
    "title_template": "{operation} · {area_m2} m²",
    "card_fields": [
        {"key": "price", "source": "attributes.price"},
        {"key": "area_m2", "source": "attributes.area_m2"},
    ],
}
_LAND_PRESENTATION: dict = {
    "title_template": "{operation} · {land_area_m2} m²",
    "card_fields": [
        {"key": "price", "source": "attributes.price"},
        {"key": "land_area_m2", "source": "attributes.land_area_m2"},
    ],
}
_HOUSE_SCHEMA: dict = {
    "operation": _OPERATION,
    "area_m2": _f("number", required=True, filter_type="range"),
    "land_area_m2": _f("number", filter_type="range"),
    "bedrooms": _f("number", required=True, filter_type="range"),
    "bathrooms": _f("number", required=True, filter_type="range"),
    "parking": _f("number", filter_type="range"),
}
# Casa de Campo o Quinta: land surface is mandatory (per platform strategy).
_COUNTRY_HOUSE_SCHEMA: dict = {
    **_HOUSE_SCHEMA,
    "land_area_m2": _f("number", required=True, filter_type="range"),
}
_APARTMENT_SCHEMA: dict = {
    "operation": _OPERATION,
    "area_m2": _f("number", required=True, filter_type="range"),
    "bedrooms": _f("number", required=True, filter_type="range"),
    "bathrooms": _f("number", required=True, filter_type="range"),
    "floor": _f("number", filter_type="range"),
    "parking": _f("number", filter_type="range"),
}
_OFFICE_SCHEMA: dict = {
    "operation": _OPERATION,
    "area_m2": _f("number", required=True, filter_type="range"),
    "bathrooms": _f("number", filter_type="range"),
    "parking": _f("number", filter_type="range"),
    "capacity": _f("number", filter_type="range"),
}
_LOCAL_SCHEMA: dict = {
    "operation": _OPERATION,
    "area_m2": _f("number", required=True, filter_type="range"),
    "bathrooms": _f("number", filter_type="range"),
    "parking": _f("number", filter_type="range"),
}
_LAND_SCHEMA: dict = {
    "operation": _OPERATION,
    "land_area_m2": _f("number", required=True, filter_type="range"),
}

# ── Artículos (general goods) ────────────────────────────────────────────────
_CONDITION = _f(
    "string", required=True, filter_type="select", options=["Nuevo", "Usado", "Reacondicionado"]
)
_ARTICLE_PRESENTATION: dict = {
    "title_template": "{brand} {model}",
    "card_fields": [{"key": "price", "source": "attributes.price"}],
}
_CLOTHING_PRESENTATION: dict = {
    "title_template": "{brand} talla {size}",
    "card_fields": [{"key": "price", "source": "attributes.price"}],
}
_COMPUTER_SCHEMA: dict = {
    "brand": _f("string", required=True, filter_type="select"),
    "model": _f("string"),
    "condition": _CONDITION,
    "ram_gb": _f("number", filter_type="range"),
    "storage": _f("string", filter_type="select"),
}
_PHONE_SCHEMA: dict = {
    "brand": _f("string", required=True, filter_type="select"),
    "model": _f("string"),
    "condition": _CONDITION,
    "storage_gb": _f("number", filter_type="range"),
    "color": _f("string", filter_type="select"),
}
_APPLIANCE_SCHEMA: dict = {
    "brand": _f("string", required=True, filter_type="select"),
    "model": _f("string"),
    "condition": _CONDITION,
    "color": _f("string", filter_type="select"),
}
_CLOTHING_SCHEMA: dict = {
    "brand": _f("string", filter_type="select"),
    "size": _f(
        "string", required=True, filter_type="select", options=["XS", "S", "M", "L", "XL", "XXL"]
    ),
    "color": _f("string", filter_type="select"),
    "gender": _f(
        "string", filter_type="select", options=["Hombre", "Mujer", "Unisex", "Niño", "Niña"]
    ),
    "condition": _f("string", filter_type="select", options=["Nuevo", "Usado"]),
}
_SHOE_SCHEMA: dict = {
    "brand": _f("string", filter_type="select"),
    "size": _f("number", required=True, filter_type="range"),
    "color": _f("string", filter_type="select"),
    "gender": _f(
        "string", filter_type="select", options=["Hombre", "Mujer", "Unisex", "Niño", "Niña"]
    ),
    "condition": _f("string", filter_type="select", options=["Nuevo", "Usado"]),
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
                        _leaf(
                            "Scooters y Urbanas",
                            "scooters-y-urbanas",
                            _MOTO_SCHEMA,
                            _VEHICLE_PRESENTATION,
                        ),
                        _leaf("Deportivas", "deportivas", _MOTO_SCHEMA, _VEHICLE_PRESENTATION),
                        _leaf(
                            "Enduro y Cross", "enduro-y-cross", _MOTO_SCHEMA, _VEHICLE_PRESENTATION
                        ),
                        _leaf("Chopper", "chopper", _MOTO_SCHEMA, _VEHICLE_PRESENTATION),
                    ],
                },
                {
                    "name": "Vehículos Pesados y Comerciales",
                    "slug": "vehiculos-pesados-y-comerciales",
                    "children": [
                        _leaf(
                            "Camiones de Carga",
                            "camiones-de-carga",
                            _HEAVY_SCHEMA,
                            _VEHICLE_PRESENTATION,
                        ),
                        _leaf(
                            "Tractocamiones", "tractocamiones", _HEAVY_SCHEMA, _VEHICLE_PRESENTATION
                        ),
                        _leaf("Autobuses", "autobuses", _HEAVY_SCHEMA, _VEHICLE_PRESENTATION),
                        _leaf(
                            "Vans de Reparto",
                            "vans-de-reparto",
                            _HEAVY_SCHEMA,
                            _VEHICLE_PRESENTATION,
                        ),
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
                        _leaf("Yates", "yates", _BOAT_SCHEMA, _VEHICLE_PRESENTATION),
                        _leaf("Lanchas", "lanchas", _BOAT_SCHEMA, _VEHICLE_PRESENTATION),
                        _leaf("Veleros", "veleros", _BOAT_SCHEMA, _VEHICLE_PRESENTATION),
                    ],
                },
                {
                    "name": "Vehículos Personales",
                    "slug": "vehiculos-personales",
                    "children": [
                        _leaf(
                            "Motos de Agua (Jet Skis)",
                            "motos-de-agua-jet-skis",
                            _WATERCRAFT_SCHEMA,
                            _VEHICLE_PRESENTATION,
                        ),
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
                        _leaf(
                            "Casa de Ciudad", "casa-de-ciudad", _HOUSE_SCHEMA, _HOUSE_PRESENTATION
                        ),
                        _leaf(
                            "Casa de Campo o Quinta",
                            "casa-de-campo-o-quinta",
                            _COUNTRY_HOUSE_SCHEMA,
                            _HOUSE_PRESENTATION,
                        ),
                        _leaf(
                            "Casa en Condominio",
                            "casa-en-condominio",
                            _HOUSE_SCHEMA,
                            _HOUSE_PRESENTATION,
                        ),
                    ],
                },
                {
                    "name": "Apartamentos",
                    "slug": "apartamentos",
                    "children": [
                        _leaf(
                            "Apartamento Estándar",
                            "apartamento-estandar",
                            _APARTMENT_SCHEMA,
                            _HOUSE_PRESENTATION,
                        ),
                        _leaf(
                            "Loft o Estudio",
                            "loft-o-estudio",
                            _APARTMENT_SCHEMA,
                            _HOUSE_PRESENTATION,
                        ),
                        _leaf("Penthouse", "penthouse", _APARTMENT_SCHEMA, _HOUSE_PRESENTATION),
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
                        _leaf(
                            "Oficina Corporativa",
                            "oficina-corporativa",
                            _OFFICE_SCHEMA,
                            _COMMERCIAL_PRESENTATION,
                        ),
                        _leaf(
                            "Espacio de Co-working",
                            "espacio-de-co-working",
                            _OFFICE_SCHEMA,
                            _COMMERCIAL_PRESENTATION,
                        ),
                    ],
                },
                {
                    "name": "Locales Comerciales",
                    "slug": "locales-comerciales",
                    "children": [
                        _leaf(
                            "Local en Centro Comercial",
                            "local-en-centro-comercial",
                            _LOCAL_SCHEMA,
                            _COMMERCIAL_PRESENTATION,
                        ),
                        _leaf(
                            "Local a Pie de Calle",
                            "local-a-pie-de-calle",
                            _LOCAL_SCHEMA,
                            _COMMERCIAL_PRESENTATION,
                        ),
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
                        _leaf("Residencial", "residencial", _LAND_SCHEMA, _LAND_PRESENTATION),
                        _leaf("Comercial", "comercial", _LAND_SCHEMA, _LAND_PRESENTATION),
                    ],
                },
                {
                    "name": "Terrenos Rurales",
                    "slug": "terrenos-rurales",
                    "children": [
                        _leaf(
                            "Agrícola o Productivo",
                            "agricola-o-productivo",
                            _LAND_SCHEMA,
                            _LAND_PRESENTATION,
                        ),
                        _leaf(
                            "Terreno de Descanso",
                            "terreno-de-descanso",
                            _LAND_SCHEMA,
                            _LAND_PRESENTATION,
                        ),
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
                        _leaf("Laptops", "laptops", _COMPUTER_SCHEMA, _ARTICLE_PRESENTATION),
                        _leaf(
                            "Computadoras de Escritorio",
                            "computadoras-de-escritorio",
                            _COMPUTER_SCHEMA,
                            _ARTICLE_PRESENTATION,
                        ),
                        _leaf(
                            "Componentes y Piezas",
                            "componentes-y-piezas",
                            _COMPUTER_SCHEMA,
                            _ARTICLE_PRESENTATION,
                        ),
                    ],
                },
                {
                    "name": "Celulares y Teléfonos",
                    "slug": "celulares-y-telefonos",
                    "children": [
                        _leaf("Smartphones", "smartphones", _PHONE_SCHEMA, _ARTICLE_PRESENTATION),
                        _leaf("Smartwatches", "smartwatches", _PHONE_SCHEMA, _ARTICLE_PRESENTATION),
                        _leaf("Accesorios", "accesorios", _PHONE_SCHEMA, _ARTICLE_PRESENTATION),
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
                        _leaf(
                            "Refrigeradores",
                            "refrigeradores",
                            _APPLIANCE_SCHEMA,
                            _ARTICLE_PRESENTATION,
                        ),
                        _leaf(
                            "Lavadoras y Secadoras",
                            "lavadoras-y-secadoras",
                            _APPLIANCE_SCHEMA,
                            _ARTICLE_PRESENTATION,
                        ),
                        _leaf(
                            "Estufas y Hornos",
                            "estufas-y-hornos",
                            _APPLIANCE_SCHEMA,
                            _ARTICLE_PRESENTATION,
                        ),
                    ],
                },
                {
                    "name": "Pequeños Electrodomésticos",
                    "slug": "pequenos-electrodomesticos",
                    "children": [
                        _leaf("Microondas", "microondas", _APPLIANCE_SCHEMA, _ARTICLE_PRESENTATION),
                        _leaf(
                            "Licuadoras y Batidoras",
                            "licuadoras-y-batidoras",
                            _APPLIANCE_SCHEMA,
                            _ARTICLE_PRESENTATION,
                        ),
                        _leaf("Cafeteras", "cafeteras", _APPLIANCE_SCHEMA, _ARTICLE_PRESENTATION),
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
                        _leaf(
                            "Camisas y Camisetas",
                            "camisas-y-camisetas",
                            _CLOTHING_SCHEMA,
                            _CLOTHING_PRESENTATION,
                        ),
                        _leaf(
                            "Pantalones y Jeans",
                            "pantalones-y-jeans",
                            _CLOTHING_SCHEMA,
                            _CLOTHING_PRESENTATION,
                        ),
                        _leaf("Vestidos", "vestidos", _CLOTHING_SCHEMA, _CLOTHING_PRESENTATION),
                        _leaf(
                            "Chaquetas y Abrigos",
                            "chaquetas-y-abrigos",
                            _CLOTHING_SCHEMA,
                            _CLOTHING_PRESENTATION,
                        ),
                    ],
                },
                {
                    "name": "Calzado",
                    "slug": "calzado",
                    "children": [
                        _leaf(
                            "Tenis Deportivos",
                            "tenis-deportivos",
                            _SHOE_SCHEMA,
                            _CLOTHING_PRESENTATION,
                        ),
                        _leaf(
                            "Zapatos Formales",
                            "zapatos-formales",
                            _SHOE_SCHEMA,
                            _CLOTHING_PRESENTATION,
                        ),
                        _leaf("Botas", "botas", _SHOE_SCHEMA, _CLOTHING_PRESENTATION),
                        _leaf("Sandalias", "sandalias", _SHOE_SCHEMA, _CLOTHING_PRESENTATION),
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


async def enable_default_verticals(session: AsyncSession, organization_id: UUID) -> list[UUID]:
    """Enable all global verticals for an organization (Task 7b).

    Links the org to all global root categories (Vehículos, Bienes Raíces,
    Artículos) via the organization_vertical M2M so that
    ``GET /organizations/{id}/verticals`` returns the full niche tree.

    Idempotent: the repository's ``enable`` is ``on_conflict_do_nothing``,
    and a missing root is skipped as a safe no-op.

    Returns the list of root category ids that were enabled.
    """
    slugs = [v["slug"] for v in ALL_VERTICALS]
    result = await session.execute(
        select(CategoryModel).where(
            CategoryModel.slug.in_(slugs),
            CategoryModel.tenant_id.is_(None),
            CategoryModel.parent_id.is_(None),
        )
    )
    roots = result.scalars().all()
    if not roots:
        return []

    repo = SqlAlchemyOrganizationVerticalRepository(session)
    for root in roots:
        await repo.enable(organization_id, root.id)
    return [root.id for root in roots]
