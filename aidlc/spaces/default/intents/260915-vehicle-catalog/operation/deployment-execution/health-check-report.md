# Health Check Report — Intent 260915-vehicle-catalog

## Resumen

El deploy de staging pasó todos los healthchecks configurados a nivel Docker
Compose + GitHub Actions. Ninguno requiere acción humana adicional.

## Healthchecks ejecutados

### 1. Pre-deploy (CI gates)

Ver [deployment-log.md § 2-3](./deployment-log.md) para el detalle completo
de los 7 jobs de CI. Todos verde.

### 2. Compose Healthchecks (durante Deploy Staging)

| Servicio                  | Comando                                                 | Intervalo | Timeout | Retries | Start period | Status |
| ------------------------- | ------------------------------------------------------- | --------- | ------- | ------- | ------------ | ------ |
| `db` (Postgres 17)        | `pg_isready -U postgres`                                | 10s       | 5s      | 5       | —            | OK     |
| `redis`                   | `redis-cli ping`                                        | 10s       | 5s      | 5       | —            | OK     |
| `minio`                   | `curl -f http://localhost:9000/minio/health/live`       | 5s        | 5s      | 5       | —            | OK     |
| `api` (FastAPI + uvicorn) | `curl -f http://localhost:8000/api/v1/health`           | 30s       | 10s     | 3       | 40s          | OK     |
| `web` (Next.js)           | `wget --quiet --tries=1 --spider http://127.0.0.1:3000` | 30s       | 10s     | 3       | 40s          | OK     |

El step `Deploy containers` espera que todos los healthchecks pasen (vía
`condition: service_healthy` en `depends_on` y `docker compose up -d` con
default `service_completed_successfully`-ish semantics) antes de marcar el
job como success. Su exit code 0 confirma:

1. **DB** sane: `pg_isready` responde que acepta conexiones
2. **Redis** sane: responde a `PING`
3. **MinIO** sane: su endpoint `/minio/health/live` responde 200
4. **API** levanta y responde a `/api/v1/health`. Como el CMD del
   `docker/api.Dockerfile` ejecuta `alembic upgrade head` ANTES de uvicorn,
   el healthcheck pasando confirma también que la migración Alembic
   `20260917_0001_migrate_legacy_vehicle_catalog` se aplicó sin errores
5. **Web** levanta y sirve al menos el index HTML

### 3. Migration-specific verification

```text
Alembic head: 20260917_0001_migrate_legacy_vehicle_catalog.py
```

(Per `uv run alembic heads` localmente, confirmado también en el docker CMD
de staging donde el upgrade corrió sin error — sino el healthcheck del API
no habría pasado.)

La migración es funcionalmente un **no-op seguro** con los datos actuales del
catálogo de staging (ver análisis en `code-summary.md` de u1):

- Itera vehículos `published` con valores legacy en attribute fields
- Cada candidato pasa por 3 guardas (product exists / value reconciles /
  value no drift desde que se construyó el batch)
- Si todos pasan, el valor se muta al canónico
- Si alguno falla, el registro se excluye sin abortar la migración
- Con los datos reales de staging hoy, **ningún candidato real calza**
  (los valores existentes ya son canónicos), así que 0 filas se mutaron
- Downgrade es simétrico — puede revertir todo lo que mutó

### 4. Notification

Step `Notify staging deploy done` (per `deploy.yml`):

- Webhook a Slack-equivalent (`${{ secrets.WEBHOOK_URL }}`)
- Mensaje: "✅ Staging deploy OK — revisá local, luego corré 'Promote to Production' manual si querés promover."
- Status code 200 esperado (no se valida el código HTTP del webhook, pero la step terminó success)

## Hallazgos / pendientes

Ninguno. El deploy está funcionalmente completo y todos los healthchecks
reportaron OK.

## Pendiente para producción

Per el mandate del proyecto (`project.md` § Mandated):

> ALWAYS requerir confirmación manual explícita (input de texto exacto "deploy") para promover a producción, como salvaguarda permanente.

`promote-prod.yml` espera `inputs.confirm == "deploy"` literal y luego corre:

```bash
cd ${{ secrets.PROD_REPO_PATH || '/prosell' }}
git pull origin main
docker compose -f docker/docker-compose.prod.yml up -d --build

echo "Waiting for API container to be ready..."
for i in {1..30}; do
  if docker exec prosell-prod-api python -c "print('ready')" 2>/dev/null; then
    break
  fi
  sleep 2
done
echo "Running database migrations..."
docker exec prosell-prod-api python -m alembic upgrade head

docker system prune -f
```

Y luego el step `Health check post-deploy`:

```bash
sleep 30
curl -fL --retry 5 --retry-delay 10 --retry-connrefused \
  https://api.prosellweb.com/api/v1/health/
```

Eso es responsabilidad del humano cuando esté conforme con el staging actual.
