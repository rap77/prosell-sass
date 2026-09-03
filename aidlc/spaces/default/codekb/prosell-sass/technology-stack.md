# Technology Stack — ProSell SaaS

## Backend (`apps/api`)

| Categoría           | Tecnología        | Versión (pinned)                                                  |
| ------------------- | ----------------- | ----------------------------------------------------------------- |
| Lenguaje            | Python            | `>=3.12` (ruff target `py313`)                                    |
| Framework web       | FastAPI           | `[standard]==0.128.0`                                             |
| Validación/DTOs     | Pydantic          | `==2.12.5`                                                        |
| Settings            | pydantic-settings | `>=2.7.0`                                                         |
| ORM                 | SQLAlchemy        | `[asyncio]>=2.0.36`                                               |
| Driver DB           | asyncpg           | `>=0.30.0`                                                        |
| Migraciones         | Alembic           | `>=1.14.0` (71 versions)                                          |
| Cache/colas         | Redis (cliente)   | `>=5.2.0`                                                         |
| Colas de tareas     | taskiq            | `[redis]>=0.12.1`                                                 |
| Colas de tareas     | taskiq-redis      | `>=1.2.2`                                                         |
| Automatización nav. | Playwright        | `>=1.42.0`                                                        |
| Auth password       | passlib           | `[bcrypt]>=1.7.4`                                                 |
| Auth password       | bcrypt            | `>=4.2.0`                                                         |
| Auth JWT            | pyjwt             | `>=2.9.0`                                                         |
| Auth 2FA/TOTP       | pyotp             | `>=2.9.0`                                                         |
| Auth 2FA/QR         | qrcode            | `[pil]>=8.0`                                                      |
| Crypto              | cryptography      | `>=43.0.0`                                                        |
| Rate limiting       | slowapi           | `>=0.1.9`                                                         |
| Storage             | boto3             | `>=1.35.0`                                                        |
| Storage (tipos)     | types-boto3       | `>=1.0.0`                                                         |
| Imágenes            | Pillow            | `>=12.0.0`                                                        |
| Facebook            | facebook-sdk      | `>=3.1.0`                                                         |
| Pagos (declarado)   | stripe            | `>=11.0.0` — **sin uso en código fuente** (ver `dependencies.md`) |
| IA (declarado)      | anthropic         | `>=0.40.0` — **sin uso en código fuente** (ver `dependencies.md`) |
| Multipart           | python-multipart  | `>=0.0.18`                                                        |
| HTTP client         | httpx             | `>=0.28.0`                                                        |
| Templates           | jinja2            | `>=3.1.0`                                                         |
| DB driver (sync)    | psycopg2-binary   | `>=2.9.11`                                                        |
| Testing             | pytest            | `>=8.3.0`                                                         |
| Testing async       | pytest-asyncio    | `>=0.24.0`                                                        |
| Coverage            | pytest-cov        | `>=6.0.0`                                                         |
| Lint                | ruff              | `>=0.8.0` (pre-commit pin `v0.14.14`)                             |
| Type check          | pyright           | `>=1.1.390`                                                       |
| Hooks               | pre-commit        | `>=4.0.0`                                                         |
| Test data           | factory-boy       | `>=3.3.0`                                                         |
| Test data           | faker             | `>=30.0.0`                                                        |
| Build backend       | hatchling         | (vía `[build-system]`)                                            |
| DB                  | PostgreSQL        | 17                                                                |
| Cache/broker        | Redis             | 7.4+                                                              |

## Frontend (`apps/web`)

| Categoría                     | Tecnología                                     | Versión (pinned)                                                                                                                            |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                     | Next.js                                        | `^16.3.3` (Turbopack, App Router)                                                                                                           |
| UI library                    | React / react-dom                              | `^19.2.8`                                                                                                                                   |
| Lenguaje                      | TypeScript                                     | `^5.5.0` (strict)                                                                                                                           |
| Estilos                       | TailwindCSS                                    | **`3.4.17`** (exacto, NO v4 — pese al drift en `CLAUDE.md`)                                                                                 |
| Estado global                 | Zustand                                        | `^5.0.11`                                                                                                                                   |
| Data fetching                 | TanStack Query                                 | `^5.0.0`                                                                                                                                    |
| Tablas                        | TanStack Table                                 | `^8.21.3`                                                                                                                                   |
| Virtualización                | TanStack Virtual                               | `^3.13.23`                                                                                                                                  |
| Formularios                   | React Hook Form                                | `^7.0.0`                                                                                                                                    |
| Resolvers de formulario       | @hookform/resolvers                            | `^5.4.0`                                                                                                                                    |
| Validación de esquema         | Zod                                            | `^4.4.0` instalado — **código en estilo Zod 3** (`.passthrough()`, `z.nativeEnum()`); migración pendiente, ver `code-quality-assessment.md` |
| Calendario                    | @fullcalendar/*                                | `^6.1.20` (core, daygrid, interaction, list, react, timegrid)                                                                               |
| Drag & drop                   | @dnd-kit/*                                     | `^6.3.1` / `^10.0.0` / `^3.2.2`                                                                                                             |
| Componentes primitivos        | @radix-ui/react-*                              | `^1.x`/`^2.x` (dialog, dropdown-menu, select, slider, alert-dialog, checkbox, label, separator, slot, switch, tabs)                         |
| Animación                     | framer-motion                                  | `^12.38.0`                                                                                                                                  |
| Notificaciones                | sonner                                         | `^2.0.7`                                                                                                                                    |
| Iconos                        | lucide-react                                   | `^0.400.0`                                                                                                                                  |
| Fechas                        | date-fns                                       | `^4.1.0`                                                                                                                                    |
| CSV                           | csv-parse                                      | `^6.2.1`                                                                                                                                    |
| Compresión de imágenes        | browser-image-compression                      | `^2.0.2`                                                                                                                                    |
| Zip                           | jszip                                          | `^3.10.1`                                                                                                                                   |
| Dropzone                      | react-dropzone                                 | `^15.0.0`                                                                                                                                   |
| Command palette               | cmdk                                           | `^1.1.1`                                                                                                                                    |
| Utilidades de clases          | clsx, class-variance-authority, tailwind-merge | `^2.0.0` / `^0.7.0` / `^2.0.0`                                                                                                              |
| i18n                          | next-intl                                      | `^4.13.1`                                                                                                                                   |
| Testing unit/component        | Vitest                                         | `^2.1.0`                                                                                                                                    |
| Testing library               | @testing-library/{react,dom,jest-dom}          | `^16.1.0` / `^10.4.0` / `^6.6.0`                                                                                                            |
| Testing E2E (frontend dev)    | @playwright/test                               | `^1.49.0`                                                                                                                                   |
| Testing E2E (tests/e2e)       | playwright                                     | `^1.58.2`                                                                                                                                   |
| Lint                          | ESLint (flat config)                           | `^9.39.2`                                                                                                                                   |
| Lint config Next              | eslint-config-next                             | `^16.3.3`                                                                                                                                   |
| Lint hooks/compiler           | eslint-plugin-react-hooks                      | `^7.0.1`                                                                                                                                    |
| React Compiler                | babel-plugin-react-compiler                    | `^1.0.0`                                                                                                                                    |
| Format                        | Prettier                                       | `^3.4.0`                                                                                                                                    |
| DOM headless (tests)          | jsdom                                          | `^25.0.0`                                                                                                                                   |
| Imágenes (build)              | sharp                                          | `^0.35.1`                                                                                                                                   |
| CSS pipeline                  | postcss / autoprefixer                         | `^8.4.49` / `10.4.20`                                                                                                                       |
| Auditoría de calidad frontend | react-doctor                                   | (via `npx react-doctor@latest`)                                                                                                             |

**Nota sobre gestión de estado en el área Auth**: `authStore.ts` usa Zustand con `persist`, no TanStack Query — el área de navegación auth es una excepción deliberada al patrón general de data-fetching del resto de la app.

## Herramientas de build / monorepo

- **Turborepo** + **pnpm workspaces** (frontend/tooling): `pnpm-workspace.yaml` declara `apps/*` y `packages/*` — este último es un glob muerto (`packages/` no existe físicamente).
- **uv** + **hatchling** (backend Python): `apps/api/pyproject.toml`, target Python `>=3.12`.
- Sin dependencia de build cruzada entre `apps/web` y `apps/api` — comunicación exclusivamente HTTP en runtime.

## CI/CD

- `.github/workflows/ci.yml` — 7 jobs: `lint-python`, `test-python`, `lint-node`, `test-node`, `validate-specs`, `validate-code-standards`, `build`.
- `.github/workflows/deploy.yml` — deploy a staging vía `workflow_run` post-CI exitoso en `main` (+ `workflow_dispatch` manual).
- `.github/workflows/promote-prod.yml` — `workflow_dispatch`-only, confirmación de texto exacto `"deploy"`.
- `.github/workflows/recover-prod.yml` — recovery de emergencia (reinicio de contenedores sin rebuild).
- `.github/workflows/react-doctor.yml` — advisory-only, no bloquea merge.
- `.github/workflows/e2e.yml`, `.github/workflows/graphify.yml`.
- `.github/dependabot.yml` — cobertura exclusiva del ecosistema `github-actions` (sin CVE scanning de dependencias npm/Python reales de la app).

## Confirmación de vigencia — scan enfocado `260831-invalid-tailwind-classes`

El scan enfocado de este intent (foco `apps/web/tailwind.config.ts`, `apps/web/tests/unit/config/tailwind.config.test.ts`, y el bloque de dependencia `tailwindcss` de `apps/web/package.json`) confirma directamente: **`tailwindcss: 3.4.17` exacto** (Tailwind 3, no 4 — el drift sigue siendo puramente de `CLAUDE.md`, no del manifiesto real), y que `theme.extend.spacing` en `tailwind.config.ts` extiende exactamente `"4.5"`, `"8.5"`, `"9.5"` (introducidos por el commit `624819e3`, ya en `main` antes de este intent) — sin cobertura para pasos `.25`/`.75`. Ver `code-quality-assessment.md` § "Actualización del scan enfocado `260831-invalid-tailwind-classes`" y `component-inventory.md` para el detalle de qué archivos siguen afectados.

## Confirmación de vigencia — scan enfocado `260830-ci-fixes-round2`

El scan enfocado de este intent (foco batch review, bulk upload, appointments, fb-sync) no encontró cambios de versión respecto al pase anterior — pytest, pytest-asyncio, httpx (`AsyncClient` + `ASGITransport`), FastAPI, SQLAlchemy 2.0 async y Pydantic 2.x siguen siendo las mismas versiones documentadas arriba. Se confirma además el patrón recurrente `sqlalchemy.event.listens_for(..., "after_transaction_end")` para los fixtures `shared_session`/`override_session` (`test_fb_sync_router.py`, `bulk_upload/conftest.py`).

## Confirmación de vigencia — scan enfocado `260828-useeffect-to-react-query`

El scan enfocado de este intent (foco `onboarding/page.tsx`, `invite/[token]/page.tsx`, y sus dependencias de cliente API) confirma directamente contra `apps/web/package.json`, sin cambios de versión respecto a lo ya documentado: `@tanstack/react-query: ^5.0.0`, `zod: ^4.4.0` (código sigue en estilo Zod 3, ver `dependencies.md`), `next: ^16.3.3`, `react: ^19.2.8`, `vitest: ^2.1.0`, `@testing-library/react: ^16.1.0`. No introduce ninguna dependencia nueva — la migración objetivo usa el provider de React Query ya wireado (`ReactQueryProvider.tsx`) y el patrón `sonner`/`lucide-react` ya presente en ambas páginas.

## Confirmación de vigencia — scan enfocado `260901-frontend-test-debt`

El scan enfocado de este intent (foco `apps/web/src/lib/api/products.ts`, `products.test.tsx`, `reverseTransitions.test.tsx`) no encontró cambios de versión respecto al pase anterior: Vitest `^2.1.0`, `@testing-library/react` `^16.1.0`, Zod `^4.4.0` instalado (código sigue en estilo Zod 3, sin cambio respecto a lo ya documentado). No introduce ninguna dependencia nueva — es backfill de fixtures de test existentes, sin tocar configuración de build ni de testing.

## Confirmación de vigencia — scan enfocado `260902-teamapi-create-param`

El scan enfocado de este intent (foco `teamApi.ts`, `team_router.py`, DTOs de `team`, rutas BFF de `teams`, `next.config.ts`) no encontró cambios de versión respecto al pase anterior: Pydantic `2.12.5`, Zod `^4.4.0` instalado (código sigue en estilo Zod 3, sin cambio), FastAPI `[standard]==0.128.0`, Next.js `^16.3.3`. No introduce ninguna dependencia nueva — el hallazgo es puramente de nombre de campo en DTOs/schemas ya existentes, y de configuración de rewrite (`next.config.ts`) ya presente. Confirma además el patrón de "Mock API Route" (comentario in-line declarado en el propio archivo) como convención existente en `apps/web/src/app/api/v1/teams/route.ts` y sus dos rutas hermanas.

## Drift de documentación conocido

`CLAUDE.md` (raíz) declara "TailwindCSS 4" en la tabla de stack y en "Key Conventions" (línea ~194) — el proyecto real fija `tailwindcss: 3.4.17` (Tailwind 3, no 4). Corregido parcialmente en la tabla de stack por el intent `260828-fix-invalid-tailwind-spa`; la línea de "Key Conventions" sigue sin corregir.
