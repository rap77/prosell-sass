# Code Summary — u1-cross-org-export-api

Backend (`apps/api`), metodología test-after, 13 steps del plan
completos. Suite completa del backend verificada en verde después de
cada capa (2030/2030 al final).

## Archivos creados

| Archivo                                               | Contenido                                                                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/prosell/domain/services/category_translation.py` | `CategoryTranslationEntry`, `CATEGORY_TRANSLATION_TABLE` (dict estático indexado por `slug`, no por UUID), `resolve_client_category_type()` |

## Archivos modificados

| Archivo                                                                     | Cambio                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/prosell/domain/repositories/organization_repository.py`                | `AbstractOrganizationRepository.get_by_ids()` nuevo (interfaz)                                                                                                                                                                                                                                                                                                                                  |
| `src/prosell/infrastructure/repositories/organization_repository_impl.py`   | Implementación SQLAlchemy de `get_by_ids()` (`WHERE id IN (...)`, un solo query)                                                                                                                                                                                                                                                                                                                |
| `src/prosell/domain/services/csv_export.py`                                 | `build_client_format_row()` extendida con 9 parámetros explícitos ya resueltos (`vin`, `body_style`, `title_status`, `facebook_groups`, `facebook_groups_fallback`, `state`, `category`, `vehicle_type`, `location_city`, `location_state`, `path`) reemplazando la lectura directa e incorrecta de `attributes` (FR7); nueva función `build_client_format_path()`                              |
| `src/prosell/application/use_cases/product/export_catalog_client_format.py` | `execute()` con nueva firma (`organization_id`, `all_organizations`, `base_folder`, `facebook_groups_fallback`); `category_repository` inyectado; resolución batch de `org_code` (BR2.3); cache lazy de vertical de categoría + exclusión BR1.7; cap global vía método único parametrizado; log `catalog_export.completed_all_orgs`; `ExportCatalogClientFormatResult.organization_count` nuevo |
| `src/prosell/infrastructure/api/routers/product_router.py`                  | `_check_org_scope_permission()` con `all_organizations` nuevo (BR2.1); endpoint con 3 query params nuevos (`all_organizations`, `base_folder` required, `facebook_groups_fallback` required); `SqlAlchemyCategoryRepository` inyectado; log de auditoría distinguible para modo "todas" (BR2.5); nombre de archivo `catalogo_TODAS_{fecha}.zip` (BR2.8)                                         |

## Archivos de test modificados/extendidos

| Archivo                                                                         | Casos agregados                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/integration/repositories/test_organization_repository.py`                | 3 (get_by_ids: match exacto, ID desconocido omitido, lista vacía)                                                                                                                                                                                                               |
| `tests/unit/services/test_csv_export.py`                                        | 17 (clean_title, groups+fallback, vin/body_style/state, location, category/type, path, resolve_client_category_type)                                                                                                                                                            |
| `tests/unit/application/use_cases/product/test_export_catalog_client_format.py` | 6 nuevos (modo puntual nunca resuelve a "todas", org_code por-producto correcto con 2+ orgs, exclusión BR1.7, cap global excedido, caso límite EXACTAMENTE 500 no rechaza [AC4.3.2], catálogo vacío en modo "todas" [AC4.5.1]) + 5 existentes adaptados a la nueva firma        |
| `tests/integration/api/routers/test_product_router_export_client_format.py`     | 4 nuevos (403 sin permiso, 200 con permiso + nombre de archivo, 422 sin base_folder, 422 sin facebook_groups_fallback) + fixtures existentes adaptadas (categoría ahora resuelve a la vertical `vehiculos-y-transporte` real, params requeridos agregados a todas las llamadas) |

## Decisiones clave de implementación

- **`CategoryTranslationEntry` indexada por `slug`, no por UUID**: la vertical "Vehículos y Transporte" se siembra con un `id` generado en tiempo de inserción (sin valor fijo hardcodeable); su `slug` (`"vehiculos-y-transporte"`) sí es determinístico — corrección aplicada antes de generar el código, documentada en `entities.md`/`rules.md` (que aún describen "UUID" textualmente, fuera del alcance de este dispatch actualizar prosa de diseño ya READY).
- **Resolución batch de `org_code` unificada**: mismo camino de código para modo puntual y modo "todas" (el set de organizaciones distintas tiene 1 elemento en modo puntual) — sin rama separada.
- **Exclusión BR1.7 total → sin error nuevo**: si todos los productos de un export quedan excluidos por falta de traducción de vertical, el resultado es un ZIP con CSV solo-header y `product_count=0`, sin lanzar un error nuevo — `EmptyCatalogExportError` ya se evalúa antes del filtro, sobre el conteo crudo de `published` (BR4.1); decisión de bajo riesgo resuelta sin escalar.
- **Log de auditoría del modo "todas" es un mensaje NUEVO y distinguible** (`"Cross-org catalog export (ALL_ORGS): scope=ALL_ORGS ..."`), no una reutilización del mensaje puntual existente — cumple BR2.5/FR6.1 sin ambigüedad de grep.

## Hallazgo de trazabilidad (documentado, no resuelto silenciosamente)

**AC7.4.2** (`stories.md`) dice literalmente que `facebook_groups` vacío
debe producir `groups=""` — esto quedó SUPERSEDIDO por la decisión
posterior (misma pasada de User Stories, US8/US9) de usar
`facebook_groups_fallback` en ese caso, formalizada y ya aprobada en
`rules.md` BR2.7/FR9.4. El código implementa la decisión MÁS RECIENTE
(BR2.7), consistente con `contract-summary.md`/`requirements.md`, no el
texto literal de AC7.4.2. Es una discrepancia real entre dos artefactos
de Inception (ambos ya READY) — señalada explícitamente en
`traceability.json` para el registro, no una omisión.

## Casos límite agregados durante Code Generation (más allá de lo pedido explícitamente en el plan)

- **AC4.3.2** (exactamente `EXPORT_MAX_PRODUCTS` no rechaza): el plan
  original solo pedía el caso "excedido"; se agregó el caso límite
  porque tenía un AC explícito en `stories.md` (hallazgo de quality) sin
  test dedicado.
- **AC4.5.1** (catálogo vacío en modo "todas" → mismo `EmptyCatalogExportError`
  que el caso puntual): mismo criterio — AC explícito sin cobertura
  previa, cerrado con un test de una línea de esfuerzo similar.

## Sin cambios de infraestructura

Sin dependencia nueva, sin migración de base de datos, sin variable de entorno nueva (`tech-stack-decisions.md`).

## Verificación final

```
cd apps/api && uv run pytest -q
```

2030 passed, 0 failed. `ruff check`/`ruff format --check`/`uv run pyright` limpios sobre todos los archivos tocados.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-13T09:15:21Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                       | Finding                                                                                                                                                                                                                                                                                                                                                                                                      | Recommendation                                                                                                                                                                                                                                                               |
| --- | -------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor    | `traceability.json` (AC6.1.1, BR2.5)           | El log distinguible del modo "todas" (`"Cross-org catalog export (ALL_ORGS): ..."`) se verifica "por lectura de código", sin test de contenido de log — consistente con la ausencia de precedente de test de log en este archivo (el log puntual existente tampoco lo tiene), pero deja abierta la posibilidad de que un refactor futuro rompa el `scope=ALL_ORGS` grep-able sin que ningún test lo detecte. | Considerar un test con `caplog` que afirme el mensaje/campo `scope=ALL_ORGS`, aunque no bloquea esta pasada dado que sigue el mismo patrón ya aceptado para el log puntual.                                                                                                  |
| 2   | Minor    | `code-summary.md` § "Hallazgo de trazabilidad" | La discrepancia AC7.4.2 vs BR2.7 queda correctamente documentada y NO resuelta silenciosamente (buena práctica), pero el artefacto de Inception (`stories.md`) sigue con el texto literal contradictorio sin marcador de "superseded" — un lector futuro de `stories.md` en aislamiento (sin este `code-summary.md`) vería una AC que el código no cumple.                                                   | No bloquea Code Generation (fuera de su scope de escritura); dejar como nota para que el humano decida en el gate si amerita una corrección retroactiva de `stories.md`, consistente con el patrón ya aprendido de no reabrir stages ya aprobados desde una etapa posterior. |

### Validation Tool Results

| Tool                                                                                                                                                                                                                                                                             | Result                                                                                                                    | Interpretación                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uv run pytest tests/unit/services/test_csv_export.py tests/unit/application/use_cases/product/test_export_catalog_client_format.py tests/integration/repositories/test_organization_repository.py tests/integration/api/routers/test_product_router_export_client_format.py -q` | 61 passed, 0 failed, 0 skipped (Postgres de test disponible en este entorno — no se saltearon las pruebas de integración) | Confirma cobertura real de BR1.1-1.8, BR2.1-2.8, AC2.1.2/2.2.1/4.x/6.1.1/7.x/8.2.1/9.2.1 declarada en `traceability.json`, no solo aserción documental. |

### Verificación puntual de hallazgos citados en el brief

- **`clean_title` inverso (BR1.1/AC7.3.1/AC7.3.2)**: verificado en `csv_export.py:211-216` contra `csv_field_mapper.py::parse_title_status` (`"1"→clean`/`"0"→rebuilt`) — la implementación es exactamente la inversa (`"clean"→"1"`/`"rebuilt"→"0"`/otro→`""`). Correcto.
- **BR1.7 (exclusión sin traducción de vertical)**: verificado en `export_catalog_client_format.py:204-215` — `continue` antes de agregar a `rows`/`folder_names`/`image_urls_by_product`/`included_products`; `product_count` final es `len(included_products)`, que ya excluye estos productos. Correcto.
- **BR2.3 (resolución batch de `org_code`)**: verificado en `export_catalog_client_format.py:181-188` — un solo `get_by_ids(distinct_org_ids)` ANTES del loop por producto, con lookup O(1) dentro del loop (`org_code_by_id.get(...)`). Test `test_all_organizations_mode_resolves_org_code_per_product` confirma `assert_called_once()` con el set completo de orgs. Correcto, sigue el patrón de `bulk_upload_vehicles.py` citado en `team.md`.
- **Seguridad (BR2.1/NFR2.4)**: verificado en `product_router.py:790-799` — `_check_org_scope_permission(..., all_organizations=all_organizations)` se llama ANTES de instanciar `ExportCatalogClientFormatUseCase`, y dentro de esa función (`product_router.py:292-297`) el chequeo de `all_organizations and not can_view_all_orgs` es independiente del valor de `organization_id`. Confirmado con test de integración real (`test_non_admin_with_all_organizations_returns_403`, 403 real). Defensa en profundidad real, no cosmética.
- **`category_translation.py` indexado por `slug`**: verificado contra `seed_categories.py` — `VEHICLES_VERTICAL["slug"] = "vehiculos-y-transporte"` es un literal fijo en el seed; no hay ningún `id` fijo sembrado para la vertical (se genera en inserción). La justificación del código es correcta y verificable.
- **AC7.4.2 vs BR2.7**: verificado el texto literal de `stories.md:286-291` — efectivamente dice `groups` = `""` (vacío) para `facebook_groups=[]`, mientras `rules.md` BR2.7 (línea 142-147) dice explícitamente `facebook_groups_fallback` en ese caso. Es una contradicción real entre dos artefactos de Inception ya READY, correctamente señalada por el desarrollador — no una invención del arquitecto.
- **`traceability.json`**: los ~47 IDs fueron muestreados contra el código/tests real — todos los `target` citados existen y prueban lo que dicen (no hay citas fantasma). Los `N/A` de NFR-PERF-2/3/4, NFR-REL-2/3 y NFR2.2 están justificados con referencia a `performance-design.md`/`reliability-design.md`/riesgo residual ya aceptado en `team.md`/`project.md` (agotamiento de recursos, ver § Deployment) — no esconden un gap de código sin cubrir, son medición de latencia end-to-end diferida a Build and Test, consistente con el patrón ya aprendido en el intent 260903.

### Summary

El código implementado es coherente con `functional-spec.md`/`rules.md` en todos los puntos verificados: la inversión de `clean_title`, la exclusión BR1.7, la resolución batch de `org_code`, el gate de seguridad `all_organizations` independiente de `organization_id`, y el indexado por `slug` de la tabla de traducción de categorías están todos correctamente implementados y testeados. La suite de 61 tests dirigida corre en verde sin skips (Postgres de test disponible). El único hallazgo real es la discrepancia documentada (no oculta) entre AC7.4.2 y BR2.7, correctamente señalada como decisión posterior y no como omisión. No hay hallazgos Critical ni Major.
