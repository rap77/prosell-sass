# Unit Dependency DAG — Catálogo Canónico de Vehículos para Facebook

## Grafo de dependencias

```yaml
units:
  - name: u1-vehicle-catalog-api
    kind: service
    depends_on: []
  - name: u2-vehicle-catalog-ui
    kind: ui
    depends_on: [u1-vehicle-catalog-api]
```

## Edges (prosa)

- **U2 (`u2-vehicle-catalog-ui`) depende de U1 (`u1-vehicle-catalog-api`)** — parcial: la porción de U2 que cubre US1.1/US1.2 necesita que U1 exponga (a) el valor ya reconciliado en la respuesta del decode de VIN, y (b) el catálogo de opciones canónicas para `category-schema-editor.tsx`. La porción de U2 que cubre US2.1 (ubicación por producto) NO depende de trabajo nuevo de U1 — usa contratos de `Product` ya existentes y no tocados por este intent.
- **U1 no depende de U2** — es puramente backend, sin necesidad de ningún artefacto de frontend.

## Puntos de integración

- **Decode de VIN reconciliado**: U1 extiende la respuesta existente del endpoint de decode de VIN para incluir valores ya reconciliados contra `FacebookVehicleValueCatalog`; U2 consume esa misma respuesta (sin endpoint nuevo, mismo contrato existente, forma exacta a fijar en Contract Design).
- **Catálogo de opciones canónicas**: U1 expone las opciones canónicas de un campo mapeado a Facebook; U2 (`category-schema-editor.tsx`) las consume en vez de la lista estática hoy mantenida a mano. Forma exacta (endpoint nuevo vs. extensión de uno existente) a fijar en Contract Design (FR1.4 lo deja abierto explícitamente).
- **Ubicación por producto**: sin punto de integración nuevo — U2 usa los campos `location_city`/`location_state` ya expuestos por los endpoints de creación/edición de producto existentes.

## Oportunidades de paralelismo

- La porción de U2 que cubre US2.1 (ubicación por producto) puede empezar en paralelo con U1 desde el día 1 — no tiene dependencia real, solo aparece bajo el mismo Unit por cohesión de deployable (frontend).
- La porción de U2 que cubre US1.1/US1.2 solo puede avanzar en paralelo con U1 hasta el punto de integración (puede maquetarse contra un mock del contrato, pero necesita el contrato real de U1 para completarse).
- Esta nota describe topología y oportunidad, no una recomendación de orden de implementación — la secuencia económica real (qué construir primero y por qué) es decisión de Delivery Planning (2.9), no de esta etapa.
