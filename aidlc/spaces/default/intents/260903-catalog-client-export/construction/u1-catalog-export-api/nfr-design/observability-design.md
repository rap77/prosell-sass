# Observability Design — u1-catalog-export-api

Diseña las soluciones concretas para `observability-requirements.md` de
este mismo Unit.

## Diseño de logging estructurado

Cada evento de `observability-requirements.md` se emite como log
estructurado (JSON, consistente con el formato ya vigente del resto de
`apps/api`) con estos campos concretos:

```python
# Pseudocódigo ilustrativo — shape del log, no implementación completa
log.warning("catalog_export.image_read_failed", extra={
    "product_id": product_id,
    "image_key": image_key,
    "organization_id": organization_id,
})

log.info("catalog_export.completed", extra={
    "organization_id": organization_id,
    "product_count": count,
    "duration_ms": duration_ms,
})

log.warning("catalog_export.limit_exceeded", extra={
    "organization_id": organization_id,
    "attempted_count": count,
    "limit": EXPORT_MAX_PRODUCTS,
})
```

Prefijo `catalog_export.*` en el nombre del evento — permite filtrar
todos los logs de este feature en una búsqueda, consistente con la
convención de nombrado ya vigente del resto de `apps/api` (namespacing
por dominio funcional).

## Métricas (RED method)

- `catalog_export_requests_total` (counter, labels: `status` = success/
  empty/limit_exceeded/error)
- `catalog_export_duration_seconds` (histogram) — valida
  `performance-requirements.md` NFR-PERF-1/2 en producción
- `catalog_export_images_failed_total` (counter) — señal para revisar la
  salud del storage o la calidad de datos de `image_urls`

## Tracing

Sin diseño de tracing distribuido nuevo (`observability-requirements.md`
ya lo descarta) — el `correlation_id`/`request_id` ya propagado por el
middleware existente alcanza para correlacionar los logs de un mismo
export.

## Alerting

Sin alerta nueva dedicada (`observability-requirements.md`) — el diseño
de logging arriba es suficiente para investigación manual/dashboards ad
hoc si el equipo decide revisar el uso del feature más adelante.

## Fuente

Deriva de `observability-requirements.md` (todas las secciones) y
`functional-spec.md` (los puntos exactos del workflow donde cada log se
emite).
