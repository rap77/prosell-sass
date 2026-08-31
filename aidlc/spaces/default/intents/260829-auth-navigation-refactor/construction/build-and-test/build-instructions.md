# Build Instructions — 260829-auth-navigation-refactor

> Consume `construction/u1-auth-navigation-refactor/code-generation/code-generation-plan.md`,
> `code-summary.md` y `unit-test-instructions.md`. Alcance exclusivamente `apps/web`
> (frontend) — sin cambios en `apps/api`.

## Dependency Installation

Ninguna dependencia nueva — el Unit no agregó paquetes a `apps/web/package.json`.
Si el workspace está limpio:

```bash
pnpm install
```

## Environment Setup

Sin variables de entorno nuevas. `buildOAuthAuthorizeUrl` sigue leyendo
`NEXT_PUBLIC_API_URL` tal como ya lo hacía el código pre-refactor (comportamiento
preservado, NFR3).

## Build Commands

```bash
cd apps/web
pnpm exec tsc --noEmit
pnpm exec eslint . --max-warnings=0
```

No se ejecuta `next build` completo para este cambio — es un refactor interno de
4 archivos sin impacto en rutas, config de build ni dependencias; `tsc --noEmit` +
`eslint` cubren la superficie real tocada. Se corrieron ambos de forma independiente
en Code Generation (ver `code-summary.md` § Validation Tool Results) — este stage
los re-confirma antes de correr tests.

## Build Verification

- `tsc --noEmit` sin output → sin errores de tipos nuevos.
- `eslint . --max-warnings=0` sin output → cero warnings/errores, incluyendo los 4
  archivos donde se eliminaron los 5 `eslint-disable @next/next/no-location-assign-relative-destination`
  (FR2).

## Troubleshooting

- Si `eslint` reporta la regla `no-location-assign-relative-destination` en
  `oauthRedirect.ts` o `fetchWithAuth.ts`: la regla no resuelve `CallExpression`
  estáticamente — confirmar que la construcción de URL/path sigue envuelta en una
  función nombrada (`buildOAuthAuthorizeUrl` / `buildSessionExpiredRedirectPath`),
  no inline en el `window.location.href = ...`.
- Si `tsc --noEmit` falla en archivos no tocados por este Unit: no es una regresión
  de este cambio — verificar con `git stash`/`pop` contra el baseline de `main`
  antes de reportarlo como hallazgo de este stage.
