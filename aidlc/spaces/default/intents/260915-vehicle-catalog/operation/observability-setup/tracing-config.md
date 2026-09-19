# Tracing Config — Intent 260915-vehicle-catalog

## Resumen

Sin instrumentación de tracing nueva. `observability-design.md` de U1
(`u1-vehicle-catalog-api`) confirma explícitamente: "sin cambio — el
request-id/correlation-id ya vigente en el backend cubre los 2 endpoints
extendidos de este Unit sin necesidad de propagación nueva". `monitoring-design.md`
de U2 (`u2-vehicle-catalog-ui`) confirma lo mismo del lado del frontend — los
3 flujos nuevos/extendidos usan el manejo de errores ya vigente
(`extractErrorMessage()`), sin necesidad de un trace-id propio.

Este proyecto no usa AWS X-Ray ni ninguna plataforma de tracing distribuido
(OpenTelemetry, Jaeger, etc.) — fuera de alcance de este intent introducirla.

## Decisión de esta etapa (Q1, confirmada por el humano)

Sin tracing nuevo — se confirma la conclusión del diseño.
