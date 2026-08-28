# Dependencies — ProSell SaaS

## Dependencias internas entre paquetes del monorepo

**Ninguna.** `apps/web` y `apps/api` no comparten código en tiempo de compilación — se comunican exclusivamente por HTTP en runtime a través de la capa BFF (ver `architecture.md`). El directorio `packages/` que debería alojar código compartido (`packages/shared-types/`, según documenta `CLAUDE.md` raíz) **no existe** — confirmado por verificación directa de presencia de directorio.

Consecuencia práctica: la sincronización de contrato entre backend y frontend es **manual y convencional**, sostenida por la disciplina del patrón Zod-mirror (18 esquemas Zod en `apps/web/src/lib/api/schemas/` espejando DTOs Pydantic), no por un tipo compartido en build-time. Esto es una fuente de riesgo de drift silencioso entre ambos lados si el mirror no se actualiza al cambiar un DTO backend.

## Grafo de build (Turborepo)

Todas las tareas de Turbo (`build`, `lint`, `test`, `test:coverage`, `typecheck`, `test:e2e`) están declaradas con `dependsOn: ["^build"]` / `["build"]`, pero como no hay dependencias cruzadas reales entre `apps/*` (sin `packages/*` poblado), `apps/web` y `apps/api` **construyen de forma totalmente independiente** — el grafo de Turbo es topológicamente trivial hoy.

## Dependencias externas — backend (`apps/api`)

| Dependencia                 | Propósito                                                    |
| --------------------------- | ------------------------------------------------------------ |
| FastAPI 0.128.0             | framework web                                                |
| Pydantic 2.12.5             | validación/DTOs                                              |
| SQLAlchemy >=2.0.36 (async) | ORM                                                          |
| Alembic                     | migraciones (71 archivos)                                    |
| asyncpg                     | driver PostgreSQL async                                      |
| Redis                       | cache + backend de colas                                     |
| Taskiq (+redis)             | tareas asíncronas                                            |
| Playwright                  | scraping (Facebook Marketplace)                              |
| Stripe                      | pagos/wallet                                                 |
| Anthropic SDK               | funcionalidad IA (alcance exacto no verificado en este pase) |
| PyJWT, pyotp, bcrypt        | auth (JWT, 2FA TOTP, hashing)                                |
| boto3                       | storage (S3-compatible)                                      |

## Dependencias externas — frontend (`apps/web`)

| Dependencia                                 | Propósito                                                    |
| ------------------------------------------- | ------------------------------------------------------------ |
| Next.js ^16.1.0                             | framework/App Router                                         |
| React ^19.2.0                               | UI, Server Components                                        |
| TailwindCSS 3.4.17                          | estilos (ver corrección de versión en `technology-stack.md`) |
| Zustand ^5.0.11                             | estado cliente                                               |
| TanStack Query ^5.0.0                       | data fetching/cache                                          |
| TanStack Table ^8.21.3                      | tablas                                                       |
| TanStack Virtual                            | listas virtualizadas                                         |
| React Hook Form ^7 + resolvers              | formularios                                                  |
| Zod ^4.4.0 (instalado, código en estilo v3) | validación runtime                                           |
| next-intl                                   | i18n                                                         |
| react-doctor ^0.9.12                        | calidad de código React (dev)                                |

## Dependencias externas — plataforma/infra

- **PostgreSQL 17** — base de datos primaria.
- **Redis 7.4+** — cache + cola de tareas.
- **Docker** — `docker/api.Dockerfile`, `docker/web.Dockerfile`, `docker/docker-compose.yml` (+ variantes staging/prod referenciadas en memoria del proyecto: `docker-compose.staging.yml`, `docker-compose.prod.yml`).
- **GitHub Actions** — 7 workflows (`ci.yml`, `e2e.yml`, `deploy.yml`, `react-doctor.yml`, `graphify.yml`, `promote-prod.yml`, `recover-prod.yml`).
- **Facebook Marketplace** — fuente de datos externa scrapeada vía Playwright (dependencia funcional, no de paquete).

## Duplicación de pines observada (workspace vs. app)

El `package.json` raíz pinea independientemente `zod: ^4`, `@dnd-kit/*`, `@hookform/resolvers`, duplicando pines que `apps/web/package.json` ya declara. No se investigó en este pase si esto es intencional (p. ej. para herramientas a nivel raíz) o deuda de mantenimiento — señal reportada en `code-quality-assessment.md`, no resuelta aquí.

## Riesgo de deuda relacionado a dependencias

Ver `code-quality-assessment.md` § Technical Debt Signal #5 (estado dual Zod 3/4) para el detalle del riesgo de incompatibilidad entre la versión instalada y el estilo de código real.
