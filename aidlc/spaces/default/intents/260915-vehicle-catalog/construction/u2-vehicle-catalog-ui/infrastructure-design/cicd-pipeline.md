# CI/CD Pipeline — U2 (`u2-vehicle-catalog-ui`)

Sin cambio de pipeline — U2 se integra al pipeline ya vigente del frontend (`ci.yml`, `deploy.yml`), sin build stage, gate, ni estrategia de despliegue nueva.

## Build & Test

Mismo pipeline ya vigente: pre-commit (lint-staged, prettier) y CI (ESLint `--max-warnings=0`, TypeScript, Vitest) — los tests nuevos de este Unit se agregan a la suite existente, sin infraestructura de test nueva. Confirmado contra el job real: `.github/workflows/ci.yml` job `test-node` corre `pnpm --filter @prosell/web test:coverage`, que resuelve a `vitest --coverage` (`apps/web/package.json`).

## Deployment Strategy

Sin cambio — deploy-on-merge a staging, gate manual para producción, ya vigente.

## Rollback

Sin procedimiento nuevo — mismo mecanismo ya vigente (revert de commit + re-deploy).

## Secrets Management

Sin secreto nuevo.
