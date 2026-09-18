# Performance Design — U2 (`u2-vehicle-catalog-ui`)

Basado en `nfr-requirements/performance-requirements.md` (NFR4.1).

## Diseño: sin caché/optimización nueva (NFR4.1)

TanStack Query (ya vigente en el proyecto para data-fetching) provee cache y deduplicación de requests automáticamente para los 2 contratos consumidos (`POST /vehicles/decode-vin`, `GET /categories/facebook-values/{field_key}`) — sin necesidad de una capa de caché adicional del lado del cliente.

`GET /categories/facebook-values/{field_key}` es un dato estático por sesión (no cambia mientras el usuario edita el schema) — el comportamiento default de `staleTime`/`cacheTime` de TanStack Query ya evita refetches innecesarios sin configuración especial.

Sin lazy loading, sin paginación, sin CDN — ninguno aplicable a estos 3 flujos de formulario.
