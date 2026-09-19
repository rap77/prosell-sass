# Runbooks — Intent 260915-vehicle-catalog

## Resumen

Este intent no introduce ningún servicio, contenedor ni dependencia externa
nueva (confirmado en `dashboards.md`/`alarms.md` de `observability-setup`,
y en `reliability-design.md`/`security-design.md`/`infrastructure-specification.md`
de ambas Units, todos READY). Los runbooks de abajo son los ya vigentes de la
plataforma — droplet self-hosted, Docker Compose, sin AWS SSM Automation —
con una sección nueva para el modo de falla específico de la migración
Alembic de este intent.

## Runbook 1 — Contenedor caído/reiniciando (api/web/db/redis/worker/caddy)

**Síntoma**: healthcheck de Docker Compose falla, `docker ps` muestra el
contenedor en `Restarting` o `Unhealthy`.

```bash
# 1. Ver logs recientes del contenedor
docker logs prosell-prod-<servicio> --tail 200

# 2. Ver estado y motivo del último restart
docker inspect prosell-prod-<servicio> --format '{{.State.Health.Status}} {{.State.Health.Log}}'

# 3. Reinicio manual si `restart: unless-stopped` no lo recuperó
docker compose -f docker/docker-compose.prod.yml restart <servicio>

# 4. Si persiste, rebuild completo (post mortem de causa antes de este paso)
docker compose -f docker/docker-compose.prod.yml up -d --build <servicio>
```

## Runbook 2 — Fallo de la migración Alembic en el arranque (NUEVO para este intent)

**Síntoma**: el contenedor `api` no llega a `healthy` — el CMD del
`docker/api.Dockerfile` corre `alembic upgrade head` ANTES de uvicorn, así
que un fallo de migración bloquea el arranque completo del backend.

```bash
# 1. Ver el error exacto de la migración
docker logs prosell-prod-api --tail 100

# 2. Si es la migración de este intent (20260917_0001_migrate_legacy_vehicle_catalog):
#    revisar el log de resumen (ver log-queries.md de observability-setup)
docker logs prosell-prod-api 2>&1 | grep -A5 "migrate_legacy_vehicle_catalog"

# 3. Downgrade manual si hace falta revertir (la migración tiene downgrade()
#    simétrico, probado en test_migrate_legacy_vehicle_catalog.py — 6 tests)
docker exec prosell-prod-api python -m alembic downgrade -1

# 4. Restaurar desde el backup pre-deploy si el downgrade no alcanza
#    (ver Runbook 3 — Restauración de base de datos)
```

## Runbook 3 — Restauración de base de datos desde backup

**Contexto real** (verificado contra `scripts/deploy-production.sh`): el
backup de Postgres corre automáticamente como `pg_dump` **antes de cada
deploy a producción**, retiene los últimos 10 backups en `backups/` en el
droplet — NO es un cron independiente entre deploys.

```bash
# 1. Ubicar el backup más reciente
ls -lt backups/ | head -5

# 2. Restaurar (requiere detener la API primero para evitar escrituras concurrentes)
docker compose -f docker/docker-compose.prod.yml stop api worker
docker exec -i prosell-prod-db psql -U $POSTGRES_USER -d $POSTGRES_DB < backups/<archivo>.sql
docker compose -f docker/docker-compose.prod.yml start api worker
```

## Runbook 4 — Certificado SSL de Caddy vencido/fallando

**Síntoma**: `https://prosellweb.com`/`api.prosellweb.com` inaccesible,
Caddy loguea error de renovación con Let's Encrypt.

```bash
docker logs prosell-prod-caddy --tail 100
docker compose -f docker/docker-compose.prod.yml restart caddy
```

## Runbook 5 — Disco lleno

```bash
df -h /
docker system df
docker system prune -f   # ya corre automáticamente en cada promote-prod.yml
du -sh backups/*.sql | sort -h | tail -10   # backups viejos si BACKUP_KEEP no alcanzó a rotar
```
