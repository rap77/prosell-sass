# SLO Config — Intent 260915-vehicle-catalog

## Resumen

Sin SLI/SLO nuevo. `performance-design.md` (U1: NFR-PERF-1/2; U2: NFR4.1) y
`monitoring-design.md` de ambas Units concluyeron que este intent extiende
endpoints/flujos ya existentes del backend (`apps/api`) y frontend
(`apps/web`) sin introducir un servicio o journey de usuario con SLA propio
distinto del ya vigente para la plataforma:

- `POST /vehicles/decode-vin`: sin cambio de presupuesto de latencia — sigue
  dominado por la latencia de la API externa de NHTSA, sin dependencia nueva.
- `GET /categories/facebook-values/{field_key}`: lookup O(1) sobre un dict
  Python en memoria, latencia dominada por overhead de framework/red.
- Los 3 flujos de frontend (VIN decode, editor de schema de categoría,
  ubicación por producto) usan TanStack Query ya vigente, sin necesidad de
  presupuesto de latencia propio.

Este proyecto no tiene SLOs formales documentados a nivel de plataforma (sin
error-budget tracking, sin ventana de 30 días declarada) — fuera de alcance
de este intent introducir esa práctica de cero.

## Decisión de esta etapa (Q1, confirmada por el humano)

Sin SLO/SLI nuevo — se confirma la conclusión del diseño.
