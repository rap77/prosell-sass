# Drift Report — Intent 260915-vehicle-catalog

## Resumen

Sin AWS Config — verificación real corrida contra el entorno de staging
local accesible (Q3, confirmado por el humano: "verificar contra staging
ahora"), no una simulación.

## Verificación 1 — Migraciones Alembic

```bash
# Repo
cd apps/api && uv run alembic heads
# → 20260917_0001 (head)

# Base de datos de staging real
docker exec prosell-staging-db psql -U postgres -d prosell_staging -t \
  -c "SELECT version_num FROM alembic_version;"
# → 20260917_0001
```

**Resultado: sin drift.** El head del repo coincide exactamente con la
versión aplicada en staging — confirma lo que `deployment-log.md` ya
documentó (la migración corrió sin error como parte del `docker compose
up -d`).

## Verificación 2 — Estado de contenedores vs. `docker-compose.staging.yml`

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | grep prosell
```

| Contenedor declarado    | Estado real        |
| ----------------------- | ------------------ |
| `prosell-staging-web`   | Up, healthy        |
| `prosell-staging-api`   | Up, healthy        |
| `prosell-staging-db`    | Up, healthy        |
| `prosell-staging-redis` | Up, healthy        |
| `prosell-staging-minio` | **`Exited (255)`** |

**Drift real detectado**: `prosell-staging-minio` no está corriendo. Log
del contenedor muestra `INFO: Exiting on signal: TERMINATED` — un apagado
limpio (SIGTERM), no un crash — consistente con una parada manual (ej. al
levantar el entorno dev local en paralelo, per el handoff de sesión previo
sobre `localhost:3010`/`8010`), no con una falla real del servicio.

**Impacto**: mientras `minio` esté caído, cualquier operación de storage
de objetos contra staging (subida/lectura de imágenes de producto) va a
fallar en ese entorno local — no afecta a producción (el droplet real usa
DigitalOcean Spaces, un servicio gestionado separado, no este contenedor
local).

**Acción recomendada**: `docker compose -f docker/docker-compose.staging.yml up -d minio minio-init`
cuando se vuelva a necesitar el entorno de staging local completo — no
bloqueante para cerrar este intent (el deploy real a staging remoto, si
lo hay, no pasa por este contenedor local).

## Verificación 3 — Configuración de logging (de `observability-setup`)

Confirmado: los 12 servicios entre `docker-compose.prod.yml` y
`docker-compose.staging.yml` tienen el bloque `logging` con caps
diferenciados (ver `log-queries.md` de `observability-setup`) — sin drift
respecto a lo documentado en esa etapa, verificado por lectura directa de
ambos archivos en esta misma sesión.
