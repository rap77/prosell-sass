# Technology Stack — prosell-sass

## Backend (apps/api)

| Tecnología                                                 | Versión                                     | Propósito                                                                   | Fuente                                                         |
| ---------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Python                                                     | `requires-python >= 3.12` (pyproject.toml)  | Lenguaje                                                                    | `apps/api/pyproject.toml`                                      |
| FastAPI                                                    | `0.128.0` (pin exacto, `fastapi[standard]`) | Framework web/REST                                                          | `pyproject.toml`                                               |
| Pydantic                                                   | `2.12.5` (pin exacto)                       | Validación/DTOs                                                             | `pyproject.toml`                                               |
| SQLAlchemy                                                 | `>=2.0.36` (async, asyncpg)                 | ORM                                                                         | `pyproject.toml`                                               |
| Alembic                                                    | `>=1.14.0`                                  | Migraciones (71 archivos en `alembic/versions/`)                            | `pyproject.toml`                                               |
| PostgreSQL                                                 | 17                                          | Base de datos                                                               | `CLAUDE.md` (no verificado en este pase contra docker-compose) |
| Redis                                                      | 7.4+ (declarado)                            | Cache/colas                                                                 | `CLAUDE.md` (no verificado en este pase)                       |
| boto3                                                      | (no pinneado en este pase)                  | Cliente S3/Spaces                                                           | `pyproject.toml` (extras)                                      |
| stripe                                                     | (no pinneado en este pase)                  | Pagos                                                                       | `pyproject.toml` (extras)                                      |
| anthropic                                                  | (no pinneado en este pase)                  | ¿Integración LLM? — no investigado su uso                                   | `pyproject.toml` (extras)                                      |
| pyotp + qrcode                                             | (no pinneado)                               | 2FA (TOTP)                                                                  | `pyproject.toml` (extras)                                      |
| taskiq[redis]                                              | (no pinneado)                               | Tareas asíncronas                                                           | `pyproject.toml` (extras)                                      |
| playwright                                                 | (no pinneado)                               | Scraping/publicación server-side                                            | `pyproject.toml` (extras)                                      |
| facebook-sdk                                               | (no pinneado)                               | Integración Facebook Marketplace                                            | `pyproject.toml` (extras)                                      |
| Ruff                                                       | (config en pyproject)                       | Linter — reglas E/W/F/I/N/UP/B/C4/SIM/ARG/PTH/RUF, `target-version = py313` | `pyproject.toml`                                               |
| Pyright                                                    | modo `standard`, `py313`                    | Type checker                                                                | `pyproject.toml`                                               |
| pytest + pytest-asyncio (`asyncio_mode=auto`) + pytest-cov | —                                           | Testing                                                                     | `pytest.ini`                                                   |

**Nota de inconsistencia menor**: `pyproject.toml` fija `requires-python = ">=3.12"` (piso) mientras `CLAUDE.md` documenta "Python 3.13+ free-threading" (objetivo). No es un bug — es un piso de compatibilidad más laxo que el target — pero vale corregir la redacción de `CLAUDE.md` si el equipo quiere que ambos coincidan literalmente.

## Frontend (apps/web)

| Tecnología                           | Versión                          | Propósito                                                                        | Fuente                                                                                                                                                 |
| ------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Next.js                              | `^16.1.0`                        | Framework — App Router, Turbopack                                                | `package.json`                                                                                                                                         |
| React                                | `^19.2.0`                        | UI — Server Components por defecto                                               | `package.json`                                                                                                                                         |
| TypeScript                           | `^5.5.0`, strict                 | Lenguaje                                                                         | `package.json`                                                                                                                                         |
| TailwindCSS                          | **`3.4.17`**                     | Estilos                                                                          | `package.json` + confirmado por directivas `@tailwind base/components/utilities` en `globals.css` y presencia de `tailwind.config.ts` (JS config file) |
| next-intl                            | `^4.13.1`                        | i18n frontend — **parcialmente implementado** (ver `code-quality-assessment.md`) | `package.json`, `i18n/config.ts`, `i18n/request.ts`                                                                                                    |
| Zustand                              | `^5.0.11`                        | Estado global                                                                    | `package.json`                                                                                                                                         |
| TanStack Query                       | `^5.0.0`                         | Data fetching/cache                                                              | `package.json`                                                                                                                                         |
| TanStack Table                       | `^8.21.3`                        | Tablas (usado en `ReviewQueueTable.tsx`)                                         | `package.json`                                                                                                                                         |
| TanStack Virtual                     | `^3.13.23`                       | Virtualización de listas                                                         | `package.json`                                                                                                                                         |
| React Hook Form                      | `^7.0.0`                         | Formularios                                                                      | `package.json`                                                                                                                                         |
| Zod                                  | `^4.4.0`                         | Validación runtime, contratos espejo                                             | `package.json`                                                                                                                                         |
| @hookform/resolvers                  | —                                | Puente RHF + Zod                                                                 | `package.json`                                                                                                                                         |
| @dnd-kit/*                           | —                                | Drag-and-drop (`CategorySchemaEditor`, `ContactManager`)                         | `package.json`                                                                                                                                         |
| Vitest                               | `^2.1.0` + `@vitest/coverage-v8` | Testing unitario/componentes                                                     | `package.json`, `vitest.config.ts`                                                                                                                     |
| Testing Library + jsdom              | —                                | Testing de componentes                                                           | `package.json`                                                                                                                                         |
| Playwright                           | `^1.58.2`                        | E2E                                                                              | `package.json`                                                                                                                                         |
| ESLint (`max-warnings=0`) + Prettier | —                                | Lint/formato                                                                     | `eslint.config.js`, repo-wide                                                                                                                          |
| react-doctor                         | `^0.9.12`                        | Análisis estático de React (lint arquitectónico, a11y, performance, deslop)      | root `package.json` (devDependency, agregado esta sesión), `.pre-commit-config.yaml`, `.github/workflows/react-doctor.yml`                             |
| babel-plugin-react-compiler          | `^1.0.0`                         | Habilita el React Compiler (auto-memoización)                                    | `apps/web/package.json`, `next.config.ts` (`reactCompiler: true`, confirmado en vivo)                                                                  |
| eslint-plugin-react-hooks            | `^7.0.1`                         | Reglas de hooks conscientes del React Compiler                                   | provisto implícitamente vía `eslint-config-next` — no hay bloque explícito en `eslint.config.js` propio del proyecto                                   |

### ⚠️ Drift confirmado: TailwindCSS

`CLAUDE.md` (§ Tech Stack 2026) documenta **"TailwindCSS 4.0"**. El scan del desarrollador y la lectura directa de `apps/web/package.json` confirman **`3.4.17`** instalado, con evidencia estructural adicional: directivas `@tailwind base/components/utilities` en `globals.css` (estilo v3) y un `tailwind.config.ts` presente (Tailwind v4 usa `@import "tailwindcss"` sin archivo de configuración JS separado). `docs/AUDIT-UI-UX-I18N-2026-07-21.md` **también** afirma "Tailwind 4 configurado" — el drift está replicado en al menos dos documentos, no es un error puntual. Recomendación: o se corrige la documentación (es v3), o se planifica la migración real a v4 — cualquiera de las dos, pero no dejar la afirmación sin resolver.

## Zod — v4 instalado, backlog de API v3 sin migrar

`^4.4.0` está instalado (confirmado también en el pase anterior), pero **39 call sites** todavía usan la sintaxis de method-chaining deprecada de la era v3 (`.email()`, `.uuid()`, `.url()`, `.datetime()` en vez de los validadores top-level `z.email()`, `z.uuid()`, etc.). Confirmado en vivo en `lib/api/schemas/{bulkUpload,categorySchema,categoryInference,marketplace-access}.ts`, `lib/api/notificationsApi.ts`, `components/publisher/PublishForm.tsx` (muestra representativa; 39 es el conteo autoritativo de `react-doctor`). No se encontró ningún uso del accessor legacy `.error.errors`/`ZodError.errors` — el backlog se concentra exclusivamente en validadores de formato de string, no en la forma de manejo de errores. Hay además un segundo diagnóstico relacionado, `zod-v4-prefer-top-level-string-formats` (19 ocurrencias), sobre el mismo patrón de migración.

## Micro-app `apps/app`

- TypeScript/Next.js (inferido por convención del monorepo, no confirmado con `package.json` propio en este pase).
- Contenido confirmado: solo `privacy/page.tsx`.

## Build tooling

- **JS/TS**: pnpm workspaces + Turborepo. `packageManager: pnpm@9.15.1` (root `package.json`). `turbo.json` orquesta scripts fan-out.
- **Python**: uv + hatchling (`build-backend = "hatchling.build"` en `apps/api/pyproject.toml`).
- **Dependencia parcheada**: `patches/@radix-ui__react-select.patch`, aplicada vía `pnpm.patchedDependencies` — deuda de mantenimiento a rastrear en cada bump de esa librería.

## Infraestructura declarada (no verificada a fondo en este pase)

- Docker: 4 Dockerfiles + 3 variantes de `docker-compose` (dev/staging/prod) + Caddyfile — presencia confirmada, contenido no leído.
- CI/CD: 6 pipelines GitHub Actions — solo `ci.yml` fue parcialmente leído (jobs `lint-python`, `test-python`, inicio de `lint-node`; corre en `ubuntu-latest`, Python 3.13, Node 22, Postgres 17 como servicio de test).
