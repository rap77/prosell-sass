# Stash Audit — 2026-06-25

Auditoría de los 7 stashes acumulados. Resultado: 1 preservado como artifact (patch), 6 dropeados.

## Contexto

Los stashes se acumularon durante sesiones anteriores sin acción de drop explícita.
Algunos vienen de branches que ya fueron mergeadas o abandonadas (commits base
referenciados ya no existen). Antigüedad estimada: 2-4 meses.

## Inventario y decisión

| #   | Origen del stash                                     | Contenido                                                                                                                                                                         | Decisión                        | Razón                                                                                                                                                                                                                      |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `fix/api-relative-urls` (branch eliminada)           | Routers backend (`image_router.py`, `product_router.py`, `vehicle_router.py`) + auto-generated `next-env.d.ts`                                                                    | **DROP**                        | Branch base eliminada; cambios de routers sin contexto. Riesgo de re-aplicar cambios rotos.                                                                                                                                |
| 1   | `main` (WIP)                                         | `task-progress.json` + `todo.md` (planning, no commited) + `tests/e2e/` specs/screenshots                                                                                         | **DROP**                        | Planning files son tooling local, no del repo. E2e specs/screenshots evolucionaron desde entonces.                                                                                                                         |
| 2   | `main` (WIP)                                         | `core/config.py` + `main.py` + middleware + `docker-compose.yml` + e2e specs/screenshots                                                                                          | **DROP**                        | Mismo contenido que #1 (probablemente el mismo WIP en otro punto). Backend evolucionó, no aplica sin rebase.                                                                                                               |
| 3   | `main` (`temporary-stash`)                           | `.planning/STATE.md` + docs viejos de `contract-testing-skill` (2026-04-03) + `VehicleForm.tsx` (27 líneas)                                                                       | **DROP**                        | `.planning/` no commited (es tool state local). Docs viejos. VehicleForm.tsx ya commiteado en main con cambios.                                                                                                            |
| 4   | `main` (`Cambios de formato ruff`)                   | `config.py` + `email_service.py` (formatting only)                                                                                                                                | **DROP**                        | Solo cambios de formato ruff, ya aplicados vía `ruff format` en commits posteriores.                                                                                                                                       |
| 5   | `feature/auth-httpOnly-migration` (branch eliminada) | `.serena/memories/session_context_2026-02-18.md` + auto-generated files                                                                                                           | **DROP**                        | Solo memories de Serena + auto-generated (next-env, tsbuildinfo). Ruido puro.                                                                                                                                              |
| 6   | `feature/fase-2-domain-migration` (branch eliminada) | **`.serena/memories/` (3 files) + `HANDOFF.md` + `PRPs/security/auth-httpOnly-migration.md` (900 líneas) + `authStore.ts` (109 líneas) + `useLocalStorageSchema.ts` (44 líneas)** | **PRESERVED as patch artifact** | Trabajo feature serio pero **con conflicts contra main actual** (auth code evolucionó: ya se usa `authApi.ts` + cookies httpOnly per `MEMORY.md` 2026-06-12 PR #18). Re-aplicar requiere rebase manual contra auth actual. |

## Artifact preservado

`docs/housekeeping/stash-6-auth-httpOnly-WIP.patch` — patch completo de stash@{6} (1917 líneas).
Si en el futuro se quiere revivir la migration httpOnly, este patch es el punto de partida.
El PRP (`PRPs/security/auth-httpOnly-migration.md` dentro del patch) sigue siendo
relevante para entender el approach planeado, aunque varios puntos ya están resueltos
por PR #18 (email Resend migration + auth httpOnly cookies).

## Estado actual

- 7/7 stashes procesados
- Working tree limpio
- Branch `chore/stash-audit-2026-06-25` con este doc + patch preservado
- Próxima acción: merge a main (o push directo si no requiere review)

## Política hacia adelante

- Stashes >7 días → auditar y decidir (branch + push, o drop con fecha en mensaje)
- Si un stash tiene contenido valioso, branchearlo a `feature/<name>-recovered-<date>` antes de dropear
- Si un stash es solo auto-generated o duplica código ya en main, drop directo
- Limpiar stashes al final de cada sesión de feature work
