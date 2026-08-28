# Technology Stack — ProSell SaaS

## ⚠️ Corrección de drift documental — Tailwind CSS

El **`CLAUDE.md` raíz** documenta en su tabla de "Tech Stack 2026":

> | Styling | TailwindCSS | 4.0 |

**Esto es incorrecto.** La versión real, confirmada por lectura completa de `apps/web/package.json`, es:

> `tailwindcss: 3.4.17` (devDependency, pinned)

Este drift es plausiblemente la **causa raíz** del bug que originó el intent `260828-fix-invalid-tailwind-spa`: un agente o humano que confía en la tabla de `CLAUDE.md` puede asumir el motor de spacing de Tailwind 4 (que sí soporta valores arbitrarios más flexibles) y autor clases como `h-9.5`/`px-4.5` esperando que compilen — en Tailwind 3.4.17, sin extensión de `spacing` en `tailwind.config.ts` (confirmado, no está extendido), esas clases no existen en la escala y compilan a CSS vacío.

**Acción recomendada**: corregir la tabla de `CLAUDE.md` raíz como parte del bugfix o en un follow-up inmediato, para evitar que el mismo error se repita.

## Backend (`apps/api`)

| Categoría       | Tecnología           | Versión                            |
| --------------- | -------------------- | ---------------------------------- |
| Lenguaje        | Python               | 3.13                               |
| Framework web   | FastAPI              | 0.128.0                            |
| Validación/DTOs | Pydantic             | 2.12.5                             |
| ORM             | SQLAlchemy           | >=2.0.36 (async)                   |
| Migraciones     | Alembic              | 71 archivos de migración presentes |
| Driver DB       | asyncpg              | —                                  |
| Cache/colas     | Redis                | —                                  |
| Colas de tareas | Taskiq (+redis)      | —                                  |
| Scraping        | Playwright           | async                              |
| Pagos           | Stripe               | —                                  |
| IA              | Anthropic SDK        | —                                  |
| Auth            | PyJWT, pyotp, bcrypt | JWT + OAuth2 + 2FA (TOTP)          |
| Storage         | boto3                | —                                  |

## Frontend (`apps/web`)

| Categoría            | Tecnología       | Versión                                                    |
| -------------------- | ---------------- | ---------------------------------------------------------- |
| Framework            | Next.js          | ^16.1.0                                                    |
| UI                   | React            | ^19.2.0                                                    |
| Lenguaje             | TypeScript       | strict (versión exacta no releída este pase)               |
| **Styling**          | **TailwindCSS**  | **3.4.17 (real) — NO 4.0 como dice CLAUDE.md raíz**        |
| Estado               | Zustand          | ^5.0.11                                                    |
| Data fetching        | TanStack Query   | ^5.0.0                                                     |
| Tablas               | TanStack Table   | ^8.21.3                                                    |
| Listas virtualizadas | TanStack Virtual | —                                                          |
| Formularios          | React Hook Form  | ^7 (+ resolvers)                                           |
| Validación           | Zod              | ^4.4.0 instalado — código en estilo Zod 3 (ver nota abajo) |
| i18n                 | next-intl        | —                                                          |
| Calidad de código    | react-doctor     | ^0.9.12 (pre-commit + CI + Turbo)                          |

### Nota — estado dual Zod 3/4

`AGENTS.md` instruye "usar Zod 3, NO Zod 4, hasta resolver issue #74", pero `apps/web/package.json` ya tiene `zod: ^4.4.0` instalado. El código real sigue en estilo Zod 3 (41× `.passthrough()`, 4× `z.nativeEnum()` en `leads.ts`, cero usos legítimos de `z.looseObject()`/`z.enum()`-sobre-enum de Zod 4). Migración completa trackeada por separado en el intent `260828-zod-3-to-4-migration` — **fuera de alcance de este documento y de este intent**; no colar fixes parciales de Zod 4 hasta que ese intent corra (regla de memoria del proyecto).

### Duplicación de pines en el workspace

El `package.json` raíz pinea independientemente `zod: ^4`, `@dnd-kit/*`, `@hookform/resolvers` — duplicado con los pines propios de `apps/web/package.json`. Señal de dependencia duplicada, no investigada a fondo en este pase (ver `code-quality-assessment.md`).

## Infraestructura / plataforma

| Categoría      | Tecnología                  | Versión                                                                                 |
| -------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| Base de datos  | PostgreSQL                  | 17                                                                                      |
| Cache          | Redis                       | 7.4+                                                                                    |
| Build monorepo | pnpm workspaces + Turborepo | `packageManager: pnpm@9.15.1`                                                           |
| Build backend  | uv + hatchling              | —                                                                                       |
| Contenedores   | Docker                      | `docker/` (api.Dockerfile, web.Dockerfile, docker-compose.yml + variantes staging/prod) |
| CI/CD          | GitHub Actions              | 7 workflows                                                                             |

## Testing

| Capa                     | Framework(s)                         |
| ------------------------ | ------------------------------------ |
| Backend unit/integration | pytest + pytest-asyncio + pytest-cov |
| Frontend unit/componente | Vitest + Testing Library + jsdom     |
| E2E                      | Playwright                           |

## Herramientas de calidad de código

- **Ruff** (`select = [E,W,F,I,N,UP,B,C4,SIM,ARG,PTH,RUF]`) + **Pyright** — Python, forzados en pre-commit y pre-push.
- **ESLint** flat config, `--max-warnings=0` — pero el hook `next-lint` está **comentado/deshabilitado** en `.pre-commit-config.yaml` (`lint-staged` cubre parcialmente solo archivos staged).
- **react-doctor** — advisory-only en CI, bloqueante en pre-commit (instalado en el intent previo `260827-react-doctor-cleanup`).
- **GGA** (AI code review) — bloqueante en pre-commit, contra reglas de `AGENTS.md`.
- **`scripts/validate-tailwind.sh`** — grep de `var(--ps-*)` dentro de `className`; **no valida** la existencia de una clase de utilidad de spacing en la escala configurada — confirmado por lectura completa del script, es la razón estructural por la que el bug de este intent no fue atrapado por ningún linter existente.
