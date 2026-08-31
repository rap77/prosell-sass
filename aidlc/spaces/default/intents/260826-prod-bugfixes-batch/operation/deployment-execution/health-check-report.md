# Health Check Report — 260826-prod-bugfixes-batch

## Status: N/A — deploy no ejecutado

No hay health checks que reportar: el deploy a staging no se ejecutó porque CI falló antes de que `deploy.yml` pudiera dispararse (ver `deployment-log.md`). No se tocó ningún contenedor de staging ni de producción en esta sesión.

## Referencia — health check que el pipeline real ejecuta cuando el deploy sí corre

Documentado acá para trazabilidad, verificado leyendo `.github/workflows/promote-prod.yml` (producción) directamente — no ejecutado en esta sesión:

- **Producción**: `curl -fL --retry 5 --retry-delay 10 --retry-connrefused https://api.prosellweb.com/api/v1/health/`, tras 30s de espera post-deploy.
- **Staging**: `deploy.yml` no corre un health check HTTP explícito post-deploy — levanta contenedores por etapas (DB → sync de password → API/Web) y solo imprime logs de contenedores si falla algún paso (`Print container logs on failure`).

Cuando el deploy se ejecute, este documento debe registrar el resultado real de esos checks (o del check manual equivalente si el deploy fue vía `workflow_dispatch`).
