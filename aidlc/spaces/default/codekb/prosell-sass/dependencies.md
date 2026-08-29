# Dependencies — ProSell SaaS

## Dependencias internas entre paquetes del monorepo

**Ninguna en tiempo de compilación.** `apps/web` y `apps/api` no comparten código en build-time — se comunican exclusivamente por HTTP en runtime a través de la capa BFF (ver `architecture.md`). `pnpm-workspace.yaml` declara el glob `packages/*` para alojar código compartido, pero **el directorio `packages/` no existe físicamente** — confirmado por verificación directa. Es un glob de workspace muerto/sin cumplir.

Consecuencia práctica: la sincronización de contrato entre backend y frontend es **manual y convencional**, sostenida por la disciplina del patrón Zod-mirror (`apps/web/src/lib/api/schemas/` espejando DTOs Pydantic), no por un tipo compartido en build-time. Fuente de riesgo de drift silencioso entre ambos lados si el mirror no se actualiza al cambiar un DTO backend.

## Miembros reales del workspace pnpm

1. `@prosell/web` (`apps/web/`)
2. `prosell-api` (`apps/api/`) — vía `uv`/hatchling, no pnpm, pero parte del mismo repo lógico
3. `@prosell/e2e` (`tests/e2e/`) — miembro pnpm independiente, `package.json` propio
4. `packages/*` — declarado, **no existe**

`apps/app/` NO es miembro del workspace (sin `package.json`) — es el orphan documentado en `component-inventory.md`.

## Grafo de build (Turborepo)

Las tareas Turbo (`build`, `test`, `typecheck`, `lint`) declaran `dependsOn: ["^build"]` (build primero aguas arriba); `build` en sí depende de `^build`. Como no hay dependencias cruzadas reales entre `apps/*` (sin `packages/*` poblado), `apps/web` y `apps/api` **construyen de forma totalmente independiente** hoy — el grafo de Turbo está topológicamente cableado para un futuro con paquetes compartidos, pero es trivial en la práctica actual.

## Dependencias externas — backend (`apps/api`)

| Dependencia                                                      | Versión (pin)           | Propósito                                         |
| ---------------------------------------------------------------- | ----------------------- | ------------------------------------------------- |
| FastAPI                                                          | `==0.128.0`             | framework web                                     |
| Pydantic                                                         | `==2.12.5`              | validación/DTOs                                   |
| SQLAlchemy `[asyncio]`                                           | `>=2.0.36`              | ORM async                                         |
| Alembic                                                          | `>=1.14.0`              | migraciones                                       |
| asyncpg + psycopg2-binary                                        | `>=0.30.0` / `>=2.9.11` | driver PostgreSQL (async + sync, ambos presentes) |
| Redis                                                            | `>=5.2.0`               | cache + backend de colas                          |
| taskiq `[redis]` + taskiq-redis                                  | `>=0.12.1` / `>=1.2.2`  | tareas asíncronas                                 |
| Playwright (Python)                                              | `>=1.42.0`              | scraping (Facebook Marketplace)                   |
| Stripe                                                           | `>=11.0.0`              | pagos/wallet                                      |
| Anthropic SDK                                                    | `>=0.40.0`              | funcionalidad IA (alcance exacto no verificado)   |
| Pillow                                                           | `>=12.0.0`              | procesamiento de imágenes                         |
| facebook-sdk                                                     | `>=3.1.0`               | integración Facebook                              |
| pyotp, qrcode[pil], bcrypt, pyjwt, cryptography, passlib[bcrypt] | —                       | auth (JWT, 2FA TOTP, hashing)                     |
| boto3 + types-boto3                                              | `>=1.35.0`              | storage (S3-compatible)                           |
| slowapi                                                          | —                       | rate limiting                                     |
| jinja2                                                           | —                       | templates de email                                |

## Dependencias externas — frontend (`apps/web`)

| Dependencia                           | Versión (pin)         | Propósito                                                      |
| ------------------------------------- | --------------------- | -------------------------------------------------------------- |
| Next.js                               | `^16.1.0`             | framework/App Router                                           |
| React / React DOM                     | `^19.2.0`             | UI, Server Components                                          |
| TailwindCSS                           | `3.4.17`              | estilos (ver corrección de versión en `technology-stack.md`)   |
| postcss / autoprefixer                | `^8.4.49` / `10.4.20` | pipeline PostCSS                                               |
| Zustand                               | `^5.0.11`             | estado cliente                                                 |
| TanStack Query                        | `^5.0.0`              | data fetching/cache                                            |
| TanStack Table                        | `^8.21.3`             | tablas                                                         |
| TanStack Virtual                      | `^3.13.23`            | listas virtualizadas                                           |
| React Hook Form + @hookform/resolvers | `^7.0.0` / `^5.4.0`   | formularios                                                    |
| Zod (instalado, código en estilo v3)  | `^4.4.0`              | validación runtime                                             |
| Radix UI (varios primitives)          | —                     | componentes accesibles — `react-select` parcheado (`patches/`) |
| next-intl                             | `^4.13.1`             | i18n                                                           |
| framer-motion                         | `^12.38.0`            | animación                                                      |
| date-fns                              | `^4.1.0`              | fechas                                                         |
| FullCalendar (suite)                  | `^6.1.20`             | calendario de citas                                            |
| babel-plugin-react-compiler           | `^1.0.0`              | React Compiler (sin memo/callback manuales)                    |
| react-doctor                          | `^0.9.12`             | calidad de código React (dev)                                  |

## `tests/e2e` (`@prosell/e2e`) — dependencias propias

- Playwright / `@playwright/test` — versión propia en `tests/e2e/package.json` (`^1.59.1`), distinta del Playwright `^1.58.2` que `apps/web` instala aparte.

## Dependencias externas — plataforma/infra

- **PostgreSQL 17** — base de datos primaria.
- **Redis 7.4+** — cache + cola de tareas.
- **Docker** — `docker/` con 13 servicios declarados en `docker-compose.yml` (+ variantes staging/prod referenciadas en memoria del proyecto).
- **GitHub Actions** — 7 workflows (`ci.yml`, `e2e.yml`, `deploy.yml`, `react-doctor.yml`, `graphify.yml`, `promote-prod.yml`, `recover-prod.yml`).
- **Facebook Marketplace** — fuente de datos externa scrapeada vía Playwright (dependencia funcional, no de paquete).

## Dependencia parcheada

`patches/@radix-ui__react-select.patch` — aplicado vía pnpm patch a `@radix-ui/react-select`. Contenido/motivo del patch no releído en profundidad este pase.

## Riesgo de deuda relacionado a dependencias

Ver `code-quality-assessment.md` § Technical Debt Signals para el detalle del riesgo de incompatibilidad Zod 3/4 y otras señales.
