# Scalability Design — U1 (`u1-vehicle-catalog-api`)

Basado en `nfr-requirements/scalability-requirements.md` (NFR-SCALE-1).

## Diseño: stateless, sin partición de datos

`FacebookVehicleValueCatalog` es un dict Python inmutable en memoria, replicado idéntico en cada proceso/worker del backend (sin estado compartido que sincronizar) — el mismo modelo de escalado horizontal ya vigente en la plataforma (múltiples workers detrás del mismo load balancer) cubre este Unit sin cambios.

Sin sharding, sin partición por tenant/organización (el catálogo es global, no por-organización), sin cola de mensajería. El tamaño fijo y chico del catálogo (9 campos, decenas de valores cada uno) no justifica ningún patrón de escalado de datos.

## Umbrales de capacidad

No aplica — no hay proyección de crecimiento del catálogo hacia un volumen que requiera revisitar este diseño (ver NFR-SCALE-1).
