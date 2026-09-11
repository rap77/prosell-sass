# Performance Design — u1-export-org-confirmation

## Sin estrategia técnica nueva

`nfr-requirements` (`performance-requirements.md`) no definió ningún
target numérico nuevo para este Unit — el cambio no agrega latencia
medible al camino crítico existente (lectura de estado en memoria +
consumo de un query ya cacheado). No hay ninguna estrategia de caching,
batching, lazy-loading, ni circuit-breaker que diseñar para este alcance.

`useOrganizations()` ya implementa su propia estrategia de cache
(TanStack Query, ya vigente en el proyecto) — este Unit no la modifica,
solo la consume, igual que ya hace `OrganizationPicker`.
