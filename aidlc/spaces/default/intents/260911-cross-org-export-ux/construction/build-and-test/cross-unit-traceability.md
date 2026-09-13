# Cross-Unit Final Coverage Gate — 260911-cross-org-export-ux

**Veredicto: PASS.** Los 31 AC de `stories.md` y los 9 grupos de FR +
4 NFR de `requirements.md` están cubiertos con `OK` en al menos un
`traceability.json` de Code Generation (stage-level: ninguno, solo
per-unit — `u1-cross-org-export-api` y `u2-cross-org-export-ui`), con
target en un archivo/test real existente. Sin gaps.

## FR/NFR (`inception/requirements-analysis/requirements.md`) → AC (`inception/user-stories/stories.md`) → Unit

| FR/NFR                           | AC(s) mapeados                                                         | Unit(s)                                                             | Estado                          |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| FR1.1, FR1.2                     | AC1.1.1, AC1.2.1, AC1.2.2                                              | u2                                                                  | OK                              |
| FR2.1, FR2.2                     | AC2.1.1, AC2.1.2, AC2.2.1                                              | u1 (AC2.1.2 via BR2.1/AC4.4.1), u2                                  | OK                              |
| FR3.1, FR3.2, FR3.3              | AC3.1.1, AC3.2.1, AC3.3.1                                              | u2                                                                  | OK                              |
| FR4.1, FR4.2, FR4.3, FR4.4       | AC4.1.1, AC4.2.1, AC4.3.1, AC4.3.2, AC4.4.1, AC4.5.1                   | u1                                                                  | OK                              |
| FR5.1                            | AC5.1.1                                                                | u2                                                                  | OK                              |
| FR6.1                            | AC6.1.1                                                                | u1                                                                  | OK                              |
| FR7.1–FR7.6                      | AC7.1.1, AC7.2.1, AC7.3.1, AC7.3.2, AC7.4.1, AC7.4.2, AC7.5.1, AC7.6.1 | u1                                                                  | OK                              |
| FR8.1–FR8.4                      | AC8.1.1, AC8.1.2, AC8.2.1                                              | u1 (AC8.2.1: `build_client_format_path`), u2 (AC8.1.1/8.1.2: popup) | OK                              |
| FR9.1–FR9.4                      | AC9.1.1, AC9.1.2, AC9.1.3, AC9.2.1                                     | u1 (AC9.2.1), u2 (AC9.1.x)                                          | OK                              |
| NFR1 (auditoría)                 | AC6.1.1                                                                | u1                                                                  | OK                              |
| NFR2 (autorización)              | AC4.4.1                                                                | u1                                                                  | OK                              |
| NFR3 (recursos, riesgo aceptado) | —                                                                      | u1 (`NFR-REL-3` N/A, riesgo documentado)                            | OK (riesgo aceptado, no un gap) |
| NFR4 (testabilidad, piso mínimo) | —                                                                      | u1 + u2 (6 puntos del piso de equipo, todos con test dedicado)      | OK                              |

## AC (`inception/user-stories/stories.md`) → target real

| AC      | Status | Unit   | Target                                                                                                                                                                                                                                                             |
| ------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1.1.1 | OK     | u2     | `OrganizationPicker.tsx` (ítem "Todas las organizaciones")                                                                                                                                                                                                         |
| AC1.2.1 | OK     | u2     | `OrganizationPicker.tsx` (filtro `product_count > 0`)                                                                                                                                                                                                              |
| AC1.2.2 | OK     | u2     | `OrganizationPicker.tsx` (`?? 0` cubre ausente)                                                                                                                                                                                                                    |
| AC2.1.1 | OK     | u2     | `OrganizationPicker.tsx` (ítem condicionado a `isAdmin`)                                                                                                                                                                                                           |
| AC2.1.2 | OK     | u1     | `product_router.py::_check_org_scope_permission` (403 real, `TestExportClientFormatAllOrganizations`)                                                                                                                                                              |
| AC2.2.1 | OK     | u1, u2 | `export_catalog_client_format.py` (tenant_filter); `catalog/page.tsx` (apiFilters.organization_id nunca omitido)                                                                                                                                                   |
| AC3.1.1 | OK     | u2     | `catalog/page.tsx` + `products.ts` (organization_id → `useInfiniteProducts`)                                                                                                                                                                                       |
| AC3.2.1 | OK     | u2     | `organizationStore.ts` (sentinel `ALL_ORGS`)                                                                                                                                                                                                                       |
| AC3.3.1 | OK     | u2     | `OrganizationPicker.tsx` + `organizationStore.ts` (sin permiso: opción oculta + no-op)                                                                                                                                                                             |
| AC4.1.1 | OK     | u1     | `export_catalog_client_format.py` (`all_organizations=True`)                                                                                                                                                                                                       |
| AC4.2.1 | OK     | u1     | `export_catalog_client_format.py` (`org_code_by_id` batch)                                                                                                                                                                                                         |
| AC4.3.1 | OK     | u1     | `export_catalog_client_format.py` (cap global excedido)                                                                                                                                                                                                            |
| AC4.3.2 | OK     | u1     | `export_catalog_client_format.py` (exactamente el límite no rechaza)                                                                                                                                                                                               |
| AC4.4.1 | OK     | u1     | `product_router.py` (403 directo sin UI)                                                                                                                                                                                                                           |
| AC4.5.1 | OK     | u1     | `export_catalog_client_format.py` (catálogo vacío en modo "todas")                                                                                                                                                                                                 |
| AC5.1.1 | OK     | u2     | `catalog/page.tsx` (`resolveExportOrganization` → conteo N)                                                                                                                                                                                                        |
| AC6.1.1 | OK     | u1     | `product_router.py` (log distinguible `scope=ALL_ORGS`)                                                                                                                                                                                                            |
| AC7.1.1 | OK     | u1     | `csv_export.py` (`vin`)                                                                                                                                                                                                                                            |
| AC7.2.1 | OK     | u1     | `csv_export.py` (`body_style`)                                                                                                                                                                                                                                     |
| AC7.3.1 | OK     | u1     | `csv_export.py` (`clean_title`, "clean"→"1")                                                                                                                                                                                                                       |
| AC7.3.2 | OK     | u1     | `csv_export.py` (`clean_title`, "rebuilt"→"0")                                                                                                                                                                                                                     |
| AC7.4.1 | OK     | u1     | `csv_export.py` (`groups`, join con coma)                                                                                                                                                                                                                          |
| AC7.4.2 | OK     | u1     | `csv_export.py` (`groups` vacío → fallback, BR2.7 — ver nota de discrepancia con el texto literal de AC7.4.2 ya documentada en `u1/code-generation/traceability.json` y `code-summary.md`; el código sigue la decisión MÁS RECIENTE aprobada, no el texto literal) |
| AC7.5.1 | OK     | u1     | `category_translation.py` (`resolve_client_category_type`)                                                                                                                                                                                                         |
| AC7.6.1 | OK     | u1     | `csv_export.py` (`location`)                                                                                                                                                                                                                                       |
| AC8.1.1 | OK     | u2     | `catalog/page.tsx` (popup carpeta base)                                                                                                                                                                                                                            |
| AC8.1.2 | OK     | u2     | `catalog/page.tsx` (cancelar carpeta base aborta)                                                                                                                                                                                                                  |
| AC8.2.1 | OK     | u1     | `csv_export.py::build_client_format_path`                                                                                                                                                                                                                          |
| AC9.1.1 | OK     | u2     | `catalog/page.tsx` (popup grupos de Facebook)                                                                                                                                                                                                                      |
| AC9.1.2 | OK     | u2     | `catalog/page.tsx` (cancelar grupos aborta)                                                                                                                                                                                                                        |
| AC9.1.3 | OK     | u2     | `catalog/page.tsx` (cancelar grupos aborta aunque carpeta ya confirmada)                                                                                                                                                                                           |
| AC9.2.1 | OK     | u1     | `csv_export.py` (`facebook_groups` propio tiene precedencia sobre fallback)                                                                                                                                                                                        |

## Notas

- **AC7.4.2**: única entrada con una nota de trazabilidad ya documentada
  (no un gap) — discrepancia real entre el texto literal de `stories.md`
  y la decisión posterior BR2.7 de `rules.md`, ambos artefactos de
  Inception ya READY. El código implementa BR2.7 (la decisión más
  reciente y aprobada). Documentado desde Code Generation, no reabierto
  acá.
- **FR3.3** ("fuera de alcance explícito" — otras pantallas admin no
  filtran por `viewingOrgId`) es un límite de alcance, no un requisito
  positivo con target de código — cubierto por la ausencia misma:
  verificado que `review-queue`/otras pantallas admin no importan
  `viewingOrgId` (sin cambios de este intent en esos archivos).
- **NFR3** es un riesgo residual ACEPTADO explícitamente en
  `requirements.md`/`team.md` (agotamiento de memoria en el modo
  "todas") — no requiere mitigación de código en este intent; se marca
  OK en el sentido de "coverage por decisión de producto documentada",
  no de código que lo resuelva.

## Verificación en vivo (este stage)

Todos los targets citados arriba fueron re-verificados en este stage
corriendo la suite completa de ambos stacks (ver `test-results.md`):
2032/2032 backend, 1322/1322 frontend, 0 fallas. Ningún target de esta
tabla apunta a un archivo/test inexistente.
