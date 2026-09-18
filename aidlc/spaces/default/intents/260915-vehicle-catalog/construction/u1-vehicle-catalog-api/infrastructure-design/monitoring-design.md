# Monitoring Design — U1 (`u1-vehicle-catalog-api`)

Implementa la estrategia de `nfr-design/observability-design.md` (NFR-OBS-1, NFR-OBS-2) con el stack de monitoreo ya vigente de la plataforma — sin herramienta nueva.

## Metrics & KPIs

| Metric                                         | Source                                            | Threshold                                      | Why it matters                                                             |
| ---------------------------------------------- | ------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Conteo de warnings de `field_key` sin catálogo | Log estructurado del backend (grep/alerta manual) | Cualquier ocurrencia > 0 amerita investigación | Señal de bug de configuración en `FacebookVehicleValueCatalog` (NFR-OBS-1) |

## Alerts

Sin alerta automatizada nueva — el volumen esperado de warnings de `field_key` sin catálogo es cero en operación normal; cualquier ocurrencia se detecta por revisión manual de logs, no por un canal de alerta dedicado (bajo riesgo, sin justificación de costo/complejidad de una alerta nueva).

## SLIs / SLOs

Sin SLI/SLO nuevo — este Unit no introduce un servicio con SLA propio distinto del ya vigente para el backend.

## Logs & Tracing

- **Log de resumen de migración** (NFR-OBS-2): emitido una sola vez al finalizar el script de migración legacy — conteo de migrados/excluidos + motivo de exclusión. Consumido por revisión manual, sin agregación ni dashboard.
- **Tracing**: sin cambio — mismo correlation-id/request-id ya vigente en el backend cubre los 2 endpoints extendidos de este Unit.
