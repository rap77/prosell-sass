# Observability Design — u1-cross-org-export-api

Diseña las soluciones concretas para `observability-requirements.md` de
este mismo Unit. Extiende el diseño ya aprobado en
`260903-catalog-client-export` con los eventos nuevos del modo "todas".

## Diseño de logging estructurado

```python
# Pseudocódigo ilustrativo — shape del log, no implementación completa

# Caso puntual (sin cambio respecto a 260903)
log.info("catalog_export.completed", extra={
    "organization_id": organization_id,
    "product_count": count,
    "duration_ms": duration_ms,
})

# Modo "todas" (NUEVO — BR2.5/FR6.1)
log.info("catalog_export.completed_all_orgs", extra={
    "scope": "ALL_ORGS",
    "user": current_user.id,
    "own_org": owner_tenant_id,
    "product_count": count,
    "organization_count": len(distinct_org_ids),
    "duration_ms": duration_ms,
})

log.warning("catalog_export.limit_exceeded", extra={
    "scope": "ALL_ORGS" if all_organizations else None,
    "organization_id": None if all_organizations else organization_id,
    "attempted_count": count,
    "limit": EXPORT_MAX_PRODUCTS,
})

log.warning("catalog_export.permission_denied_all_orgs", extra={
    "user": current_user.id,
    "own_org": owner_tenant_id,
})
```

Mismo prefijo `catalog_export.*` ya establecido — el sufijo
`_all_orgs`/campo `scope=ALL_ORGS` distingue el evento de mayor radio
de explosión sin romper el filtro por prefijo ya usado en dashboards
existentes.

## Métricas (RED method, extendidas)

- `catalog_export_requests_total` (counter, labels: `status`, `scope`)
  — se agrega el label `scope` (`own`/`cross-org`/`all-orgs`) al ya
  existente.
- `catalog_export_duration_seconds` (histogram, sin cambio) — valida
  `performance-requirements.md` NFR-PERF-1/2/4.
- `catalog_export_images_failed_total` (counter, sin cambio).

## Tracing (sin cambio)

Sin tracing distribuido nuevo — el `correlation_id` ya propagado
alcanza.

## Alerting (sin cambio)

Sin alerta nueva dedicada — decisión ya afirmada (`team.md` §
Deployment).

## Fuente

Deriva de `observability-requirements.md` (todas las secciones) y
`functional-spec.md` (Workflow 2, pasos 6, 9).
