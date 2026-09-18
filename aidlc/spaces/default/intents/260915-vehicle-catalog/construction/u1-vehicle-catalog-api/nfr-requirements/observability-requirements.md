# Observability Requirements — U1 (`u1-vehicle-catalog-api`)

Basado en `rules.md` (BR1.4, BR3.1).

## NFR-OBS-1: Warning server-side para `field_key` sin catálogo

- **Requisito**: `GET /categories/facebook-values/{field_key}` registra un warning server-side cuando el `field_key` solicitado no tiene ninguna entrada en `FacebookVehicleValueCatalog` (BR1.4, Q1 de Functional Design) — distingue un campo genuinamente sin catálogo de un bug de configuración.
- **Nivel de log**: `WARNING` (no `ERROR`) — es un 404 esperable para campos fuera del alcance de vehículos, no necesariamente un fallo.

## NFR-OBS-2: Log de resumen de la migración legacy

- **Requisito**: el script de migración (BR3.1) emite un resumen al finalizar — conteo de registros migrados, excluidos (por guarda fallida), y el motivo de exclusión de cada uno.
- **Consumo**: revisión manual post-migración por el equipo, no un dashboard/alerta automatizada (ejecución única, no un job recurrente).

Sin otros requisitos de observabilidad nuevos — el resto del Unit reutiliza logging/monitoreo ya vigente en la plataforma sin cambios.
