# Code Structure — prosell-sass

## Organización del monorepo

```
prosell-sass/
├── apps/
│   ├── api/                    # Backend FastAPI (Python 3.13, requires-python >=3.12)
│   │   ├── src/prosell/
│   │   │   ├── domain/         # Entidades, value objects, servicios de dominio, excepciones
│   │   │   ├── application/    # Use cases, DTOs, ports (interfaces de infraestructura)
│   │   │   └── infrastructure/ # FastAPI routers, SQLAlchemy, servicios externos, i18n
│   │   ├── tests/               # unit, integration, contract, utils — 270 archivos
│   │   ├── src/prosell/tests/   # unit — 8 archivos (ubicación inusual, dentro de src/)
│   │   └── pyproject.toml
│   │
│   ├── web/                    # Frontend Next.js 16 + React 19
│   │   ├── src/
│   │   │   ├── app/            # App Router — grupos: (admin), (seller), api, auth, branch,
│   │   │   │                   #   invite, manager, onboarding, p, privacy, profile, terms, vendedor
│   │   │   ├── components/     # 23 subdirectorios (forms, admin, review, catalog, public, ui, i18n, ...)
│   │   │   ├── lib/
│   │   │   │   ├── api/        # 30 módulos cliente API (por nombre; no todos leídos)
│   │   │   │   ├── api/schemas/# contratos Zod espejo de DTOs backend
│   │   │   │   ├── translations/ # vehicle-values.ts (dict hardcoded español)
│   │   │   │   └── utils/      # composeSubtitle.ts, etc.
│   │   │   ├── i18n/           # config.ts, request.ts (next-intl)
│   │   │   └── types/          # category.ts, etc.
│   │   ├── tests/              # unit, components, app, e2e, __mocks__, utils — 93 archivos
│   │   │   + 65 archivos *.test.tsx co-localizados bajo src/
│   │   └── package.json
│   │
│   └── app/                    # Micro-app mínima (contenido no confirmado más allá de privacy/)
│       └── privacy/page.tsx
│
├── packages/                   # Documentado en CLAUDE.md como futuro ("shared-types") —
│                                #   NO EXISTE en el árbol actual, confirmado por fd
│
├── tests/e2e/                  # Playwright — specs/, fixtures/ — 88 archivos
│
├── docker/                     # 3 compose (dev/staging/prod), 4 Dockerfiles, Caddyfile — 11 archivos
│
└── .github/workflows/          # ci.yml, deploy.yml, e2e.yml, graphify.yml,
                                 #   promote-prod.yml, recover-prod.yml — 6 pipelines
```

## Convención de capas (backend)

Regla de dependencia (`CLAUDE.md`): `Infrastructure → Application → Domain`. Confirmado en los archivos leídos a fondo:

- `domain/entities/category.py` — no importa nada de `infrastructure/` ni de `application/`.
- `domain/value_objects/organization_contact.py` — value object puro.
- `application/dto/category/response.py` — DTO que expone datos del dominio hacia infraestructura, sin depender de FastAPI/SQLAlchemy.
- `infrastructure/api/routers/*.py` — dependen de `application/` (use cases) y de `domain/` (tipos), nunca al revés.

## Convención de capas (frontend)

- **App Router** (`app/`) — orquesta layout y data fetching a nivel de página.
- **Componentes** (`components/`) — presentación, agrupados por dominio funcional (forms, admin, review, catalog, public) más una carpeta `ui/` de componentes shadcn/ui reutilizables.
- **lib/api/** — capa cliente API con contratos Zod "espejo" de cada endpoint backend (patrón confirmado en memoria de sesión: "every backend endpoint has a frontend Zod schema").
- **types/** — tipos TypeScript adicionales fuera de los schemas Zod (p. ej. `AttributeSchemaEntry` en `category.ts`) — este es precisamente el punto de fricción detrás de BUG-3/6: dos fuentes de verdad de tipo para el mismo concepto (`lib/api/schemas/categorySchema.ts` vs `types/category.ts`).

## Patrones de nomenclatura observados

- **Backend**: `snake_case` para archivos y funciones Python, `PascalCase` para clases/entidades — idiomático, sin regla de renombrado propia del proyecto.
- **Frontend**: `camelCase` para funciones/variables, `PascalCase` para componentes React, archivos de componente en `PascalCase.tsx` (`SchemaFieldRenderer.tsx`, `ContactManager.tsx`) y archivos de utilidad en `camelCase.ts` (`composeSubtitle.ts`).
- **Testing frontend — dos convenciones coexistiendo**: `tests/components/{module}/X.test.tsx` (no co-localizado, patrón más antiguo) y `page.test.tsx` co-localizado junto a la página (patrón más nuevo, usado en páginas admin T12-T18 según memoria de sesión previa). Ambos funcionan; no hay una migración forzada de uno a otro.

## Archivos/artefactos de tech-debt visibles en el árbol

- `apps/api/src/prosell/infrastructure/api/routers/auth_router.py.backup2` — archivo de respaldo suelto, no debería estar versionado.
- `patches/@radix-ui__react-select.patch` — parche aplicado a una dependencia de terceros vía `pnpm.patchedDependencies`; requiere seguimiento manual en cada actualización de esa librería.
- `apps/api/pyproject.toml` — bloque `ruff` `per-file-ignores` con un comentario `# TODO: Fix these pre-existing issues` nombrando 6 archivos con reglas suprimidas — backlog auto-documentado por el propio equipo.

## Áreas del árbol NO analizadas a fondo en este pase

(Ver detalle completo y honesto en `reverse-engineering-timestamp.md` § Scope of Analysis.) A nivel de directorio, quedaron solo enumeradas — no leídas — las siguientes áreas, por estar fuera del alcance de los 7 bugs + FEAT-1 de este intent:

- El grueso de `apps/api/src/prosell/{domain,application,infrastructure}/` fuera de los archivos puntuales listados arriba (~421 archivos Python totales en el subárbol).
- `apps/web/src/components/` fuera de las piezas de forms/review/admin/public/ui tocadas.
- `apps/web/src/app/` fuera de los tres archivos de página leídos — la estructura de grupos de rutas SÍ se enumeró.
- `apps/web/src/lib/api/` — 30 módulos enumerados por nombre, ninguno leído salvo `schemas/categorySchema.ts`.
- `apps/api/alembic/versions/` (71 migraciones), `apps/api/tests/` (270), `apps/api/src/prosell/tests/` (8), `apps/web/tests/` (93) + co-localizados (65), `tests/e2e/` (88).
- `.github/workflows/*.yml` (5 de 6 no abiertos), `docker/` (11 archivos, ninguno abierto).
- `docs/`, `PRPs/`, `Product-Definition/`, `prosell-design/`, `scripts/`, `tasks/`, `patches/`, `.archive/`, `aidlc/` — solo presencia de nivel superior confirmada.
