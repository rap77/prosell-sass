# Scalability Design — u1-cross-org-export-api

Diseña la solución concreta para `scalability-requirements.md`
(NFR3.1, NFR3.2) de este mismo Unit.

## Enforcement del cap — método único parametrizado (NUEVO)

Un único método de conteo, con `organization_id: UUID | None` — evita
duplicar la query en dos variantes casi idénticas para el caso puntual
(NFR3.1) y el caso "todas" (NFR3.2):

```python
# Pseudocódigo ilustrativo
async def count_published(
    self, organization_id: UUID | None = None
) -> int:
    stmt = select(func.count()).where(ProductModel.status == "published")
    if organization_id is not None:
        stmt = stmt.where(ProductModel.organization_id == organization_id)
    return await self.session.scalar(stmt)

# En el use case:
count = await product_repo.count_published(
    organization_id=None if all_organizations else effective_tenant_id
)
if count > EXPORT_MAX_PRODUCTS:  # 500 — mismo valor en ambos modos
    raise ExportLimitExceededError(count=count, limit=EXPORT_MAX_PRODUCTS)
```

`organization_id=None` en modo "todas" omite el filtro de tenant —
mismo mecanismo SQL ya usado en `list_products` para el caso admin
sin filtro (`contract-summary.md`, verificado por el reviewer de
Contract Design).

## Sin partitioning ni escalado horizontal (sin cambio)

No aplica — el enforcement del cap ES el mecanismo de control de
escala, en ambos modos.

## Diseño de carga (sin cambio)

Sin balanceo de carga nuevo — el endpoint corre dentro del pool de
workers ya existente del servicio FastAPI, sin worker dedicado.

## Fuente

Deriva de `scalability-requirements.md` (NFR3.1, NFR3.2) y
`functional-spec.md` (Workflow 2, paso 4).
