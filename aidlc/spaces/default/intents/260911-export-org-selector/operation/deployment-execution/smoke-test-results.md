# Smoke Test Results — 260911-export-org-selector (staging)

`deploy.yml` no incluye un paso de smoke test de aplicación (solo health
checks de Docker Compose, ya cubiertos en `deployment-log.md`) — se
corrió un smoke test manual contra el staging recién desplegado
(`localhost:3000`/`localhost:8000`, mismo host que el runner self-hosted)
inmediatamente después de que el job `Deploy Staging` terminó.

## Resultados

| Check                                             | Comando                                                                      | Resultado                                                                                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend responde                                 | `curl -o /dev/null -w "%{http_code}" http://localhost:3000/`                 | `200`                                                                                                                                  |
| `/catalog` responde (ruta tocada por este intent) | `curl -o /dev/null -w "%{http_code}" http://localhost:3000/catalog`          | `307` (redirect a login — esperado, sin sesión autenticada; confirma que la ruta compiló y el middleware de auth corre, no un 500/502) |
| Backend responde                                  | `curl -L -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/health` | `200` (tras redirect de trailing-slash, `307 → 200`)                                                                                   |

## Alcance

Verificación de disponibilidad (la app arriba, sin 5xx), no una
verificación funcional end-to-end del feature cross-org (eso
requeriría credenciales de `ORG_ADMIN_VIEW_ALL` contra datos reales de
staging con más de una organización — fuera del alcance de un smoke
test automatizado post-deploy). La cobertura funcional real del feature
ya está verificada por la suite completa (166/166 archivos, 1303/1303
tests, `build-and-test/test-results.md`) y por la verificación en vivo
ya hecha en el intent previo (`260910-export-cross-org`) para el lado
backend del mismo flujo.

## Sin regresión visible

Ningún contenedor quedó en estado `Unhealthy`/`Restarting` tras el
deploy (ver `deployment-log.md`) — no se disparó ningún rollback.

## Confirmación

Resumen confirmado por el humano ("Looks correct") en `deployment-execution-questions.md` § Consolidated Summary Confirmation.
