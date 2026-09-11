# Build Instructions — 260911-export-org-selector

Cambio 100% frontend (`apps/web`), sin cambios de backend, migraciones,
ni dependencias nuevas. Reusa la infraestructura de build/test ya
existente en el monorepo.

## Instalación de dependencias

Ya instaladas (workspace existente, sin dependencias nuevas agregadas
por este intent):

```bash
pnpm install
```

## Setup de entorno

Sin variables de entorno ni config nueva. El frontend corre contra los
mismos endpoints ya configurados (`API_URL`, cookies httpOnly) — sin
cambios de este intent.

## Comandos de build

```bash
# Desde la raíz del repo
pnpm --filter web exec tsc --noEmit          # typecheck
pnpm --filter web exec next build             # build de producción (Turbopack)
```

## Verificación de build

- `tsc --noEmit` debe salir limpio (0 errores) — verificado en Code
  Generation sobre los 4 archivos tocados; re-verificado acá sobre el
  proyecto completo.
- `next build` debe completar sin errores de compilación ni warnings de
  tipos.

## Troubleshooting

- Si `next build` falla por un módulo no resuelto: correr `pnpm install`
  desde la raíz (workspace monorepo, no `apps/web` aislado).
- Sin pasos de build específicos de este feature — es una adición de
  código dentro de un Unit frontend ya existente, mismo pipeline de
  build que cualquier otro cambio en `apps/web`.
