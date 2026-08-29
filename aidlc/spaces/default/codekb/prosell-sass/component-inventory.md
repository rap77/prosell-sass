# Component Inventory — ProSell SaaS

Nombres de componente en este documento son los que `reverse-engineering-timestamp.md` § Scope of Analysis referencia literalmente.

## prosell-api (FastAPI backend)

- **Responsabilidad**: lógica de negocio, orquestación de scraping/ML, persistencia, auth.
- **Dependencias**: PostgreSQL 17, Redis 7.4+, Playwright (scraping FB Marketplace), Stripe, Anthropic SDK, boto3 (storage), facebook-sdk.
- **Subcomponentes** (Clean Architecture):
  - `domain/` — entidades, value objects, eventos, puertos, servicios; zero deps externas.
  - `application/` — use cases y DTOs.
  - `infrastructure/` — 31 módulos de router (30 wireados en `main.py`), 4 archivos de middleware, repositorios SQLAlchemy 2.0 async, tareas Taskiq+Redis, webhooks, i18n, procesamiento de imágenes, integraciones, security.
- **Tests**: `apps/api/tests/{unit,integration,contract,stubs,utils}/` con subdivisión por dominio (ver `code-structure.md`), más `apps/api/conftest.py`.

## prosell-web (Next.js frontend)

- **Responsabilidad**: UI admin/vendedor SaaS + frontend de marketplace público.
- **Dependencias**: prosell-api (vía BFF proxy), ninguna dependencia de build-time de `packages/*` (no existe).
- **Subcomponentes**:
  - `app/` — App Router, incluyendo las 30 rutas BFF bajo `app/api/`.
  - `proxy.ts` — middleware de routing/auth-redirect.
  - `components/`, `lib/`, `stores/` (Zustand), `hooks/`, `domain/`, `i18n/`, `types/`.
- **Tests**: `apps/web/tests/{unit,components,app,__mocks__,utils}/` con subdivisión por dominio de feature (ver `code-structure.md`).

## BFF proxy routes

- **Responsabilidad**: intermediar entre navegador y `prosell-api`, centralizando cookies httpOnly y auth.
- **Ubicación**: `apps/web/src/app/api/{auth,v1}/**/route.ts`, 30 archivos.
- **Dependencias**: `prosell-api` (destino de reenvío).
- **Defecto activo (heredado, no re-verificado línea por línea este pase)**: `response.json()` sin chequeo de `content-type` en los proxies catch-all (`products`, `categories`, `organizations`, `vehicles`) — ver `api-documentation.md`.

## apps/app (orphan micro-app)

- **Responsabilidad**: desconocida/no wireada — contiene únicamente `privacy/page.tsx`, sin `package.json` propio.
- **Dependencias**: ninguna confirmada al grafo de build activo del workspace pnpm. Shadowed por la ruta real `apps/web/src/app/privacy/page.tsx`.
- **Estado**: candidato a deuda técnica (ver `code-quality-assessment.md`).

## tests/e2e (Playwright suite / @prosell/e2e workspace member)

- **Responsabilidad**: pruebas end-to-end del flujo completo (navegador real contra stack levantado).
- **Ubicación**: `tests/e2e/`, paquete pnpm independiente con `package.json` propio (`@prosell/e2e`), subcarpetas `specs/`, `pages/`, `fixtures/`, `factories/`, `helpers/`, `mocks/`, `layer2/` (internals no releídos en profundidad este pase).

---

## Inventario de bug — clases Tailwind inválidas (intent `260828-fix-invalid-tailwind-spa`)

### Estado de la familia `.5` (`h-9.5`, `px-4.5`, `h-8.5`) — YA CORREGIDA

`apps/web/tailwind.config.ts` (leído completo este pase) extiende hoy `theme.extend.spacing` con `"4.5"`, `"8.5"`, `"9.5"`, confirmado además por un test de regresión dedicado: `apps/web/tests/unit/config/tailwind.config.test.ts` asserta explícitamente la presencia de esos tres valores. Las 15 instancias remanentes de esas clases en el código son hoy **válidas** — no forman parte de la deuda activa.

### Residuo NO cubierto por ese fix — familia `.25`/`.75`, encontrado en este rescan

Barrido repo-wide de toda clase de utilidad de spacing fraccional (`h-`, `w-`, `p-`, `px-`, `py-`, `m-`, `gap-`, `top-`, etc. con sufijo `.25`/`.5`/`.75`) confirmó un **segundo grupo de clases inválidas** de paso de cuarto, distinto de la familia `.5` ya arreglada. Ni la escala default de Tailwind 3 ni la extensión ya presente en `tailwind.config.ts` cubren pasos de `.25`/`.75` — estas clases compilan a CSS vacío igual que la familia `.5` antes de su fix.

| Archivo                                                   | Clases inválidas encontradas                             |
| --------------------------------------------------------- | -------------------------------------------------------- |
| `apps/web/src/app/(seller)/publications/page.tsx`         | `gap-1.25` (×2), `mt-0.25`, `py-0.75`/`p-0.75`/`mb-0.75` |
| `apps/web/src/components/publisher/PublicationStatus.tsx` | `py-0.75`/`p-0.75`/`mb-0.75`                             |
| `apps/web/src/components/leads/LeadStatusBadge.tsx`       | `py-0.75`/`p-0.75`/`mb-0.75`                             |
| `apps/web/src/components/catalog/ProductImageGallery.tsx` | `py-0.75`/`p-0.75`/`mb-0.75`                             |

**Nota de precisión**: el scan de este pase identificó estos archivos y clases vía grep repo-wide (evidencia sólida de que las clases existen y son inválidas), pero **no releyó cada archivo línea por línea** para fijar número de línea exacto — a diferencia del inventario de la familia `.5` en el pase anterior, que sí tenía línea exacta. Un fix de este residuo debe re-abrir cada archivo para localizar la línea antes de aplicar el cambio.

**Contraste de control**: el conjunto mucho más grande de clases con sufijo `.5` puro (`gap-1.5`, `py-2.5`, `w-3.5`, `mt-0.5`, etc.) encontrado repo-wide **SÍ es válido** en la escala default de Tailwind 3 (half-steps 0.5–3.5) — no confundir con el residuo `.25`/`.75` de arriba.

### Fix ya aplicado como precedente (referencia, no parte de este intent)

Memoria del proyecto registra que `BulkUploadCSV.tsx` tenía el mismo patrón (`h-9.5`/`px-4.5`) y ya fue arreglado convirtiendo a valores arbitrarios explícitos: `h-[38px]`, `px-[18px]`. Ese archivo no aparece en ningún inventario de arriba porque ya está corregido.
