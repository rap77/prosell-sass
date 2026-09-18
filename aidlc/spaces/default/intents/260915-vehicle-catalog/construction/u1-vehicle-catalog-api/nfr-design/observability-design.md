# Observability Design — U1 (`u1-vehicle-catalog-api`)

Basado en `nfr-requirements/observability-requirements.md` (NFR-OBS-1, NFR-OBS-2).

## Warning de `field_key` sin catálogo (NFR-OBS-1)

Logging estructurado ya vigente en la plataforma (`logger.warning(...)`), con el `field_key` no reconocido como campo estructurado — sin métrica ni dashboard nuevo (volumen esperado: cero en operación normal, cualquier ocurrencia es señal de bug de configuración a investigar manualmente).

## Log de resumen de migración (NFR-OBS-2)

Log estructurado al finalizar la migración: conteo de migrados, conteo de excluidos por guarda, y el motivo de exclusión de cada registro excluido (para revisión manual post-ejecución) — sin alerta automatizada ni dashboard (ejecución única, no un proceso recurrente que monitorear).

## Métricas / SLI-SLO

Sin métrica nueva — este Unit no introduce un SLI/SLO propio distinto del ya vigente para el backend (mismos endpoints extendidos, no nuevos servicios).

## Correlation IDs

Sin cambio — el request-id/correlation-id ya vigente en el backend cubre los 2 endpoints tocados por este Unit sin necesidad de propagación nueva.
