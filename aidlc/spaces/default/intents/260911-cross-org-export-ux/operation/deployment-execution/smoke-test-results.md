# Smoke Test Results — 260911-cross-org-export-ux

## Contenedores post-deploy

```
prosell-staging-web    Up 12 minutes (healthy)
prosell-staging-api    Up 12 minutes (healthy)
prosell-staging-db     Up 13 hours (healthy)
prosell-staging-redis  Up 13 hours (healthy)
prosell-staging-minio  Up 12 minutes (healthy)
```

`api` y `web` reiniciaron con las imágenes nuevas (12 minutos de
uptime, coincide con el deploy recién completado); `db`/`redis` no
reiniciaron (sin cambio de esos servicios en este intent).

## Health checks

| Endpoint                                 | Resultado |
| ---------------------------------------- | --------- |
| `GET http://localhost:8000/health` (api) | `200`     |
| `GET http://localhost:3000` (web)        | `200`     |

Ambos servicios responden saludables inmediatamente después del deploy.

## Verificación funcional del cambio (build/test results, no e2e nuevo en este stage)

La verificación funcional real del feature (los 8 fixes de mapeo CSV,
el modo "todas las organizaciones", el filtrado real de grilla, los 2
popups nuevos) ya ocurrió en `construction/build-and-test/test-results.md`
contra Postgres de test real (2032/2032 → 2034/2034 tras los 2 fixes de
seguridad de GGA) y en el commit real que acaba de desplegarse. Este
stage no repite ese trabajo — confirma que el ARTEFACTO desplegado
(contenedores reconstruidos desde el commit `4dd7bcd2`) está sano y
respondiendo, que es lo que un smoke test post-deploy verifica.

## Resultado

**PASS.** Ambos servicios saludables, sin errores en el arranque.
