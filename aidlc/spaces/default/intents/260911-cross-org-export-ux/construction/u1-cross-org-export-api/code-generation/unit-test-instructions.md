# Unit Test Instructions — u1-cross-org-export-api

Test Strategy: **Standard** (5-8 tests por componente + integración en
boundaries clave), scope `classic` (sin piso adicional más allá de la
estrategia — mantener la suite existente verde).

## Framework y comando exacto (scoped a esta Unit)

```bash
cd apps/api && uv run pytest \
  tests/unit/services/test_csv_export.py \
  tests/unit/application/use_cases/product/test_export_catalog_client_format.py \
  tests/integration/repositories/test_organization_repository.py \
  tests/integration/api/routers/test_product_router_export_client_format.py \
  -v
```

Este comando corre ANTES del primer test-first (verificación del
runner, Step 1 del plan) y después de cada capa implementada — nunca
`pytest` a secas (correría la suite completa del proyecto).

## Piso mínimo de tests para este Unit (afirmado en Practices Discovery, team.md)

1. **Regresión de valor para `clean_title`/`groups`** —
   `title_status="clean"→"1"`, `"rebuilt"→"0"`; `facebook_groups=["A","B"]→"A,B"`,
   vacío→fallback. `tests/unit/services/test_csv_export.py`.
2. **Regresión negativa del comportamiento por defecto** — sin
   `all_organizations`/`organization_id`, resuelve a la organización
   propia, nunca a "todas"; usuario sin `ORG_ADMIN_VIEW_ALL` rechazado
   con 403 aun invocando el endpoint directamente.
   `tests/unit/application/use_cases/product/test_export_catalog_client_format.py`
   - `tests/integration/api/routers/test_product_router_export_client_format.py`.
3. **Resolución de `org_code` por-producto** — cada producto en el
   resultado usa el `org_code` de SU PROPIA organización, no la de la
   primera resuelta en el loop.
   `tests/unit/application/use_cases/product/test_export_catalog_client_format.py`.

(Los puntos 4-6 del piso de equipo — filtrado de grilla, filtro del
picker, wiring de popups — pertenecen a `u2-cross-org-export-ui`, no a
este Unit backend.)

## Cobertura adicional (Standard, más allá del piso mínimo)

- `resolve_client_category_type()` (`category_translation.py`): entrada
  conocida → tupla correcta; vertical sin entrada → `None`.
- `AbstractOrganizationRepository.get_by_ids()`: set de 2+ IDs → lista
  exacta; ID inexistente → omitido sin error.
- Producto sin traducción de vertical (BR1.7): excluido del CSV/ZIP
  resultante (sin fila, sin carpeta).
- Cap global excedido en modo "todas": `ExportLimitExceededError`
  (413 en el router).
- `build_client_format_path()`: concatenación exacta
  `base_folder + org_code + carpeta`.

## Mocking/stubbing

Sigue el patrón ya vigente de `test_export_catalog_client_format.py`
(fakes/mocks de `AbstractProductRepository`/`AbstractOrganizationRepository`/`IDOSpacesService`
inyectados por constructor) — agregar un fake de `AbstractCategoryRepository`
con el mismo criterio para los tests nuevos de walk-up/exclusión.

## Test data

Reusa los builders/fixtures ya existentes de `Product`/`Organization` en
`tests/utils/test_data_manager.py` y los fixtures locales de
`test_export_catalog_client_format.py` — sin fixture nuevo de gran
escala, solo variaciones puntuales de `attributes`/`category_id`.

## Coverage target

Sin piso de cobertura nuevo (backend sin piso enforced per `team.md`) —
la suite existente permanece verde y los 6 puntos del piso mínimo del
equipo (1-3 aplicables a este Unit) quedan cubiertos explícitamente.
