# Scalability Design — u1-catalog-export-api

Diseña la solución concreta para `scalability-requirements.md` (NFR3.1)
de este mismo Unit.

## Enforcement del cap de recursos

Diseño concreto: chequeo de `COUNT(*)` sobre la query de productos
`published` de la organización, ejecutado ANTES de iniciar el armado del
ZIP (per `functional-spec.md` § Workflow Paso 4):

```python
# Pseudocódigo ilustrativo
count = await product_repo.count_published(organization_id)
if count > EXPORT_MAX_PRODUCTS:  # 500, NFR3.1
    raise ExportLimitExceededError(count=count, limit=EXPORT_MAX_PRODUCTS)
```

El valor `500` se define como constante nombrada (no un número mágico
disperso en el código) — un único punto de cambio si el negocio revisa
el cap en el futuro (`scalability-requirements.md` ya lo marca como
"valor fijo revisable").

## Sin partitioning ni escalado horizontal

No aplica — el enforcement del cap ES el mecanismo de control de escala
para este Unit (`scalability-requirements.md`), no hay dato particionado
ni servicio a escalar horizontalmente para esta funcionalidad puntual.

## Diseño de carga

Sin diseño de balanceo de carga nuevo — el endpoint corre dentro del
pool de workers ya existente del servicio FastAPI (`apps/api`), sin
worker dedicado ni cola separada (`tech-stack-decisions.md`: "sin
necesidad de Redis/Taskiq").

## Fuente

Deriva de `scalability-requirements.md` (NFR3.1) y `functional-spec.md`
(Paso 4 del workflow, donde este chequeo se ejecuta).
