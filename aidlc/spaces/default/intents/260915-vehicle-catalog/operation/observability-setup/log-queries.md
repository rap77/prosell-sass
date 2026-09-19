# Log Queries — Intent 260915-vehicle-catalog

## Resumen

Sin plataforma de agregación de logs (CloudWatch Logs Insights, Loki, etc.)
en este proyecto — la revisión de logs es manual, vía `docker logs` sobre
los contenedores del droplet self-hosted. Esta página documenta los comandos
exactos para revisar las 2 señales nuevas de este intent (Q2, confirmado por
el humano: "Documentar el comando exacto").

## Comandos de revisión manual

### 1. Warning de `field_key` sin catálogo canónico (NFR-OBS-1)

```bash
# Producción
docker logs prosell-prod-api --since 24h 2>&1 | grep -i "field_key"

# Staging
docker logs prosell-staging-api --since 24h 2>&1 | grep -i "field_key"
```

Volumen esperado: cero en operación normal. Cualquier resultado ameritaba
investigación manual — señal de un `field_key` decodificado que no calza con
ninguna entrada de `FacebookVehicleValueCatalog`.

### 2. Log de resumen de la migración legacy (NFR-OBS-2)

La migración `20260917_0001_migrate_legacy_vehicle_catalog` corre una sola
vez, automáticamente, como parte de `alembic upgrade head` en el arranque
del contenedor (`docker/api.Dockerfile` CMD). El resumen queda en los logs
de arranque del contenedor:

```bash
# Producción — buscar el resumen de la corrida de la migración
docker logs prosell-prod-api 2>&1 | grep -A5 "migrate_legacy_vehicle_catalog"

# Staging
docker logs prosell-staging-api 2>&1 | grep -A5 "migrate_legacy_vehicle_catalog"
```

Reporta conteo de registros migrados, conteo de excluidos por la guarda
anti-drift, y motivo de exclusión de cada registro excluido — revisión
manual post-deploy, sin agregación ni dashboard (ejecución única).

### 3. Verificación general de salud (ya vigente, sin cambio)

```bash
curl -fL http://localhost:8000/api/v1/health/   # backend
curl -f  http://localhost:3000/                  # frontend (staging/local)
```

## Nota de retención

Ver `deployment-execution/health-check-report.md` y esta misma etapa (Q3) —
`docker-compose.{prod,staging}.yml` ahora configuran rotación de logs
(json-file driver) diferenciada por volumen esperado de cada servicio, en
vez de un cap uniforme:

| Servicio                                | max-size | max-file | Cap total | Motivo                                                                                                            |
| --------------------------------------- | -------- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `api`                                   | 20m      | 5        | 100MB     | Concentra el log de negocio (errores, warnings NFR-OBS-1/2) — cap más grande para no perder contexto de debugging |
| `caddy` (solo prod)                     | 20m      | 5        | 100MB     | Access logs crecen con cualquier tráfico real                                                                     |
| `worker` (solo prod) / `web`            | 10m      | 3        | 30MB      | Volumen moderado                                                                                                  |
| `db` / `redis` / `minio` (solo staging) | 5m       | 2        | 10MB      | Bajo volumen salvo error grave                                                                                    |
| `minio-init` (solo staging)             | 2m       | 1        | 2MB       | Script de init de un solo shot, output despreciable                                                               |

`docker logs prosell-prod-api`/`prosell-staging-api` retiene hasta 100MB
antes de rotar — suficiente para revisar las 2 señales de este intent sin
depender de retención indefinida.
