# Performance Design — u1-catalog-export-api

Diseña las soluciones concretas para cumplir
`performance-requirements.md` (NFR-PERF-1/2/3) de este mismo Unit.

## Estrategia de concurrencia — lectura de imágenes

Para cumplir NFR-PERF-1 (p95 < 15s para 500 productos, hasta 5000
lecturas de imagen totales), las llamadas a
`IDOSpacesService.get_object()` corren **concurrentemente, acotadas por
un semáforo de máximo 20 lecturas simultáneas** (decisión confirmada en
la entrevista, Q1):

```python
# Pseudocódigo ilustrativo — no implementación completa
semaphore = asyncio.Semaphore(20)

async def read_image_bounded(image_key: str) -> bytes | None:
    async with semaphore:
        return await storage_port.get_object(image_key)

results = await asyncio.gather(
    *(read_image_bounded(key) for key in all_image_keys),
    return_exceptions=True,
)
```

**Por qué acotada y no ilimitada**: `asyncio.gather` sin límite dispararía
hasta 5000 conexiones simultáneas a DigitalOcean Spaces en el peor caso
(500 productos × 10 imágenes) — riesgo real de saturar el pool de
conexiones HTTP del cliente `boto3`/`aiohttp` y la memoria del proceso
(todas las imágenes en vuelo simultáneamente). Un semáforo de 20 acota
ambos riesgos sin sacrificar significativamente el tiempo total (I/O-bound,
no CPU-bound — 20 en paralelo sigue siendo mucho más rápido que
secuencial).

## Sin caching

No aplica ninguna capa de cache — cada export es una operación de
lectura fresca (los datos de `Product`/`Organization` pueden haber
cambiado desde el último export, y cachear imágenes ya subidas no aporta
valor para un flujo de un solo uso por request).

## Query optimization

La query de productos `published` filtrados por `organization_id` reusa
el patrón de índice ya existente en la tabla `products` (sin índice
nuevo — el filtro por `organization_id` + `status` ya está cubierto por
los índices del resto del sistema de catálogo, `technology-stack.md`).

## Presupuesto de performance por fase

| Fase                                                                              | Presupuesto (dentro de NFR-PERF-1, 15s total) |
| --------------------------------------------------------------------------------- | --------------------------------------------- |
| Query de productos published                                                      | < 400ms                                       |
| Armado de las 500 filas de CSV                                                    | < 150ms (operación en memoria, sin I/O)       |
| Lectura concurrente de imágenes (hasta 5000, máx 20 simultáneas)                  | < 12s (cuello de botella dominante)           |
| Ensamblado del ZIP final                                                          | < 1s                                          |
| **Margen sin asignar** (serialización HTTP, overhead de framework, jitter de red) | ~1.45s                                        |

La suma de fases asignadas (≈13.55s) deja un margen explícito de ~1.45s
por debajo del target estricto de NFR-PERF-1 (< 15s) — el presupuesto no
consume el 100% del target, para no depender de que cada fase individual
rinda exactamente en su máximo.

## Fuente

Deriva de `performance-requirements.md` (NFR-PERF-1/2/3) y
`tech-stack-decisions.md` (ambos de `nfr-requirements` de este Unit),
`functional-spec.md` (Functional Design, el flujo que esta sección
optimiza) y `contract-summary.md` (el contrato de respuesta única que
acota cuándo termina la medición de NFR-PERF-1).
