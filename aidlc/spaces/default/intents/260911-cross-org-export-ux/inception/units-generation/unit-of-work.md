# Units of Work — 260911-cross-org-export-ux

| Unit ID | Directory               | Kind    |
| ------- | ----------------------- | ------- |
| U1      | u1-cross-org-export-api | service |
| U2      | u2-cross-org-export-ui  | ui      |

## U1 — u1-cross-org-export-api

- **Descripción**: extiende `apps/api` para exportar el catálogo de
  todas las organizaciones en una sola corrida y para corregir el
  mapeo de columnas del CSV cliente que hoy salen vacías o con el
  valor crudo interno.
- **Responsabilidades**:
  - Corregir `build_client_format_row()` en `csv_export.py` para las 8
    columnas afectadas: `VIN`, `body_style`, `clean_title`, `groups`,
    `category`, `type`, `location`, `state` (FR7).
  - Extender `ExportCatalogClientFormatUseCase.execute()` para aceptar
    el sentinel "todas las organizaciones" (FR2, FR4), resolviendo
    `org_code` por-producto en batch (precedente
    `_resolve_org_codes()` de `bulk_upload_vehicles.py`, adaptado a la
    dirección inversa cross-tenant — ver `stories.md` § Notes for
    Functional Design).
  - Aplicar `EXPORT_MAX_PRODUCTS=500` como límite global para el modo
    "todas" (FR4.3).
  - Extender el chequeo de permiso `ORG_ADMIN_VIEW_ALL`/`super_admin`
    al nuevo sentinel (FR4.4, NFR2).
  - Distinguir el log de auditoría del modo "todas" del de una
    organización ajena puntual (FR6, NFR1).
  - Aceptar la carpeta base y los grupos de Facebook confirmados por
    el usuario para completar `path` (FR8.4) y el fallback de
    `groups` (FR9.4).
- **Modelo de despliegue**: standalone dentro del monolito backend ya
  existente — mismo pipeline de deploy-on-merge ya afirmado, sin
  componente desplegable nuevo.
- **Complejidad relativa**: L.
- **Notas de implementación**: ver `team-practices.md` § Testing
  Posture para los precedentes de implementación ya afirmados
  (resolución batch de `org_code`, separación resolución/mapeo de
  categorías) y el piso mínimo de 6 puntos de test.

## U2 — u2-cross-org-export-ui

- **Descripción**: extiende `apps/web` para que el selector de
  organización del header (a) tenga el label correcto y filtre
  organizaciones vacías, (b) ofrezca el modo "todas las
  organizaciones", (c) filtre realmente la grilla de `/catalog`, y (d)
  pida al usuario carpeta base y grupos de Facebook al exportar.
- **Responsabilidades**:
  - Renombrar el label de `OrganizationPicker.tsx` (FR1.1) y filtrar
    por `product_count > 0` (FR1.2).
  - Agregar el sentinel "todas las organizaciones" a
    `organizationStore.viewingOrgId` (FR2.1), preservando el
    comportamiento por defecto (FR2.2).
  - Conectar `viewingOrgId` a `useInfiniteProducts()`/`ProductFilters`
    para filtrar realmente la grilla (FR3.1, FR3.2), sin afectar a
    usuarios sin permiso (FR3.3, US3.3).
  - Reforzar `ExportSummaryBanner` con la advertencia de "todas" (FR5)
    y el estado de carga distinguible (Refined Mockups Q2).
  - Agregar los dos popups nuevos (`window.prompt()`) de carpeta base
    (FR8.1-8.3) y grupos de Facebook (FR9.1-9.3), en el orden y con el
    tratamiento visual ya fijado en `refined-mockups/`.
- **Modelo de despliegue**: standalone dentro del frontend Next.js ya
  existente — mismo pipeline de deploy-on-merge, sin componente nuevo.
- **Complejidad relativa**: M.
- **Notas de implementación**: ver `refined-mockups/interaction-spec.md`
  para el detalle de estados/accesibilidad de cada componente
  extendido, y `team-practices.md` § Code Style para la convención de
  naming `organizationId`/`organization_id` ya afirmada.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-12T11:23:38Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                              | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Recommendation                                                                                                                             |
| --- | -------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Minor    | `unit-of-work-story-map.md` § Orden de implementación | El criterio "más simple y aislado" usado para ordenar FR7 primero dentro de U1 podría, en una lectura superficial, confundirse con una heurística de priorización económica (risk-first) entre Units — está prohibido para esta etapa. Verificado que el ordenamiento es puramente técnico/de dependencia DENTRO de cada Unit (nunca compara valor de negocio entre U1 y U2, y el documento declara explícitamente que la secuenciación económica queda para Delivery Planning), así que no es una violación real, solo una redacción que un lector apurado podría malinterpretar. | Ninguna acción obligatoria; opcionalmente aclarar "simple de implementar" en vez de "simple" a secas para evitar la ambigüedad de lectura. |

No se encontraron hallazgos Critical ni Major. No se realizó ninguna corrección — no había defectos mecánicos/objetivos que ameritaran edición directa antes de este veredicto.

### Validation Tool Results

No se listan validation tools en la definición de esta etapa para Units Generation; verificación hecha por lectura cruzada manual de los 4 artefactos primarios/secundarios más `stories.md`, `requirements.md` y `component-inventory.md` (ver detalle abajo).

### Verificación de referencias cruzadas

1. **Edge block YAML** (`unit-of-work-dependency.md`): válido, un solo edge `u2-cross-org-export-ui → u1-cross-org-export-api` (`depends_on: [u1-cross-org-export-api]`), acíclico trivialmente (2 nodos, 1 arista dirigida). Los nombres `u1-cross-org-export-api`/`u2-cross-org-export-ui` coinciden EXACTAMENTE (carácter a carácter) entre `unit-of-work.md` (tabla + headers), `unit-of-work-dependency.md` (diagrama mermaid + edge block), `unit-of-work-story-map.md` (columna Directory) y `traceability.json` (vía `units-generation-questions.md`, que sí nombra los directories completos — `traceability.json` usa el alias corto "U1"/"U2" consistente con `unit-of-work-story-map.md`). El diagrama mermaid y el edge block YAML son consistentes entre sí (mismo sentido de la flecha: U2 consume el contrato de U1).
2. **Cobertura de las 24 historias**: conté las historias reales en `stories.md` (US1.1–US9.2): 2+2+3+5+1+1+6+2+2 = 24. Las 24 aparecen en la tabla de `unit-of-work-story-map.md` sin huérfanas, y las mismas 24 aparecen en `upstream_ids`/`coverage[]` de `traceability.json`, todas con `status: "OK"`. Las 2 historias cross-cutting (US2.1, US2.2) están correctamente marcadas con target `"U1, U2"` en ambos artefactos, consistente con la nota explícita en `unit-of-work-story-map.md` § Historias cross-cutting.
3. **Frontera de 2 Units vs. `component-inventory.md`**: confirmado — U1 (`service`) toca exclusivamente componentes backend ya inventariados bajo "Export de catálogo — formato cliente + ZIP de imágenes" y "Export 'todas las organizaciones' + mapeo de columnas CSV cliente" (`csv_export.py`, `export_catalog_client_format.py`/use case, `product_router.py`, `AbstractOrganizationRepository`); U2 (`ui`) toca exclusivamente componentes frontend del mismo inventario (`OrganizationPicker.tsx`, `catalog/page.tsx`, `organizationStore`, `useInfiniteProducts()`). No hay mezcla de responsabilidades entre Units — cada FR/US backend cae en U1, cada FR/US frontend cae en U2, sin excepción. La agrupación de las 6 áreas de FR backend (FR2 backend, FR4, FR6, FR7, FR8.4, FR9.4) en una sola Unit U1 es coherente con el aprendizaje ya persistido de este mismo intent en `project.md` (cohesión de archivo/función/ciclo de vida compartido en `csv_export.py`/`export_catalog_client_format.py`, no fragmentación por área de FR) — no hay fragmentación innecesaria ni sobre-consolidación indebida.
4. **Ausencia de orden económico prohibido**: la sección "Orden de implementación dentro de cada Unit" de `unit-of-work-story-map.md` ordena FR DENTRO de cada Unit por criterio técnico/de dependencia (aislamiento, simplicidad de implementación, orden de las capas tocadas) — nunca compara valor de negocio ni urgencia entre U1 y U2, ni recomienda qué Unit o Bolt va primero. El documento declara explícitamente ("es una decisión de Delivery Planning, no de Way of Working/esta etapa") que la secuenciación económica queda fuera de esta etapa — correcto per el alcance de Units Generation (2.7, topología) vs. Delivery Planning (2.9, secuenciación). Ver hallazgo Minor #1 arriba sobre una redacción ambigua no bloqueante.
5. **Auto-dependencia y consistencia depends_on/diagrama**: ningún Unit depende de sí mismo. `depends_on: []` para U1 y `depends_on: [u1-cross-org-export-api]` para U2 son exactamente lo que representa el diagrama mermaid (`U2 --> U1`, con la etiqueta correcta describiendo que U2 consume el contrato de U1). Sin inconsistencia entre el YAML machine-readable y el diagrama humano-legible.

### Summary

El artefacto llega sólido: el edge block es válido y acíclico, los nombres de Unit son consistentes byte a byte en los 4 archivos, las 24 historias tienen cobertura completa sin huérfanas, la frontera de 2 Units respeta la separación real backend/frontend de `component-inventory.md` sin fragmentación ni mezcla de responsabilidades, y no hay ningún intento de recomendar orden económico entre Units (la única ordenación presente es técnica y explícitamente delimitada a Delivery Planning para la parte de secuenciación de valor). Un solo hallazgo Minor de redacción, no bloqueante y sin corrección obligatoria.
