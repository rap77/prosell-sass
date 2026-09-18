# Deployment Execution — Preguntas de Pre-Despliegue

Etapa 4.3 (Operation phase) del intent **260915-vehicle-catalog**. Pre-condiciones
para promover los cambios del branch `feat/facebook-values-from-json` a
`origin/main` (lo que dispara el `Deploy Staging` workflow automáticamente).

Contexto: las suites de `apps/api` (2093 tests) y `apps/web` (1355 tests)
están en verde per `test-results.md`. La migración Alembic nueva
`20260917_0001_migrate_legacy_vehicle_catalog` corre automáticamente en el
container de staging vía `alembic upgrade head` (parte del `docker-compose
up -d`), fue probada con tests de idempotencia + 3 guardas + downgrade
simétrico en `apps/api/tests/alembic/versions/test_migrate_legacy_vehicle_catalog.py`.
Con los datos actuales del catálogo la migración es funcionalmente un no-op
seguro (ver `code-summary.md` de u1).

`cross-unit-traceability.md` declara el Cross-Unit Final Coverage Gate como
**NOT-READY parcial** — 4 de las 5 AC de US2.1 (override de ubicación por
producto vía UI) están en estado `Deferred` porque `ProductLocationFields`
está construido y probado a nivel de componente pero **no está wireado a
ninguna vista real de producto**. US1.1, US1.2, US1.3, US2.3 (export con la
misma prioridad) sí son funcionales de punta a punta.

## Pregunta 1 — Estado de los chequeos pre-despliegue locales

Antes del merge: ¿corro localmente el gate completo de pre-commit (Ruff,
Pyright, ESLint, Prettier, Tailwind validate, secret scan, GGA) para
confirmar que no haya hallazgos en archivos tocados por este intent, o lo
doy por confirmado por las suites verdes de CI?

- A. Corré el gate completo de pre-commit localmente y reportá el resultado
- B. Dalo por confirmado — las suites verdes son evidencia suficiente
- C. Solo corré `uv run ruff check src` + `pnpm --filter @prosell/web lint` + `pnpm --filter @prosell/web typecheck` (chequeo mecánico rápido)
- X. Other (please specify)

[Answer]:

## Pregunta 2 — Cómo resolver el gap de US2.1 antes del deploy

US2.1 (`ProductLocationFields` sin wiring a una vista real de producto)
queda como gap transparente conocido. ¿Cómo procedemos?

- A. Mergear y desplegar igual — US2.1 es código listo pero no expuesto al
  usuario final; los demás FR sí son funcionales de punta a punta y no se
  bloquean entre sí
- B. Pausar el deploy hasta que un intent/dispatch de seguimiento wiree
  `ProductLocationFields` a `UnifiedProductForm.tsx` (o equivalente)
- C. Mergear + desplegar + abrir un ticket/issue de seguimiento explícito
  para que quede registrado fuera del workflow
- X. Other (please specify)

[Answer]:

## Pregunta 3 — Target de despliegue

Este es un branch de feature con 4 commits ahead de `main` (incluyendo el
chore(aidlc) de tracking del intent). ¿Mergeo a `main` y dejo que el
`Deploy Staging` workflow corra automático (recomendado), o querés revisar
algo del diff antes?

- A. Merge squash a `main`, push a `origin/main`, y dejo correr `Deploy Staging`
  cuando CI termine verde
- B. Mostrame el diff completo de los 4 commits antes de cualquier merge
- C. Merge + push pero no dispares nada hasta que yo confirme
- X. Other (please specify)

[Answer]:

## Pregunta 4 — Ventana de despliegue y rollback

`promote-prod.yml` requiere input manual "deploy" para producción (gate de
seguridad vigente per `project.md`). ¿Staging se deploya ahora, y
producción queda pendiente de tu acción manual vía la UI de GitHub Actions?

- A. Sí — staging automático cuando CI pase verde en `main`; producción la
  disparás vos a mano desde la UI cuando estés conforme con el smoke test
  de staging
- B. Solo staging por ahora; no tocar producción bajo ningún motivo hasta
  próximo aviso
- C. Staging + producción con la misma confirmación "deploy" que ya está
  documentada
- X. Other (please specify)

[Answer]: A

## Respuestas registradas

| Pregunta                              | Respuesta                                                                                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 — Chequeos pre-despliegue locales  | **A** — correr el gate completo de pre-commit localmente (Ruff, Pyright, ESLint, Prettier, Tailwind validate, secret scan, GGA) antes de cualquier push                |
| P2 — Gap de US2.1                     | **A** — mergear y desplegar igual. US2.1 es código listo pero no expuesto al usuario final; los demás FR sí son funcionales de punta a punta y no se bloquean entre sí |
| P3 — Target de despliegue             | **A** — squash-merge a `main`, push a `origin/main`, dejar correr `Deploy Staging` workflow cuando CI termine verde                                                    |
| P4 — Ventana de despliegue y rollback | **A** — staging auto cuando CI pase verde; producción queda pendiente de acción manual del usuario vía `Promote to Production` con confirmación "deploy"               |

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
