# Technology Stack — ProSell SaaS

## ⚠️ Estado del drift documental — Tailwind CSS (parcialmente remediado)

- **`CLAUDE.md` raíz, tabla "Tech Stack 2026" (línea ~72)**: **ya corregida** en el intent `260828-fix-invalid-tailwind-spa` — hoy dice `TailwindCSS | 3.4.17`.
- **`AGENTS.md` (línea 14)**: ya correcta — "TailwindCSS 3.4.17".
- **`CLAUDE.md` raíz, sección "Key Conventions" (línea ~194)**: **sigue sin corregir** — todavía dice "TailwindCSS 4: New engine, no `var()` en className", contradiciendo la versión real instalada. Quedó fuera del alcance aprobado del intent que corrigió la tabla de arriba (esa corrección solo cubría la tabla de Tech Stack). Corregir en el próximo intent que toque `CLAUDE.md`.
- **`apps/web/src/app/globals.css`**: el comentario de encabezado dice "This file includes Tailwind CSS 4.0 directives", pero las directivas reales debajo (`@tailwind base/components/utilities`) son sintaxis de Tailwind **v3** — Tailwind 4 usa `@import "tailwindcss"`. Comentario stale, no corregido.
- **`.pre-commit-config.yaml`** (hook id `validate-tailwind`) y `scripts/validate-tailwind.sh` (comentario interno): etiquetados como "Tailwind 4 enforcement" — el chequeo real (bloquear `var(--ps-*)` en `className`) es funcionalmente agnóstico de versión y sigue funcionando correctamente pese al nombre — drift cosmético, no funcional.

**Versión real confirmada** (`apps/web/package.json`, devDependency, pin exacto): `tailwindcss: 3.4.17` — **NO** un caret range, **NO** Tailwind 4.

## Backend (`apps/api`)

| Categoría           | Tecnología                                                       | Versión (pin exacto de `pyproject.toml`)                                           |
| ------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Lenguaje            | Python                                                           | `>=3.12` requerido; `.python-version` pinea `3.13`; ruff/pyright targetean `py313` |
| Framework web       | FastAPI                                                          | `==0.128.0` (con extras `[standard]`)                                              |
| Validación/DTOs     | Pydantic                                                         | `==2.12.5`                                                                         |
| ORM                 | SQLAlchemy                                                       | `>=2.0.36` `[asyncio]`                                                             |
| Migraciones         | Alembic                                                          | `>=1.14.0`                                                                         |
| Driver DB           | asyncpg + psycopg2-binary                                        | `>=0.30.0` / `>=2.9.11` (async **y** sync, ambos presentes)                        |
| Cache/colas         | Redis                                                            | `>=5.2.0`                                                                          |
| Colas de tareas     | taskiq `[redis]` + taskiq-redis                                  | `>=0.12.1` / `>=1.2.2`                                                             |
| Scraping            | Playwright (Python)                                              | `>=1.42.0`                                                                         |
| Pagos               | Stripe                                                           | `>=11.0.0`                                                                         |
| IA                  | Anthropic SDK                                                    | `>=0.40.0`                                                                         |
| Imágenes            | Pillow                                                           | `>=12.0.0`                                                                         |
| Integración externa | facebook-sdk                                                     | `>=3.1.0`                                                                          |
| Auth                | pyotp, qrcode[pil], bcrypt, pyjwt, cryptography, passlib[bcrypt] | JWT + OAuth2 + 2FA (TOTP)                                                          |
| Storage             | boto3 + types-boto3                                              | `>=1.35.0`                                                                         |
| Rate limiting       | slowapi                                                          | —                                                                                  |
| Templates email     | jinja2                                                           | —                                                                                  |

**Dev/test backend**: pytest `>=8.3.0`, pytest-asyncio `>=0.24.0`, pytest-cov, ruff `>=0.8.0`, pyright `>=1.1.390`, pre-commit `>=4.0.0`, factory-boy, faker.

## Frontend (`apps/web`)

| Categoría                          | Tecnología                                                                                                | Versión (pin exacto de `package.json`)                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Framework                          | Next.js                                                                                                   | `^16.1.0`                                                                              |
| UI                                 | React / React DOM                                                                                         | `^19.2.0`                                                                              |
| **Styling**                        | **TailwindCSS**                                                                                           | **`3.4.17` (devDependency, pin exacto — NO 4.0 como aún dice `CLAUDE.md` línea ~194)** |
| PostCSS pipeline                   | postcss / autoprefixer                                                                                    | `^8.4.49` / `10.4.20`                                                                  |
| Estado                             | Zustand                                                                                                   | `^5.0.11`                                                                              |
| Data fetching                      | TanStack Query                                                                                            | `^5.0.0`                                                                               |
| Tablas                             | TanStack Table                                                                                            | `^8.21.3`                                                                              |
| Listas virtualizadas               | TanStack Virtual                                                                                          | `^3.13.23`                                                                             |
| Formularios                        | React Hook Form + @hookform/resolvers                                                                     | `^7.0.0` / `^5.4.0`                                                                    |
| Validación                         | Zod                                                                                                       | `^4.4.0` instalado — código en estilo Zod 3 (ver nota abajo)                           |
| UI primitives                      | Radix UI (dialog, dropdown, select, slider, alert-dialog, checkbox, label, separator, slot, switch, tabs) | `select` parcheado vía `patches/@radix-ui__react-select.patch`                         |
| i18n                               | next-intl                                                                                                 | `^4.13.1`                                                                              |
| Animación                          | framer-motion                                                                                             | `^12.38.0`                                                                             |
| Fechas                             | date-fns                                                                                                  | `^4.1.0`                                                                               |
| Calendario                         | FullCalendar (suite)                                                                                      | `^6.1.20`                                                                              |
| Utilidades UI                      | class-variance-authority, clsx, tailwind-merge, sonner                                                    | —                                                                                      |
| Archivos                           | jszip, csv-parse, react-dropzone, browser-image-compression                                               | —                                                                                      |
| React Compiler                     | babel-plugin-react-compiler                                                                               | `^1.0.0` — habilitado (sin `useMemo`/`useCallback` manuales)                           |
| Lenguaje                           | TypeScript                                                                                                | `^5.5.0`                                                                               |
| Linting                            | ESLint + eslint-config-next + typescript-eslint                                                           | `^9.39.2` / `^16.1.0` / `^8.55.0` — `--max-warnings=0`                                 |
| Formato                            | Prettier                                                                                                  | `^3.4.0`                                                                               |
| Testing unit/componente            | Vitest + @vitest/coverage-v8 + Testing Library + jsdom                                                    | `^2.1.0` / — / `^16.1.0` / `^25.0.0`                                                   |
| Testing E2E (dentro de `apps/web`) | Playwright                                                                                                | `^1.58.2` (devDependency propio, además de `tests/e2e`)                                |
| Calidad de código React            | react-doctor                                                                                              | `^0.9.12` (pre-commit + CI + Turbo)                                                    |

### Nota — estado dual Zod 3/4

`AGENTS.md` instruye "usar Zod 3, NO Zod 4, hasta resolver issue #74", pero `apps/web/package.json` (y el `package.json` raíz) ya tienen `zod: ^4.4.0` instalado. El código real sigue en estilo Zod 3 (41+ `.passthrough()`, `z.nativeEnum()` en `leads.ts`, cero usos legítimos de `z.looseObject()`/`z.enum()`-sobre-enum de Zod 4). Migración completa trackeada por separado en el intent `260828-zod-3-to-4-migration` — **fuera de alcance de este documento y de este intent**; no colar fixes parciales de Zod 4 hasta que ese intent corra (regla de memoria del proyecto).

## `tests/e2e` — paquete standalone

Miembro de workspace pnpm independiente (`@prosell/e2e`, `package.json` propio) — Playwright `^1.59.1` / `@playwright/test` (versión exacta de `tests/e2e/package.json`, distinta del Playwright `^1.58.2` que `apps/web` instala como devDependency propia).

## Infraestructura / plataforma

| Categoría      | Tecnología                  | Versión                                                                                 |
| -------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| Base de datos  | PostgreSQL                  | 17                                                                                      |
| Cache          | Redis                       | 7.4+                                                                                    |
| Build monorepo | pnpm workspaces + Turborepo | `packageManager: pnpm@9.15.1`, patch aplicado a `@radix-ui/react-select` vía `patches/` |
| Build backend  | uv + hatchling              | —                                                                                       |
| Node engine    | Node                        | 22 (pinned en `.nvmrc`)                                                                 |
| Contenedores   | Docker                      | `docker/` — 13 servicios en `docker-compose.yml`                                        |
| CI/CD          | GitHub Actions              | 7 workflows                                                                             |

## Testing

| Capa                     | Framework(s)                                                     |
| ------------------------ | ---------------------------------------------------------------- |
| Backend unit/integration | pytest + pytest-asyncio + pytest-cov                             |
| Frontend unit/componente | Vitest + Testing Library + jsdom                                 |
| E2E                      | Playwright (`tests/e2e`, más devDependency propia en `apps/web`) |

## Herramientas de calidad de código

- **Ruff** (extenso `[tool.ruff]` con lista de per-file-ignores marcada `# TODO: Fix these pre-existing issues`) + **Pyright** — Python, forzados en pre-commit y pre-push. **Divergencia de estrictez**: `apps/api/pyproject.toml` declara `standard` (la config real usada por CI/pre-commit); el `pyproject.toml` raíz declara `strict` — dos niveles distintos según qué archivo se consulte.
- **ESLint** flat config, `--max-warnings=0` — pero el hook `next-lint` está **comentado/deshabilitado** en `.pre-commit-config.yaml` ("TODO: currently disabled due to next lint issues"); `lint-staged` cubre solo archivos staged como sustituto parcial. CI sí corre ESLint por separado.
- **react-doctor** — bloqueante en pre-commit (`--staged --blocking warning`), advisory-only en `.github/workflows/react-doctor.yml`.
- **GGA** (AI code review, proveedor `codex`, `STRICT_MODE=true`) — bloqueante en pre-commit, primero en el orden de hooks, contra reglas de `AGENTS.md`.
- **`scripts/validate-tailwind.sh`** — grep de `var(--ps-*)` dentro de `className`; **no valida** la existencia de una clase de utilidad de spacing en la escala configurada — confirmado por lectura del script, es la razón estructural por la que ni la familia `.5` (ya corregida) ni el residuo `.25`/`.75` (encontrado en este pase) fueron atrapados por ningún linter existente.
