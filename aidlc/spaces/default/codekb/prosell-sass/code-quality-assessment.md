# Code Quality Assessment — prosell-sass

## Cobertura de tests

| Suite                             | Directorios                                                                                 | Archivos | Framework                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------- |
| Backend unit/integration/contract | `apps/api/tests/{unit,integration,contract,utils}`                                          | 270      | pytest + pytest-asyncio (`asyncio_mode=auto`) + pytest-cov    |
| Backend unit (ubicación inusual)  | `apps/api/src/prosell/tests/unit`                                                           | 8        | pytest — dentro de `src/`, no en `tests/` de nivel de paquete |
| Frontend unit/component           | `apps/web/tests/{unit,components,app,e2e,__mocks__,utils}` + 65 co-localizados `*.test.tsx` | 93 + 65  | Vitest + Testing Library + jsdom                              |
| E2E                               | `tests/e2e/{specs,fixtures}`                                                                | 88       | Playwright                                                    |

**No se encontró (en este pase) un umbral de cobertura configurado para pytest** — no confirma ausencia real, solo que no se localizó en la lectura de `pytest.ini` (solo se leyeron las claves de config, no el archivo completo).

### Umbral de cobertura frontend — regresión documentada explícitamente

`apps/web/vitest.config.ts` (provider v8) tiene los umbrales **bajados explícitamente de 80% → 40% líneas/funciones, 75% ramas**, con un comentario inline documentando la razón: el catálogo se volvió multi-vertical más rápido de lo que creció la cobertura de tests. Medición de junio 2026 citada en el propio comentario: **líneas 48.51%, funciones 44.45%, ramas 77.9%**. Esto es deuda técnica reconocida y auto-documentada por el equipo — no un hallazgo nuevo de este pase, pero relevante para calibrar cuánta cobertura de regresión exigir en el bugfix batch actual (scope `express`, que según `org.md` usa la "Minimal strategy": un test por requerimiento + piso de happy-path por componente, sin exigir subir el piso de cobertura global).

## Linting y type-checking

- **Backend**: Ruff (reglas `E/W/F/I/N/UP/B/C4/SIM/ARG/PTH/RUF`, `target-version = py313`) + Pyright (modo `standard`, `py313`).
  - `apps/api/pyproject.toml` tiene un bloque `per-file-ignores` con comentario `# TODO: Fix these pre-existing issues` nombrando 6 archivos con reglas suprimidas — backlog de deuda auto-documentado, no oculto.
- **Frontend**: ESLint con `max-warnings=0` (cero tolerancia — cualquier warning bloquea) + `tsc --noEmit` + Prettier repo-wide.
- **Pre-commit**: `.pre-commit-config.yaml` corre linters en cada commit; `.gga` corre revisión de código por IA contra las reglas de `AGENTS.md` en cada commit — doble gate antes de que el código llegue a CI.

## CI/CD

6 pipelines en `.github/workflows/`:

- `ci.yml` — **leído parcialmente**: cancela runs en vuelo solo para PRs (no para push a `main`, para no perder el trigger de `deploy.yml` vía `workflow_run`); jobs confirmados: `lint-python` (Ruff check + format check + Pyright), `test-python` (pytest con Postgres 17 como servicio, `--cov=prosell --cov-report=xml`), inicio de `lint-node`. Corre en `ubuntu-latest`, `PYTHON_VERSION: "3.13"`, `NODE_VERSION: "22"`.
- `deploy.yml`, `e2e.yml`, `graphify.yml`, `promote-prod.yml`, `recover-prod.yml` — **no abiertos en este pase**, presencia confirmada únicamente.

## Documentación

- `CLAUDE.md` es detallado y explícito sobre convenciones, pero tiene **al menos un drift confirmado**: TailwindCSS documentado como "4.0", instalado real `3.4.17` (ver `technology-stack.md`). El mismo drift está replicado en `docs/AUDIT-UI-UX-I18N-2026-07-21.md` ("Tailwind 4 configurado") — está en al menos dos documentos, no es un error de tipeo puntual.
- `docs/AUDIT-UI-UX-I18N-2026-07-21.md` — auditoría propia del equipo, fechada 2026-07-21, ya documenta con detalle el problema de i18n incompleto (95% hardcoded, solo 2 archivos usan `useTranslations`) que subyace a BUG-7. Este pase de reverse engineering **corrobora y añade** el detalle técnico específico (`vehicle-values.ts` como fuente puntual del bug reportado) que el audit de UX no llega a nivel de archivo/línea.
- Comentarios de código auto-documentando deuda: `vehicle-values.ts` ("ponytail: dict only, no i18n lib. Add next-intl when multi-locale needed"), `SchemaFieldRenderer.tsx` ("check options array, not type — schema uses filter_type for select"), `vitest.config.ts` (justificación de la baja de umbral de cobertura). Buena señal de cultura de equipo: la deuda se declara donde vive, no se esconde.

## Señales de deuda técnica (consolidado)

Ordenadas por relevancia directa al intent activo:

1. **Doble contrato de tipo para `attribute_schema`** (`AttributeField` vs `AttributeSchemaEntry`) — raíz de BUG-3/6. Ver `architecture.md` § Interaction Diagrams #1.
2. **Sin utilidad `titleCase`/`toTitleCase` en todo el código base** — raíz de BUG-5. Confirmado por búsqueda, no es una llamada olvidada sino una utilidad inexistente.
3. **Vacío de plomería público para contacto de organización** — raíz de BUG-4, requiere backend + frontend, no solo UI.
4. **i18n backend muerto + i18n frontend al 5% de adopción** — raíz de BUG-7, ya auto-documentado por el equipo en `docs/AUDIT-UI-UX-I18N-2026-07-21.md`.
5. **`UNIVERSAL_COLUMNS` como `set` sin orden garantizado** — riesgo directo para FEAT-1 si se reutiliza sin normalizar.
6. **`CreateOrganizationUseCase` duplicado** en `org/` vs `organization/` — deuda de claridad arquitectónica, fuera del alcance de los bugs actuales.
7. **Archivo de respaldo `auth_router.py.backup2`** versionado en el árbol — cosmético pero debería limpiarse.
8. **Drift de documentación Tailwind 3 vs 4** — replicado en dos documentos.
9. **Piso `requires-python >=3.12` vs target documentado "3.13+"** — inconsistencia menor, floor-vs-target, no bloqueante.
10. **Umbral de cobertura frontend bajado de 80%→40%** — deuda ya reconocida y auto-documentada por el equipo, no oculta.

## Evaluación general

El código base muestra **disciplina de proceso fuerte** (Clean Architecture consistente, cero-tolerancia a warnings de lint, doble gate pre-commit con revisión por IA, deuda auto-documentada en comentarios y en un audit propio) combinada con **deuda de contrato compartido concentrada en el área de categorías dinámicas** (JSONB libre sin un único tipo fuente de verdad entre editor y runtime) y **una brecha de i18n conocida y ya diagnosticada por el propio equipo** antes de este intent. Los 4 bugs con causa raíz trazada en este pase (BUG-3/6, BUG-5, BUG-4, BUG-7) no son fallos aislados de implementación — cada uno tiene una explicación arquitectónica de una a tres oraciones, lo cual sugiere que corregirlos "en el síntoma" (solo el componente que falla visualmente) dejaría la causa raíz intacta para el próximo campo/feature que toque el mismo patrón.
