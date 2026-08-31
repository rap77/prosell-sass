# Smoke Test Results — 260826-prod-bugfixes-batch

## Status: N/A — deploy no ejecutado

No se corrieron smoke tests porque el deploy a staging no llegó a ejecutarse: `deploy.yml` está gateado por `workflow_run` de `CI` con `conclusion == 'success'`, y CI falló (ver `deployment-log.md` para el detalle completo — 21 tests de integración fallidos + 12 errores en backend, bloqueo preexistente de CI/infra de al menos 2 semanas, no relacionado con este batch).

No hay contenedores nuevos (`prosell-staging-*`) que probar; el staging existente sigue sirviendo lo que ya tenía desplegado antes de este intent.

Cuando el deploy se ejecute (tras el fix de CI o un deploy manual explícito), este documento debe actualizarse con:

- Resultado de `curl` contra `/api/v1/health/` del backend de staging
- Verificación de carga del frontend en staging
- Al menos un smoke test del camino crítico afectado por este batch (los 7 bugfixes de producto + export CSV — ver `requirements.md` de este intent para el detalle de los FRs)
