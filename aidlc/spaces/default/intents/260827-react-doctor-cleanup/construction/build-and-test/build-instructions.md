# Build Instructions — react-doctor cleanup

## Instalación de dependencias

```bash
cd /home/rpadron/proy/prosell-sass
pnpm install
```

Ya ejecutado en Code Generation (FR2.8, remoción de `swr` y
`@radix-ui/react-form`) — el lockfile ya está actualizado.

## Setup de entorno

No requiere variables de entorno nuevas ni servicios locales adicionales —
todos los cambios son refactors de código existente sobre el frontend
(`apps/web`), sin tocar configuración de build, contenedores ni backend.

## Comandos de build

```bash
cd apps/web
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint (max-warnings 0)
```

No se corre `pnpm build` completo — regla del proyecto ("Never build after
changes" / "No build smoke... Typecheck + lint es la verificación").

## Verificación de build

- `pnpm typecheck` debe salir sin errores.
- `pnpm lint` sobre los archivos tocados debe salir sin warnings.
- Ambos ya verificados por archivo durante Code Generation; este stage los
  re-corre de forma consolidada sobre el árbol completo (Step 10).

## Troubleshooting

- **cwd drift**: si un comando `bun .claude/tools/...` falla con "Module not
  found", confirmar que el cwd es la raíz del repo, no `apps/web` — problema
  ya documentado en `project.md`, puede dejar un directorio espurio
  `apps/web/aidlc/` (inofensivo, borrar si aparece).
- **rtk wrapper**: algunos comandos de shell (`find`, `grep`) pueden salir
  interceptados/reescritos por el wrapper `rtk` de la sesión — si el output
  se ve corrupto o vacío inesperadamente, repetir con la ruta absoluta o usar
  la herramienta dedicada (`Read`, `Grep`) en vez de Bash crudo.
