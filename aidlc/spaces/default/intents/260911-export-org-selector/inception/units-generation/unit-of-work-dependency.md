# Unit Dependency DAG — 260911-export-org-selector

Un único Unit (`U1`) — sin dependencias, sin DAG que resolver. Este
artefacto describe topología únicamente (per la nota del stage file); no
recomienda orden de implementación — eso es de Delivery Planning (2.9).

## Grafo de dependencias

```yaml
units:
  - name: u1-export-org-confirmation
    kind: ui
    depends_on: []
```

## Puntos de integración

Ninguno entre Units (solo hay uno). Integración EXTERNA (fuera del DAG de
Units de este intent, ya resuelta y estable):

- `GET /api/v1/products/export-client-format.zip` (backend, intent previo
  `260910-export-cross-org`, ya mergeado — no se modifica).
- `GET /api/v1/admin/organizations` (backend, ya existente — no se
  modifica).

## Oportunidades de desarrollo en paralelo

No aplica — un solo Unit.
