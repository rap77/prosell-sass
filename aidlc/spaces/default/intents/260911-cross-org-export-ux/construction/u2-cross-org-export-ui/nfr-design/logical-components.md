# Logical Components — u2-cross-org-export-ui

## Inventario de componentes lógicos

| Componente lógico                                       | Ubicación                                          | Responsabilidad                                                                    | Nuevo/Extendido |
| ------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------- |
| `OrganizationPicker.tsx` (extensión)                    | `Header.tsx`                                       | Renderiza el sentinel "Todas las organizaciones", filtra por `product_count`       | Extendido       |
| `organizationStore.ts` (extensión)                      | Zustand store                                      | `viewingOrgId: string \| "ALL_ORGS" \| null`                                       | Extendido       |
| `CatalogGrid` (interno a `catalog/page.tsx`, extensión) | `catalog/page.tsx`                                 | Deriva `organizationId` desde `viewingOrgId` (Contract 1), dispara refetch         | Extendido       |
| `ExportSummaryBanner` (extensión)                       | Componente de banner inline                        | Variante `all-orgs` con conteo, confirmación reforzada (FR5.1)                     | Extendido       |
| `exportCatalogClientFormat` (extensión)                 | `apps/web/src/lib/api/products.ts`                 | Cliente API extendido con `allOrganizations`/`baseFolder`/`facebookGroupsFallback` | Extendido       |
| 2 popups nuevos (`window.prompt()`)                     | Inline en el handler de export, `catalog/page.tsx` | Carpeta base, grupos de Facebook                                                   | Nuevo           |

## Failure domains (sin cambio de topología)

Un único failure domain: el flujo de export/filtrado en sí, contenido
dentro de `catalog/page.tsx`/`Header.tsx`. Un fallo en cualquier paso se
captura y renderiza como error de UI, sin afectar el resto de la
página.

## Blast radius (sin cambio)

Acotado a la interacción del usuario que dispara el filtrado o el
export — sin estado compartido entre usuarios ni entre pestañas.

## Sin componente desplegable nuevo

Todo vive dentro del bundle ya existente de `apps/web`.

## Fuente

Deriva de `frontend-components.md`/`functional-spec.md` (Functional
Design de este mismo Unit) y `contract-summary.md` (los 2 contratos con
`u1-cross-org-export-api`).

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-12T20:20:44Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                            | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Recommendation                                                       |
| --- | -------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Minor    | `logical-components.md`, fila `ExportSummaryBanner` | Cita `FR5.1` como origen de "confirmación reforzada" — `FR5.1` (`requirements.md` línea 85) es efectivamente el banner de confirmación para modo "todas", así que la cita es correcta, pero el propio `functional-spec.md` de este Unit (línea 109) registra que una etapa anterior (Functional Design) ya cometió una atribución cross-unit incorrecta (AC2.1.2) en el mismo tipo de tabla — vale la pena que quien lea esta tabla de componentes sepa que las citas de ID aquí fueron re-verificadas independientemente en esta pasada (ver Verificación abajo), no heredadas sin chequeo del artefacto anterior. No bloquea: es una nota de trazabilidad, no un error real encontrado. | Ninguna acción requerida — dejar constancia en este veredicto basta. |

No se encontraron hallazgos Critical ni Major.

### Verificación específica (puntos 1-5 del brief)

1. **`traceability.json` — 4 IDs de `upstream_ids`**: `NFR-PERF-UI-1`, `NFR-PERF-UI-2`, `NFR-PERF-UI-3` existen literalmente en `performance-requirements.md` de este Unit (tabla de targets, ya vigentes desde `260903`). `NFR-PERF-UI-4` (filtrado por `product_count`) también existe literalmente, agregado como target nuevo por este intent — confirmado carácter a carácter contra el archivo. La fila `reverse` (`security-requirements-no-ids`) es un uso razonable de esa sección: `security-requirements.md` de este mismo Unit efectivamente no numera ningún NFR propio (declara explícitamente ausencia de superficie de seguridad propia), así que no hay un ID hacia adelante que trazar — documentar ese hecho en `reverse` en vez de omitirlo o forzar un `N/A` con un ID inexistente es la adaptación correcta, análoga al patrón ya aprendido para Units `kind: ui` sin `rules.md` propio.
2. **`performance-design.md`, técnica de NFR-PERF-UI-4**: `Array.filter` sobre `useOrganizations()` ya cargado es coherente con `frontend-components.md` (`.filter(o => (o.product_count ?? 0) > 0)`, tabla de `OrganizationPicker.tsx`) y con `functional-spec.md`. La cifra "≤30 organizaciones reales" no es inventada — reaparece consistentemente en el ecosistema de artefactos hermanos de este mismo intent (`u1-cross-org-export-api`).
3. **`security-design.md`, nota de "filtrado real de la grilla (FR3.1) sin superficie de seguridad nueva"**: coherente con la distinción ya hecha en `security-requirements.md` de este Unit (fila STRIDE "Information Disclosure — IDOR nuevo") entre riesgo funcional (scope por defecto, gobernado por la regla `consumer_contract` de `contract-summary.md` Contract 1, verificada literalmente: "U2 DEBE pasar organization_id explícito... de lo contrario un Super Admin vería 'todas' sin haberlo elegido") y riesgo de seguridad real (autorización server-side, `u1-cross-org-export-api` NFR1.2/NFR2.4). `FR3.1` existe literalmente en `requirements.md` línea 51. Sin contradicción entre los dos archivos.
4. **`logical-components.md` — inventario vs. `frontend-components.md`**: los 6 componentes (`OrganizationPicker.tsx`, `organizationStore.ts`, `CatalogGrid`, `ExportSummaryBanner`, `exportCatalogClientFormat`, 2 popups nuevos) coinciden uno a uno con la jerarquía y las tablas de props de `frontend-components.md` — mismas responsabilidades, mismo estado Nuevo/Extendido. `FR5.1` (confirmación reforzada) existe literalmente en `requirements.md` línea 85. Sin componente inventado ni omitido.
5. **`upstream-coverage`/`required-sections`**: los 3 archivos Markdown (`performance-design.md`, `security-design.md`, `logical-components.md`) tienen ≥2 H2 cada uno y citan en prosa `performance-requirements.md`, `security-requirements.md`, `functional-spec.md`/`frontend-components.md` y `contract-summary.md` donde corresponde. `traceability.json` es JSON puro, no aplica el sensor de H2.

### Validation Tool Results

No se listan validation tools específicos para `nfr-design` en `.claude/aidlc-common/stages/construction/nfr-design.md` más allá de los sensors estándar (`required-sections`, `upstream-coverage`), verificados manualmente arriba.

### Summary

Los 4 artefactos extienden coherentemente el diseño ya aprobado en `260903-catalog-client-export` sin introducir técnica nueva salvo el filtrado client-side de NFR-PERF-UI-4, cuya cifra y mecanismo están anclados en artefactos reales (no inventados). Las citas cruzadas de FR/NFR fueron re-verificadas literalmente contra `requirements.md`/`performance-requirements.md`/`contract-summary.md`, sin discrepancias. El único hallazgo es Minor (una nota de trazabilidad, no un error) y no bloquea.
