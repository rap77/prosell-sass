# Smoke Test Results — 260903-catalog-client-export

## Estado: NO EJECUTADO — bloqueado por infraestructura, no por el código

El smoke test estándar del equipo corre **contra staging, después del
deploy automático** (`team.md`: "Notificaciones de deploy + health
check post-deploy en producción"; el equivalente de staging es el job
`deploy-staging` de `deploy.yml`). Como `Deploy Staging` no completó
(ver `deployment-log.md` § "Deploy Staging — bloqueado por
infraestructura preexistente"), no hay una instancia de staging con el
código nuevo desplegado contra la cual correr el smoke test — correrlo
igual solo confirmaría el comportamiento YA vigente en staging (el
código previo al merge), no el cambio de este intent.

## Lo que SÍ se verificó como sustituto (sin staging real)

- **CI verde** (`gh run 34036253442`) es la señal más fuerte
  disponible: la suite completa backend (1999→2001 tests, incluyendo
  los 7 tests de integración específicos del endpoint nuevo contra
  Postgres real) y la suite completa frontend (166 archivos/1292
  tests) pasan en un entorno limpio, no solo en la máquina local del
  conductor.
- Verificación manual del endpoint nuevo YA se hizo en `Build and
Test` (`test_product_router_export_client_format.py`, contrato
  Content-Type/Content-Disposition, 200/404/413, aislamiento
  multi-tenant — todos contra una DB Postgres 17 real, no mocks).

## Pendiente

Cuando el runner self-hosted se recupere y `Deploy Staging` corra
exitosamente, correr el smoke test manual real:

1. Login en staging con las credenciales ya documentadas
   (`prosellweb@gmail.com`).
2. Ir a Catálogo → menú Exportar → "Exportar catálogo (formato
   cliente)".
3. Confirmar el banner → confirmar el prompt → verificar que el ZIP
   se descarga con el CSV de 24 columnas + carpetas de imágenes.
4. Repetir con un catálogo sin productos `published` → confirmar
   mensaje de catálogo vacío.

Este paso queda documentado como pendiente en el gate de esta etapa,
no como "hecho". El humano confirmó cerrar la etapa con este pendiente
explícito.
