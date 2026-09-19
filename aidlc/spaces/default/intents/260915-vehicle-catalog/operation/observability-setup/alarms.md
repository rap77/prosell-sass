# Alarms — Intent 260915-vehicle-catalog

## Resumen

Sin alerta automatizada nueva. `monitoring-design.md` de ambas Units
(`u1-vehicle-catalog-api`, `u2-vehicle-catalog-ui`) concluyó explícitamente
que el volumen esperado de las 2 señales nuevas de este intent es
cero/único en operación normal:

- **Warning de `field_key` sin catálogo canónico** (NFR-OBS-1, backend):
  cualquier ocurrencia es señal de un bug de configuración en
  `FacebookVehicleValueCatalog` — se investiga manualmente, no ameritaba
  un canal de alerta dedicado dado el bajo riesgo y volumen esperado.
- **Log de resumen de la migración legacy** (NFR-OBS-2, backend): ejecución
  única (la migración Alembic `20260917_0001_migrate_legacy_vehicle_catalog`
  no es un job recurrente) — sin alerta, revisión manual post-ejecución.

Sin plataforma de alertas (SNS/PagerDuty/Slack-webhook de monitoreo) en este
proyecto más allá del webhook de notificación de deploy ya vigente
(`deploy.yml` → "Notify staging deploy done"), que no cambia con este intent.

## Decisión de esta etapa (Q1, confirmada por el humano)

Sin alerta nueva — se confirma la conclusión del diseño.
