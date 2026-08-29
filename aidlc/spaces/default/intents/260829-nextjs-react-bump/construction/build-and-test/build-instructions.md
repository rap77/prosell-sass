# Build Instructions — Next.js / React version bump (apps/web)

## Instalación de dependencias

```bash
pnpm install
```

Desde la raíz del monorepo (ya ejecutado en Code Generation — regenera `pnpm-lock.yaml` con los nuevos rangos de `next`/`react`/`react-dom`/`@types/react`/`@types/react-dom`/`eslint-config-next`).

## Setup de entorno

Sin cambios respecto al setup existente del proyecto — este cambio no toca variables de entorno, archivos de config, ni servicios locales. `NEXT_PUBLIC_API_URL` (usado en los redirects OAuth) sigue funcionando igual.

## Comandos de build

```bash
pnpm --filter web run typecheck   # tsc --noEmit
pnpm --filter web run lint        # eslint . --max-warnings=0
```

No hay un comando de "build" de producción dedicado corrido en esta etapa (no aplica para verificar un bump de dependencias en desarrollo) — `typecheck` + `lint` son la verificación de build para este cambio.

## Verificación de build

- `pnpm --filter web run typecheck` debe terminar con exit code 0, sin output de errores.
- `pnpm --filter web run lint` debe terminar con exit code 0, `0 errors, 0 warnings`.

## Troubleshooting

- **`ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` en lint**: si aparecen warnings nuevos de `@next/next/*` no vistos antes, es probable que `eslint-config-next` haya sumado/endurecido una regla en la versión nueva — comparar contra el baseline pre-bump antes de asumir que es un bug del código tocado en este cambio (ver hallazgo documentado en `code-generation/code-summary.md`).
- **Errores de tipos tras el bump de `@types/react`**: revisar el CHANGELOG de `@types/react` para la línea 19.2.x — `pnpm --filter web run typecheck` ya confirmó 0 errores en este bump, pero si se reinstala en otro momento con una versión distinta de `@types/react` dentro del rango `^19.2.0`, puede aparecer drift.
