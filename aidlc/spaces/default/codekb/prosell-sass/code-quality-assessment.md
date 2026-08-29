# Code Quality Assessment — ProSell SaaS

## Test Coverage

| Área     | Directorios                                                                                                                                                                                                                                                                                | Frameworks                           | Config de cobertura                                                                                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | `apps/api/tests/{unit,integration,contract,stubs,utils}/` — `unit` → `api/application/domain/dto/infrastructure/scripts/services/test_entities`; `integration` → `api/bulk_upload/database/i18n/repositories/services/tasks/use_cases`; `contract` → `integration/openapi/schema_matching` | pytest + pytest-asyncio + pytest-cov | `pytest --cov=prosell` (per `CLAUDE.md`); `pytest-cov` presente; threshold explícito no confirmado este pase                                                                                                                                                      |
| Frontend | `apps/web/tests/{unit,components,app,__mocks__,utils}/` — `unit` → `api/components/config/design-tokens/hooks/lib/stores`; `components` → `admin/appointments/auth/catalog/filters/forms/ui`                                                                                               | Vitest + Testing Library + jsdom     | `vitest.config.ts` — provider v8, thresholds `lines:40 functions:40 branches:75 statements:40`, **deliberadamente bajados** de un objetivo original del 80% (comentario in-code lo justifica: la superficie del catálogo superó la superficie de test disponible) |
| E2E      | `tests/{specs,pages,fixtures,factories,helpers,mocks,layer2}/` (paquete standalone `@prosell/e2e`)                                                                                                                                                                                         | Playwright                           | —                                                                                                                                                                                                                                                                 |

**Test de regresión de nivel-config**: `apps/web/tests/unit/config/tailwind.config.test.ts` asserta que `theme.extend.spacing` contiene `"4.5"`, `"8.5"`, `"9.5"` — sigue el patrón establecido de importar el config con `await import(...)` y asertar directo sobre el objeto exportado (mismo patrón que `next.config.test.ts`). Este patrón es el que debería seguir cualquier test futuro que cubra config-level (p. ej. la extensión de spacing necesaria para el residuo `.25`/`.75`).

## Linting

- **Python**: Ruff (extenso `[tool.ruff]`, con una lista de per-file-ignores para **8 archivos** marcada explícitamente `# TODO: Fix these pre-existing issues (not part of current GGA fixes)` — reglas suprimidas incluyen ARG002, SIM102, RUF022, N818, RUF012) + Pyright — wireados en pre-commit **y** pre-push.
- **⚠️ Divergencia de estrictez Pyright**: `apps/api/pyproject.toml` (la config real usada por CI/pre-commit) declara `typeCheckingMode = "standard"`; el `pyproject.toml` raíz declara `"strict"` — dos niveles distintos de type-checking según qué archivo de config se consulte.
- **TypeScript/JS**: ESLint flat config (`eslint . --max-warnings=0`) — pero el hook `next-lint` de pre-commit está **comentado** ("TODO: currently disabled due to next lint issues"). `lint-staged` (`eslint --fix` + `prettier --write`) cubre solo archivos staged como sustituto parcial — no hay enforcement completo de ESLint en cada commit; CI sí lo corre por separado.
- **`scripts/validate-tailwind.sh`**: verifica solo el patrón `var(--ps-*)` dentro de `className` — no valida la validez de una clase de utilidad de spacing contra la escala configurada de Tailwind.

## CI/CD

- **`.github/workflows/ci.yml`** — al menos `lint-python` y `test-python` confirmados (este último con un contenedor de servicio `postgres-test`); cuerpo completo no releído más allá de las primeras 60 líneas este pase.
- **`.github/workflows/e2e.yml`** — suite E2E Playwright (cuerpo no releído).
- **`.github/workflows/deploy.yml`**, **`promote-prod.yml`**, **`recover-prod.yml`** — despliegue y promoción/recuperación de producción (cuerpos no releídos).
- **`.github/workflows/react-doctor.yml`** — advisory-only (no bloquea merge).
- **`.github/workflows/graphify.yml`** — reconstrucción del grafo de conocimiento.

## Pipeline de pre-commit / pre-push (`.pre-commit-config.yaml`)

`default_install_hook_types: [pre-commit, pre-push]`. Orden de ejecución en pre-commit:

1. GGA AI code review (`scripts/gga-batch.sh`, proveedor `codex`, reglas de `AGENTS.md`, `STRICT_MODE=true`)
2. Secret scan
3. Spec-status lifecycle enforcement (`validate_spec_status.py`, acotado a `docs/superpowers/specs/*.md`)
4. Guard de `var()`-en-className de Tailwind (`validate-tailwind.sh`)
5. `lint-staged` (ESLint + Prettier, solo archivos staged)
6. ruff + ruff-format
7. pyright
8. `react-doctor --staged --blocking warning`
9. hooks estándar de `pre-commit-hooks`

Pre-push re-corre prettier/ruff/pyright, más `sync-test-db.sh` y la suite completa `pytest -q` del backend.

## Documentación

- `CLAUDE.md` raíz es comprehensivo pero conserva **al menos 1 punto de drift Tailwind sin corregir** (ver Signal #2 abajo) pese a que la tabla de Tech Stack ya fue corregida en el intent `260828-fix-invalid-tailwind-spa`.
- `AGENTS.md` — reglas autoritativas de revisión AI (GGA), incluye la excepción Zod-3-vs-4; línea 14 ya correcta sobre Tailwind.
- **Sprawl de markdown en la raíz**: número inusualmente grande de archivos `.md` de sesión/handoff ad-hoc en la raíz del repo (README.md, CLAUDE.md, AGENTS.md, DEPLOY.md, HANDOFF.md, HANDOFF-RELEASE.md, CONTINUE-HERE.md, INITIAL.md, SPEC.md, MIGRATION_TEST_REPORT.md, TESTING.md, TODO-CLEANUP-SUMMARY.md, varios SPRINT__\_VALIDACION_.md, FIX-MARKETPLACE-ACCESS-BUTTON.md, más archivos de reporte/transcript de "council") — señal de documentación de sesión acumulada fuera del árbol estructurado `docs/`. Un lifecycle durable existe y está enforced en `docs/superpowers/specs/`, pero el sprawl de raíz no está gobernado de forma similar.

---

## Technical Debt Signals (inventario actualizado — este rescan)

### 1. ⚠️ Residuo de clases Tailwind inválidas — familia `.25`/`.75`, NO cubierta por el fix anterior de este mismo intent

La familia `.5` (`h-9.5`, `px-4.5`, `h-8.5`) que originó el intent `260828-fix-invalid-tailwind-spa` **ya está corregida**: `tailwind.config.ts` extiende `spacing` con esos tres valores, con test de regresión dedicado. Sin embargo, el barrido repo-wide de este rescan encontró un **segundo grupo, no cubierto por ese fix**: clases de paso de cuarto `gap-1.25` (×2) y `mt-0.25` en `apps/web/src/app/(seller)/publications/page.tsx`; `py-0.75`/`p-0.75`/`mb-0.75` en el mismo archivo más `PublicationStatus.tsx`, `LeadStatusBadge.tsx`, `ProductImageGallery.tsx`. Compilan a CSS vacío por la misma causa raíz (fuera de la escala default y no extendidas). Por contraste, el conjunto mucho más grande de clases `.5`-puras repo-wide (`gap-1.5`, `py-2.5`, `w-3.5`) **es válido** y no es defecto. Detalle línea por línea pendiente en `component-inventory.md`.

### 2. ⚠️ Drift de tabla de stack en `CLAUDE.md` — parcialmente remediado

La tabla "Tech Stack 2026" (línea ~72) y `AGENTS.md` línea 14 ya fueron corregidas a `3.4.17`. **Sigue sin corregir**: la sección "Key Conventions" (línea ~194) de `CLAUDE.md`, que todavía dice "TailwindCSS 4: New engine, no `var()` en className". Quedó fuera del alcance aprobado del intent previo (su FR solo nombraba la tabla). El comentario de encabezado de `globals.css` ("Tailwind CSS 4.0 directives") tampoco fue corregido. El naming del hook/script `validate-tailwind` ("Tailwind 4 enforcement") es cosmético y no afecta la funcionalidad del chequeo.

### 3. `packages/*` documentado pero ausente

`pnpm-workspace.yaml` declara el glob `packages/*`; el directorio no existe físicamente. Documentación/estructura muerta, o plan diferido sin fecha.

### 4. `apps/app/` — micro-app huérfana

Contiene únicamente `privacy/page.tsx`, sin `package.json` propio — no es miembro del workspace pnpm, shadowed por la ruta real `apps/web/src/app/privacy/page.tsx`. Candidato a eliminación.

### 5. Hook ESLint deshabilitado en pre-commit

Comentado en `.pre-commit-config.yaml` con TODO abierto. `lint-staged` cubre solo archivos staged; CI sí ejecuta ESLint completo por separado.

### 6. Estado dual Zod 3/4

`AGENTS.md` instruye usar Zod 3 hasta resolver issue #74, pero `zod: ^4.4.0` ya está instalado (código real sigue en estilo Zod 3). Migración completa trackeada aparte en `260828-zod-3-to-4-migration` — no colar fixes parciales.

### 7. `useEffect` para data fetching/mutación

`onboarding/page.tsx` e `invite/[token]/page.tsx` violan `AGENTS.md:333` ("useEffect for data fetching - use Server Components or React Query"). `invite/[token]/page.tsx` dispara una mutación en el mount con 5 estados de UI; no existe hoy un hook `useQuery` reusable para `orgApi`. Migración trackeada aparte en `260828-useeffect-to-react-query` (scope bugfix, hereda piso de test).

### 8. Defecto conocido de proxy BFF — `response.json()` sin chequeo de content-type

Persiste sin arreglar en los proxies catch-all (`products`, `categories`, `organizations`, `vehicles`) — no re-verificado línea por línea este pase (skimmed), pero confirmado aún abierto según memoria del proyecto.

### 9. Hook pre-commit ESLint deshabilitado + divergencia de estrictez Pyright (root `strict` vs. `apps/api` `standard`)

Dos configuraciones de Pyright con distinta estrictez conviviendo en el repo — la real usada en CI/pre-commit es la más laxa (`standard`).

### 10. Thresholds de cobertura frontend deliberadamente bajados

`vitest.config.ts` documenta en comentario in-code la razón (superficie del catálogo superó la superficie de test disponible); bajado de un 80% original a `lines:40 functions:40 branches:75 statements:40`. Deuda intencional y documentada, no accidental.

### 11. Lista extensa de ruff per-file-ignores

8 archivos con violaciones suprimidas (ARG002, SIM102, RUF022, N818, RUF012), marcados TODO en `pyproject.toml`.

### 12. TODO/FIXME density

15 marcadores TODO/FIXME encontrados en `apps/api/src` y `apps/web/src` (grep dirigido, no exhaustivo), incluyendo trabajo de integración con Facebook Graph API diferido a fase 3 y un **chequeo de rol admin sin implementar** en `marketplace_access_router.py:110`.

### 13. Router backend potencialmente no wireado

31 módulos de router presentes bajo `infrastructure/api/routers/`, pero solo **30** llamadas `app.include_router(...)` en `main.py` — un módulo no confirmado como registrado. No investigado a fondo este pase si es intencional.

### 14. Sprawl de documentación ad-hoc en la raíz

Ver § Documentación arriba.

---

## Prioridad recomendada de resolución (para Requirements Analysis)

1. **Signal #1** (residuo `.25`/`.75`, este mismo intent) — bloqueante, decidir si se cubre en el mismo fix que ya cerró la familia `.5` o se trata como follow-up separado.
2. **Signal #2** (drift Tailwind residual en `CLAUDE.md` línea ~194 + `globals.css`) — corrección barata, alto valor preventivo, causa raíz plausible del bug original.
3. Signals #3–#14 — deuda preexistente, no bloqueante para este intent; #6 y #7 ya tienen intent propio dedicado (`260828-zod-3-to-4-migration`, `260828-useeffect-to-react-query`); el resto sin intent propio todavía.
