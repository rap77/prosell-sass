# Functional Spec — u2-cross-org-export-ui

Unit `kind: ui` — este archivo es autocontenido (sin `entities.md`/
`rules.md`, per `produces_kinds` del stage file). Fuente:
`refined-mockups/mockups.md`, `refined-mockups/interaction-spec.md`,
`contract-summary.md`, `unit-of-work.md`, `unit-of-work-story-map.md`,
`requirements.md`.

## Workflow 1 — Elegir organización en el picker (US1, US2, US5.1)

```
1. Ana abre el picker (OrganizationPicker.tsx) → useOrganizations() trae la lista, filtrada client-side por product_count > 0 (US1.2)
2. El picker renderiza: "Mi organización" (siempre primera) → separador → "Todas las organizaciones" (ícono Layers, SOLO si isAdmin) → separador → organizaciones puntuales con badge de product_count
3. Ana elige una opción → organizationStore.setViewingOrgId(value)
   - value = null → "mi organización" (default, US2.2)
   - value = "<uuid>" → organización puntual
   - value = "ALL_ORGS" (sentinel) → todas las organizaciones (US2.1, SOLO si permiso ORG_ADMIN_VIEW_ALL — setViewingOrgId ya es no-op sin permiso, comportamiento existente)
4. catalog/page.tsx observa viewingOrgId (useEffect o selector de store) → recalcula apiFilters.organization_id per el contrato de integración de contract-summary.md:
   - viewingOrgId === null → apiFilters.organization_id = <mi propia organización> (EXPLÍCITO, nunca omitido — evita heredar el "todas" implícito de list_products para admins)
   - viewingOrgId === "<uuid>" → apiFilters.organization_id = "<uuid>"
   - viewingOrgId === "ALL_ORGS" → apiFilters.organization_id = undefined (omitido)
5. useInfiniteProducts(apiFilters, 50) refetch dispara con el nuevo filtro (US3.1, US3.2)
6. La grilla de /catalog se actualiza con los productos del filtro activo
```

### Estados (derivados de refined-mockups/mockups.md M1, M2)

Ver `refined-mockups/mockups.md` M1 (picker: loading/empty/error/sin-permiso) y M2 (grilla: loading/empty/error/todas-las-organizaciones) — sin cambios adicionales de estado en esta etapa.

### Resolución de Open Question #3 de `requirements.md` (paginación/orden en modo "todas")

`requirements.md` (FR3.2, Open Question #3) diferío explícitamente a
esta etapa el comportamiento de paginación/orden de la grilla cuando
`viewingOrgId === "ALL_ORGS"`. Resolución: **sin comportamiento
especial** — `useInfiniteProducts(apiFilters, 50)` sigue paginando de a
50 productos exactamente igual que para cualquier otro filtro, y el
orden es el mismo orden por defecto que el backend ya retorna hoy (sin
un `ORDER BY` explícito por organización). No hay agrupación visual por
organización en la grilla — decisión de bajo riesgo, consistente con
"sin filtro adicional" ya declarado en Workflow 1 paso 6 y sin
contradecir ningún mockup (M2 no muestra agrupación por organización).

## Workflow 2 — Export con confirmación reforzada para "todas" (US4.1, US5.1)

```
1. Ana hace click en "Exportar catálogo"
2. resolveExportOrganization(viewingOrgId, viewingOrganizationName) determina el tipo de banner:
   - viewingOrgId === null → {kind: "own"}
   - viewingOrgId === "<uuid>" → {kind: "cross-org", name: viewingOrganizationName}
   - viewingOrgId === "ALL_ORGS" → {kind: "all-orgs", count: N} (N = organizaciones con product_count > 0, del mismo listado ya cargado por el picker — US5.1, AC5.1.1)
3. ExportSummaryBanner renderiza según el tipo (ver refined-mockups/mockups.md M3)
4. Ana confirma "Continuar" → isExporting = true → banner muestra estado "exporting-all"/"exporting-single" (Q2 de refined-mockups)
5. Se dispara la secuencia de 3 popups (Workflow 3)
```

## Workflow 3 — Secuencia de popups y llamado a la API (US8, US9)

Orden fijo, per `refined-mockups/mockups.md` M4: archivo → carpeta base → grupos de Facebook. Cualquier cancelación (`null`) aborta el flujo completo sin disparar el export (AC8.1.2, AC9.1.2, AC9.1.3).

```
1. filename = window.prompt("Nombre del archivo:", <default existente>)
   → si null: FIN (no exportar)
2. baseFolder = window.prompt("Carpeta base de imágenes:", "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/")
   → si null: FIN (no exportar)
3. facebookGroupsFallback = window.prompt("Grupos de Facebook (separados por coma):", "1,2,3")
   → si null: FIN (no exportar)
4. exportCatalogClientFormat({
     organizationId: viewingOrgId es "<uuid>" ? viewingOrgId : undefined,
     allOrganizations: viewingOrgId === "ALL_ORGS",
     baseFolder,
     facebookGroupsFallback,
   })
   — mapea a la request real per contract-summary.md Contract 2:
     GET /export-client-format.zip?[organization_id=<uuid>|all_organizations=true]&base_folder=...&facebook_groups_fallback=...
5. Manejo de respuesta:
   - 200: descarga el ZIP (comportamiento ya existente)
   - 403: toast "No tenés permiso para exportar todas las organizaciones" (o el mensaje ya existente para cross-org puntual)
   - 404: toast "No hay productos publicados para exportar" (comportamiento ya existente)
   - 413: toast "El catálogo supera el límite de productos permitido" (comportamiento ya existente)
   - fallo de red (fetch rechazado): catch con toast de error genérico (mandate Q6, ya afirmado — hallazgo de `260903-catalog-client-export`)
```

## Casos de borde (ya fijados en stories.md, referenciados acá para trazabilidad)

| Caso                                                            | Comportamiento                                                                                                  | Fuente           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------- |
| `viewingOrgId` sin selección explícita, Ana tiene permiso admin | Grilla y export resuelven a "mi organización", NUNCA a "todas"                                                  | AC2.2.1          |
| Marcos (sin `ORG_ADMIN_VIEW_ALL`)                               | No ve la opción "Todas las organizaciones" en ningún selector; grilla siempre filtrada a su propia organización | AC2.1.2, AC3.3.1 |
| Confirmar carpeta base, cancelar grupos FB                      | Export NO se dispara (igual que cancelar cualquier popup)                                                       | AC9.1.3          |

## Resumen de interacción (derivado de refined-mockups/interaction-spec.md)

Ver `refined-mockups/interaction-spec.md` para el detalle completo de
estados/accesibilidad de `OrganizationPicker`, `CatalogGrid`
(extensión) y `ExportSummaryBanner` (extensión) — sin cambios
adicionales de accesibilidad en esta etapa.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-12T18:37:53Z
**Iteration:** 1

### Correcciones aplicadas antes de este veredicto

| #   | Ubicación                                              | Corrección mecánica                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `traceability.json`, AC2.1.2                           | El artefacto marcaba AC2.1.2 como cubierto por U2 apuntando a un paso de `functional-spec.md` que en realidad describe AC2.1.1 (ocultación de la opción en la UI). Per `unit-of-work-story-map.md` § Historias cross-cutting, AC2.1.2 ("rechazo de permiso a nivel de use case") es responsabilidad explícita de **u1-cross-org-export-api**, no de esta unit. Corregido el `target` para citar la unit responsable real, siguiendo el mismo patrón ya establecido en `project.md` para NFRs cross-unit (N/A citando el ID/unit que realmente lo cubre, en vez de forzar una cobertura ficticia). |
| 2   | `functional-spec.md`, nueva subsección bajo Workflow 1 | `requirements.md` (FR3.2, Open Question #3) difería explícitamente a esta etapa el comportamiento de paginación/orden de la grilla en modo "todas las organizaciones" — `mockups.md` reconfirmó ese diferimiento a Functional Design, pero ni `functional-design-questions.md` ni `functional-spec.md` lo resolvían. Es una decisión de bajo riesgo sin trade-off genuino (reusar el mecanismo de paginación ya existente, sin ordenamiento especial por organización), así que se resolvió directo en el artefacto sin escalar pregunta nueva al humano.                                         |

Ninguna corrección cambia el comportamiento diseñado en `mockups.md`/`interaction-spec.md`/`contract-summary.md` — son correcciones de trazabilidad correcta entre Units y de una decisión de bajo riesgo explícitamente diferida a esta etapa.

### Verificación de los 5 puntos de la dispatch

1. **Regla de integración Contract 1 (`organization_id` siempre explícito por defecto)**: VERIFICADA. `functional-spec.md` Workflow 1 paso 4 implementa exactamente los 3 casos del bloque `consumer_contract` de `contract-summary.md` (`viewingOrgId===null` → `organization_id` = propia organización EXPLÍCITO; `"<uuid>"` → mismo uuid; `"ALL_ORGS"` → omitido) — sin desviación. `frontend-components.md` § CatalogGrid repite la misma regla en un snippet TS (`viewingOrgId ?? myOrganizationId`, nunca omitido en el caso default) — consistente en ambos artefactos. Es el punto más sutil del diseño y está correctamente resuelto en los dos lugares donde aparece.
2. **Orden y cancelación de los 3 popups (Workflow 3 vs mockups.md M4)**: VERIFICADO — mismo orden exacto (archivo → carpeta base → grupos de Facebook) y misma regla de cancelación (`null` en cualquiera aborta el flujo completo, AC8.1.2/AC9.1.2/AC9.1.3) en ambos artefactos, sin contradicción.
3. **Naming camelCase TS**: VERIFICADO — `frontend-components.md` usa `organizationId`, `viewingOrgId`, `baseFolder`, `facebookGroupsFallback`, `allOrganizations` en todo el TS embebido; la conversión a `organization_id` (snake_case) ocurre recién en el punto de armado del query param hacia el backend, tal como exige `team-practices.md` § Code Style. Verificado además contra el código real: `organizationStore.ts` líneas 360-366 confirman que el no-op de permiso (`setViewingOrgId`) es agnóstico al valor de `orgId` — cubre el sentinel `"ALL_ORGS"` nuevo sin cambios, tal como afirma `frontend-components.md` línea 26.
4. **Cobertura de `traceability.json` (15 ACs)**: las 15 ACs de `upstream_ids` cubren exactamente las 10 historias asignadas a U2 en `unit-of-work-story-map.md` (incluyendo las 2 cross-cutting US2.1/US2.2), todas con `status: "N/A"` apuntando a una sección real de `functional-spec.md`/`frontend-components.md` — correcto para Unit kind `ui` sin `rules.md`, salvo el error de atribución cross-unit en AC2.1.2 ya corregido (hallazgo #1).
5. **Manejo de errores (403/404/413/red) vs mandate Q6**: VERIFICADO — Workflow 3 paso 5 cubre los 4 casos (200/403/404/413/fallo de red con `catch` genérico), y `frontend-components.md` § ExportSummaryBanner cita explícitamente el reuso de `extractErrorMessage()` (precedente confirmado en `260903-catalog-client-export`) en vez de un parser ad-hoc — consistente con el mandate y con el aprendizaje ya persistido en `project.md`.

### Validation Tool Results

No se listan validation tools para esta etapa (Functional Design, Unit kind `ui`) en la definición del stage. Verificación hecha por lectura cruzada manual de los 4 artefactos de la unit contra los 5 contratos compartidos pasados, más una verificación puntual contra el código real (`apps/web/src/stores/organizationStore.ts` líneas 355-375) para confirmar la cita de línea de `frontend-components.md`.

### Summary

El diseño es implementable sin ambigüedad para Code Generation: la regla más sutil (organization_id explícito por defecto para no heredar el "todas" implícito de `list_products`) está correctamente resuelta y duplicada de forma consistente en los dos artefactos que la necesitan, el orden y la cancelación de los 3 popups calzan exactos con el mockup aprobado, el naming respeta la convención de equipo, y el manejo de errores reutiliza el precedente ya establecido. Se corrigieron dos gaps objetivos antes de este veredicto: una atribución cross-unit incorrecta en `traceability.json` (AC2.1.2 es responsabilidad de U1, no de U2) y una Open Question de `requirements.md` explícitamente diferida a esta etapa que no había sido resuelta (paginación/orden de la grilla en modo "todas").
