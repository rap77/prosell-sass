# Units of Work — Export de catálogo (formato cliente + ZIP)

Decomposición confirmada en la entrevista (Step 5): 2 Units, uno por cada
deployable existente que este intent toca (`apps/api`, `apps/web`) — no
por frontera de dominio (`components.md` ya estableció un único
componente, `Product`; ver `decisions.md` de Domain Design, ADR-001). Esta
etapa decide topología de construcción, no boundaries de dominio.

## Units

| Unit ID | Directory               | Kind    | Complejidad | Deployment                                                                  |
| ------- | ----------------------- | ------- | ----------- | --------------------------------------------------------------------------- |
| U1      | `u1-catalog-export-api` | service | M           | embedded (código nuevo dentro del servicio FastAPI `apps/api` ya existente) |
| U2      | `u2-catalog-export-ui`  | ui      | S           | embedded (código nuevo dentro de la app Next.js `apps/web` ya existente)    |

## U1 — `u1-catalog-export-api` (kind: service)

**Responsabilidades** (`requirements.md` FR1, FR2, FR4, NFR1-NFR4; `stories.md` US1.1, US1.3):

- Endpoint HTTP nuevo y dedicado para el export en formato cliente (24
  columnas, `;`, incluyendo `id`), filtrado por `status=published` y
  `organization_id` resuelto SIEMPRE del JWT (FR1.1-FR1.4, NFR1).
- Armado del ZIP de imágenes por vehículo: nombre de carpeta
  `<código_organización>/<año>-<marca>-<modelo>-<millas_en_K>-<color>-<código_organización>/`,
  reutilizando el sanitizador ya existente (`_slug_part()`/equivalente)
  para cada segmento (FR2.2, FR2.4, NFR2).
- Fix del bug ya confirmado en `build_image_folder_name()`: leer
  `attributes["exterior_color"]`, no `attrs.get("color")` (FR2.3).
- Enforcement del cap de recursos del export (NFR3, US1.3/AC1.3.1-1.3.2)
  — rechazo con error específico cuando el catálogo excede el límite, en
  vez de armar un ZIP sin cota. El número exacto queda para NFR
  Design/Functional Design.
- Manejo de errores vía una subclase nueva de `ProductError` (FR4.1) —
  catálogo vacío (404), imagen no legible en `image_urls` (no aborta el
  export completo — log `warning` con `product_id` + referencia de
  imagen, AC1.1.6), catálogo sobredimensionado (cap excedido).
- Decisión pendiente para Functional Design (no resuelta acá):
  `get_object()` en `IDOSpacesService` vs. `httpx` contra `image_urls`
  públicas para leer bytes de imágenes ya subidas.

**Implementation notes**: extiende `csv_export.py`
(`domain/services/`) siguiendo la familia de nombres `csv_*` ya vigente;
la I/O de red/storage para leer imágenes va en `application`/
`infrastructure`, nunca en `domain/services/` (layer boundary confirmado
en `team-practices.md`). El endpoint se agrega a `product_router.py`
(nombre final `export-client-format.csv` u otro, decisión de Functional
Design).

## U2 — `u2-catalog-export-ui` (kind: ui)

**Responsabilidades** (`requirements.md` FR3; `stories.md` US1.1 parcial, US1.2, US1.3 parcial):

- Acción "Exportar catálogo (formato cliente)" en
  `apps/web/src/app/(seller)/catalog/page.tsx` (`handleExportCsv`),
  descarga el ZIP combinado devuelto por U1 (AC1.1.1).
- Diálogo de confirmación con campo de texto editable para nombre/ruta
  sugerida, con valor por defecto (FR3.1, US1.2, AC1.2.1-1.2.3) — sin
  selector de carpeta del sistema operativo (fuera de alcance explícito).
- Estados de UI: carga/progreso (spinner o botón deshabilitado), éxito
  (confirmación de descarga terminada), guard de doble-clic (no dispara
  un segundo request) (AC1.1.10).
- Renderizado de errores específicos: catálogo vacío (404 tipado,
  AC1.1.5), catálogo sobredimensionado (US1.3, AC1.3.1) — mensajes claros,
  no genéricos.
- Extiende `apps/web/src/lib/api/products.ts` (`exportCatalogCsv`) para
  llamar al endpoint nuevo de U1, vía el proxy BFF de `products`
  (`apps/web/src/app/api/v1/products/[...path]/route.ts`) que ya soporta
  `response.blob()` + `Content-Disposition` (confirmado en
  `architecture.md`, sin defecto de `response.json()` ciego para esta ruta).

**Implementation notes**: adopta el patrón de manejo de errores del
frontend hacia excepciones tipadas + handler centralizado, mandado en
`team-practices.md`/`project.md` (Mandated) como convención de equipo
hacia adelante — primera oportunidad concreta de aplicarlo en código
nuevo de este dominio.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-05T13:21:39Z
**Iteration:** 1

### Findings

| #   | Severity          | Location          | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Recommendation                                                                                                                                                                                                                                          |
| --- | ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Major (corregido) | `unit-of-work.md` | El sensor `required-sections` (piso ≥2 H2 por archivo) fallaba mecánicamente sobre este artefacto: solo había UN encabezado H2 (`## Units`); las secciones de U1/U2 estaban en H3 (`### U1 — ...`, `### U2 — ...`), que no cuentan para el piso. Confirmado corriendo el sensor directo: `{"pass":false,"h2_count":1,"headings":["## Units"],"findings_count":1}`. Los otros dos artefactos de la etapa (`unit-of-work-dependency.md`, `unit-of-work-story-map.md`) ya pasaban con 4 H2 cada uno. | **Corregido antes de abrir el gate**: `### U1 — ...` y `### U2 — ...` promovidos a H2 (`## U1 — ...`, `## U2 — ...`) — el archivo ahora tiene 4 H2 (`## Units`, `## U1`, `## U2`, `## Review`). Fix mecánico, sin cambio de contenido ni de decisiones. |

### Summary

El resto del contenido de la etapa es sólido: los 2 Units (U1 backend/U2 frontend) son consistentes en nombre entre `unit-of-work.md`, el edge block de `unit-of-work-dependency.md` y `unit-of-work-story-map.md`; el DAG U2→U1 es acíclico y bien formado (`edge_block: ok`); las 3 historias de `stories.md` (US1.1-US1.3) están cubiertas en `traceability.json` con targets válidos y mapeados en el story-map; los 4 FR y 4 NFR de `requirements.md` aparecen cubiertos entre las responsabilidades de U1/U2; la decisión de decomponer por deployable de construcción (no por componente de dominio) es consistente con ADR-001 de `decisions.md` y no reintroduce un componente de dominio nuevo; y la nota de omisión del bloque Step 3-4 en `units-generation-questions.md` está bien evidenciada (cita `components.md`, precedente de `260829-auth-navigation-refactor` documentado en `project.md`). El único hallazgo era mecánico y acotado a un solo archivo — corregido con un cambio trivial de nivel de encabezado, sin tocar contenido ni decisiones.
