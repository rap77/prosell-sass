# Performance Design — u1-cross-org-export-api

Diseña las soluciones concretas para `performance-requirements.md`
(NFR-PERF-1 a NFR-PERF-5) de este mismo Unit. Extiende sin cambio el
diseño ya aprobado en `260903-catalog-client-export` (semáforo de
concurrencia, presupuesto por fase) y agrega el diseño de las dos
resoluciones batch nuevas de este intent.

## Estrategia de concurrencia — lectura de imágenes (sin cambio respecto a 260903)

Para cumplir NFR-PERF-1/4 (p95 < 15s / < 18s para 500 productos), las
llamadas a `IDOSpacesService.get_object()` corren concurrentemente,
acotadas por un semáforo de máximo 20 lecturas simultáneas — mismo
diseño ya aprobado, sin cambio: el techo de volumen (500 productos) no
cambia en este intent, solo pasa de por-org a global.

```python
# Pseudocódigo ilustrativo — no implementación completa
semaphore = asyncio.Semaphore(20)

async def read_image_bounded(image_key: str) -> bytes | None:
    async with semaphore:
        return await storage_port.get_object(image_key)
```

## Resolución batch de `org_code` (NUEVO, BR2.3, NFR-PERF-5)

Una sola query `WHERE id IN (...)` sobre el conjunto de `organization_id`
distintos del lote de productos, ejecutada ANTES del loop de armado —
mismo patrón ya afirmado en `team.md` (`_resolve_org_codes()` de
`bulk_upload_vehicles.py`):

```python
# Pseudocódigo ilustrativo
distinct_org_ids = {p.organization_id for p in products}
org_code_by_id = await organization_repo.get_codes_by_ids(distinct_org_ids)
# org_code_by_id: dict[UUID, str] — lookup O(1) dentro del loop por fila
```

Con ≤30 organizaciones reales en la plataforma hoy
(`technology-stack.md`), esta query resuelve en < 200ms (NFR-PERF-5) —
overhead despreciable frente al tiempo dominante de I/O de imágenes.

## Cache de resolución de vertical de categoría (NUEVO, BR1.3, NFR-PERF-6)

Memoización LAZY dentro del loop — a diferencia de `org_code` (que
batchea upfront porque `organization_id` ya viene resuelto sin
walk-up), la categoría necesita un walk-up jerárquico por producto, así
que se cachea el resultado la primera vez que se ve cada
`category_id` hoja:

```python
# Pseudocódigo ilustrativo
vertical_cache: dict[UUID, UUID | None] = {}

async def resolve_vertical(leaf_category_id: UUID) -> UUID | None:
    if leaf_category_id in vertical_cache:
        return vertical_cache[leaf_category_id]
    current = await category_repo.get_by_id_cross_tenant(leaf_category_id)
    while current.parent_id is not None:
        current = await category_repo.get_by_id_cross_tenant(current.parent_id)
    vertical_cache[leaf_category_id] = current.id
    return current.id
```

**NFR-PERF-6 (nuevo, atiende la observación Minor del reviewer de NFR
Requirements)**: resolución de vertical (walk-up + cache) < 300ms para
el conjunto completo de `category_id` distintos de un lote de 500
productos, p95 — acotado por la profundidad real del árbol de
categorías (2-4 niveles, `component-inventory.md`) y por el número de
`category_id` distintos realistas por lote (decenas, no cientos, dado
que los productos de un mismo dealer/vertical tienden a repetir
categorías).

## Sin caching de imágenes (sin cambio)

No aplica ninguna capa de cache para bytes de imagen — cada export es
una operación de lectura fresca, sin cambio respecto a `260903`.

## Query optimization

La query de productos `published` reusa el patrón de índice ya
existente en la tabla `products` — en modo "todas", la misma query
simplemente omite el filtro `WHERE organization_id = :id` (ver
`scalability-design.md`), sin índice nuevo.

## Presupuesto de performance por fase

| Fase                                                               | Presupuesto (dentro de NFR-PERF-4, 18s total, modo "todas")       |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Query de productos published (con o sin filtro de organización)    | < 500ms                                                           |
| Resolución batch de `org_code` (NFR-PERF-5)                        | < 200ms                                                           |
| Resolución de vertical de categoría, cacheada (NFR-PERF-6)         | < 300ms                                                           |
| Armado de las 500 filas de CSV                                     | < 150ms (en memoria, sin I/O)                                     |
| Lectura concurrente de imágenes (hasta 5000, máx 20 simultáneas)   | < 15s (cuello de botella dominante, sin cambio respecto a 260903) |
| Ensamblado del ZIP final                                           | < 1s                                                              |
| **Margen sin asignar** (serialización HTTP, overhead de framework) | ~0.85s                                                            |

La suma de fases asignadas (≈17.15s) deja un margen explícito de
~0.85s por debajo del target de NFR-PERF-4 (< 18s).

## Fuente

Deriva de `performance-requirements.md` (NFR-PERF-1 a NFR-PERF-5) y
`tech-stack-decisions.md` (ambos de `nfr-requirements` de este Unit),
`functional-spec.md` (Workflow 2, pasos 6-8) y `contract-summary.md`.
