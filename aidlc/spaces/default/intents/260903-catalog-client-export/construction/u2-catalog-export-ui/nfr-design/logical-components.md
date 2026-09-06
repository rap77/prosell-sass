# Logical Components — u2-catalog-export-ui

## Inventario de componentes lógicos

| Componente lógico              | Ubicación                                                      | Responsabilidad                 | Nuevo/Extendido |
| ------------------------------ | -------------------------------------------------------------- | ------------------------------- | --------------- |
| `ExportClientFormatMenuItem`   | `catalog/page.tsx` (menú "Exportar" existente)                 | Trigger del flujo               | Nuevo           |
| `ExportSummaryBanner`          | Componente de banner inline, co-ubicado con `catalog/page.tsx` | Resumen previo / catálogo vacío | Nuevo           |
| `ExportClientFormatButton`     | Ídem                                                           | Estados loading/success/error   | Nuevo           |
| `exportCatalogCsv` (extensión) | `apps/web/src/lib/api/products.ts`                             | Cliente API del endpoint de U1  | Extendido       |

Los 4 componentes de `frontend-components.md` (Functional Design) —
Toast se reusa sin cambio, no aparece como fila propia.

## Failure domains

Un único failure domain: el flujo de export en sí, contenido dentro de
`catalog/page.tsx`. Un fallo en cualquier paso (request fallido, error de
red) se captura y renderiza como error de UI — sin afectar el resto de
la página de catálogo (tabla/grilla de productos sigue funcionando
normalmente).

## Blast radius

Acotado a la interacción del usuario que dispara el export — sin estado
compartido entre usuarios ni entre sesiones del mismo usuario en otras
pestañas.

## Sin componente desplegable nuevo

Todo vive dentro del bundle ya existente de `apps/web` — consistente con
`unit-of-work.md` (`deployment: embedded`).

## Fuente

Deriva de `frontend-components.md` (Functional Design de este mismo
Unit) y `contract-summary.md` (el boundary con `u1-catalog-export-api`
que `exportCatalogCsv` consume).

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-05T18:51:40Z
**Iteration:** 1

### Findings

| #   | Severity          | Location                            | Finding                                                                       | Recommendation                                                                                       |
| --- | ----------------- | ----------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Major (corregido) | `performance-design.md`             | `tech-stack-decisions.md` no se citaba en ningún artefacto producido.         | **Corregido**: se agregó una cita explícita en `performance-design.md` § Sin optimización adicional. |
| 2   | Minor (corregido) | `traceability.json`, fila `reverse` | El campo `id` embebía una descripción larga en vez de un identificador corto. | **Corregido**: acortado a `security-requirements-no-ids`.                                            |

### Summary

El diseño es coherente e implementable: los 3 targets `NFR-PERF-UI-1/2/3` trazan a técnicas de UI reales y ya vigentes en el stack (React Compiler, `sonner`, actualización de estado local), la ausencia de superficie de seguridad propia está verificada contra `frontend-components.md` (sin `dangerouslySetInnerHTML`), y el inventario de `logical-components.md` coincide exactamente con los 4 componentes de `frontend-components.md` y con `deployment: embedded` de `unit-of-work.md`. Los 2 hallazgos (1 Major, 1 Minor) eran mecánicos — corregidos antes de abrir el gate.
