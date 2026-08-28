# Code Quality Assessment — ProSell SaaS

## Test Coverage

| Área                              | Directorios                                                                                                         | Frameworks                           | Config de cobertura                                                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend                           | `apps/api/tests/{contract,integration,unit,stubs,utils}/` (272 archivos `.py`) + `apps/api/src/prosell/tests/unit/` | pytest + pytest-asyncio + pytest-cov | `pytest.ini` presente; sin threshold de cobertura enforced visible en este pase (skimmed, no confirmado en detalle)                                                                                                                                   |
| Frontend                          | `apps/web/tests/` (93 archivos) + 70 co-localizados `*.test.tsx`/`.test.ts`                                         | Vitest + Testing Library + jsdom     | `vitest.config.ts` — provider v8, thresholds `lines:40 functions:40 branches:75 statements:40`, **deliberadamente bajados** de un objetivo original del 80% (comentario en código justifica: la superficie del catálogo superó la superficie de test) |
| E2E                               | `tests/e2e/specs/` (34 archivos)                                                                                    | Playwright                           | —                                                                                                                                                                                                                                                     |
| Presencia adicional, no explorada | `tests/{integration,unit,apps}/` a nivel raíz                                                                       | —                                    | solo presencia confirmada                                                                                                                                                                                                                             |

## Linting

- **Python**: Ruff (`select = [E,W,F,I,N,UP,B,C4,SIM,ARG,PTH,RUF]`) + Pyright — completamente wireados en pre-commit **y** pre-push.
- **TypeScript/JS**: ESLint flat config (`eslint . --max-warnings=0`) — pero el hook `next-lint` de pre-commit está **comentado** ("TODO: currently disabled due to next lint issues"). `lint-staged` (`eslint --fix` + `prettier --write`) cubre solo archivos staged como sustituto parcial — no hay enforcement completo de ESLint en cada commit.
- **`scripts/validate-tailwind.sh`**: verifica solo el patrón `var(--ps-*)` dentro de `className` — no valida la validez de una clase de utilidad de spacing contra la escala configurada de Tailwind. Confirmado por lectura completa del script.

## CI/CD

- **`.github/workflows/ci.yml`** — 7 jobs: `lint-python`, `test-python`, `lint-node`, `test-node`, `validate-specs`, `validate-code-standards`, `build`.
- **`.github/workflows/e2e.yml`** — suite E2E Playwright.
- **`.github/workflows/deploy.yml`** — despliegue a staging on `workflow_run`.
- **`.github/workflows/react-doctor.yml`** — advisory-only (no bloquea merge).
- **`.github/workflows/graphify.yml`** — reconstrucción del grafo de conocimiento.
- **`.github/workflows/promote-prod.yml`** / **`recover-prod.yml`** — promoción y recuperación de producción.

## Documentación

- `CLAUDE.md` raíz es comprehensivo pero tiene **al menos 2 puntos de drift confirmados** (ver Signal #1 y #8 abajo).
- `AGENTS.md` (521 líneas) — reglas autoritativas de revisión AI (GGA), incluye la excepción Zod-3-vs-4.
- 13 archivos markdown sueltos en la raíz del repo (artefactos de sesión/handoff ad-hoc) — `docs/sessions/` existe como hogar presumible, no usado consistentemente.

---

## Technical Debt Signals (inventario completo — 8 señales)

### 1. ⚠️ Clases Tailwind inválidas — bug de este intent, alcance más amplio de lo originalmente declarado

**Este es el defecto que originó el intent `260828-fix-invalid-tailwind-spa`.** Barrido repo-wide de todo patrón `*-<n>.5` bajo `apps/web/src` confirmó que la mayoría de las clases half-step (`gap-1.5`, `px-2.5`, `mt-0.5`, `w-3.5`) **son válidas** en la escala default de Tailwind 3 (que incluye half-steps 0.5–3.5). El bug real está acotado a instancias **por encima de 3.5**, que `tailwind.config.ts` (leído completo) no extiende y por tanto compilan a CSS vacío.

**Inventario completo — 7 archivos, 13 instancias** (ver `component-inventory.md` para el detalle línea por línea):

- `h-9.5` — `OnboardingStep3.tsx:167,181,196` (3×); `publications/page.tsx:286,297,443,450` (4×); `PublishForm.tsx:573,583` (2×)
- `px-4.5` — `privacy/page.tsx:89`; `terms/page.tsx:89`; `publications/page.tsx:286,297` (2×); `AppointmentForm.tsx:529`
- `h-8.5` — `KanbanBoard.tsx:291`

**⚠️ Brecha de alcance frente al intent original**: el intent declaró originalmente 5 archivos (`privacy/page.tsx`, `terms/page.tsx`, `publications/page.tsx`, `OnboardingStep3.tsx`, `AppointmentForm.tsx`). Este rescan encontró **2 archivos y 3 instancias adicionales no declarados**: `PublishForm.tsx` (2× `h-9.5`) y `KanbanBoard.tsx` (1× `h-8.5`). Total real = 7 archivos, 13 instancias. Esta brecha debe surgirse explícitamente en Requirements Analysis para decidir si el fix cubre las 13 instancias o se acota a las 10 originalmente conocidas con un follow-up para las 3 restantes.

**Causa raíz probable — drift documental**: la tabla de stack de `CLAUDE.md` raíz declara **TailwindCSS 4.0**, cuando la versión real instalada (`apps/web/package.json`) es **3.4.17**. Es plausible que un agente o humano confiando en esa tabla haya asumido el motor de spacing de Tailwind 4 al escribir `h-9.5`/`px-4.5`, generando el bug. Ver Signal #8 para el drift documental en sí.

**Ningún linter existente atrapa este bug**: `scripts/validate-tailwind.sh` solo revisa `var(--ps-*)`, no la validez de clases de utilidad de spacing — confirmado por lectura completa.

### 2. `packages/` documentado pero ausente

`CLAUDE.md` raíz documenta una estructura de monorepo que incluye `packages/shared-types/` — el directorio **no existe** en disco (confirmado). Documentación muerta, o plan diferido sin fecha.

### 3. `apps/app/` — micro-app huérfana

Contiene únicamente `privacy/page.tsx`. Sin wiring confirmado al grafo de build activo del workspace pnpm. Estado y propósito no claros — candidato a eliminación o integración real, decisión pendiente.

### 4. Hook ESLint deshabilitado en pre-commit

Comentado en `.pre-commit-config.yaml` con TODO abierto ("currently disabled due to next lint issues"). `lint-staged` cubre solo archivos staged, no un enforcement completo por commit — brecha de cobertura de linting real.

### 5. Estado dual Zod 3/4

`AGENTS.md` instruye usar Zod 3 hasta resolver issue #74, pero `apps/web/package.json` ya instala `zod: ^4.4.0`. El código real sigue en estilo Zod 3. Un intento parcial de migrar 2 archivos fue revertido en el intent `260827-react-doctor-cleanup` porque GGA lo bloqueó citando esta misma regla. Migración completa trackeada aparte en `260828-zod-3-to-4-migration` — **no colar fixes parciales de Zod 4** en otros archivos hasta que ese intent corra.

### 6. Clutter de markdown suelto en la raíz

13 archivos `.md` ad-hoc de sesión/handoff en la raíz del repo, sin mover a `docs/sessions/` (que sí existe como hogar presumible).

### 7. Thresholds de cobertura frontend deliberadamente bajados

`vitest.config.ts` documenta en comentario in-code la razón: la superficie del catálogo (número de componentes/páginas) superó la superficie de test disponible, y el equipo bajó el threshold de un 80% original a `lines:40 functions:40 branches:75 statements:40` en vez de bloquear CI. Deuda intencional y documentada, no accidental.

### 8. ⚠️ Drift de tabla de stack en `CLAUDE.md` raíz — Tailwind 4.0 vs. 3.4.17 real

Confirmado por lectura completa de `apps/web/package.json`: la versión real es `3.4.17`, no `4.0` como afirma la tabla "Tech Stack 2026" del `CLAUDE.md` raíz. **Causa raíz plausible del Signal #1** (el bug de este intent) — ver arriba. Corrección de la tabla recomendada como parte de este intent o de un follow-up inmediato para prevenir recurrencia.

---

## Prioridad recomendada de resolución (para Requirements Analysis)

1. **Signal #1** (bug del intent) — bloqueante para este intent, con la decisión de alcance (7 vs. 5 archivos) pendiente de confirmación explícita.
2. **Signal #8** (drift Tailwind en CLAUDE.md) — causa raíz de #1, corrección barata, alto valor preventivo.
3. Signals #2–#7 — deuda preexistente, no bloqueante para este intent, cada uno con intent propio o pendiente de uno (Signal #5 ya tiene intent dedicado; Signal #4 sin intent propio aún, ver también `260828-useeffect-to-react-query` para deuda relacionada de patrones React no cubierta por este pase).
