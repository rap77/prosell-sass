# Integration Test Instructions — 260911-cross-org-export-ux

Test Strategy: **Standard**. Este archivo cubre los boundaries
cross-unit/cross-stack reales de este intent — la dependencia genuina
entre `apps/api` (u1-cross-org-export-api) y `apps/web`
(u2-cross-org-export-ui) que motivó la nota de `team.md` § Testing
Posture ("la cobertura real cross-stack ocurre recién en push/PR, no en
pre-push local").

## Boundary 1 — `organization_id`/`all_organizations` del frontend al endpoint de export

**Contrato** (`contract-summary.md` Contract 2): el frontend arma
`GET /export-client-format.zip?[organization_id=<uuid>|all_organizations=true]&base_folder=...&facebook_groups_fallback=...`.

- **Lado backend**: `apps/api/tests/integration/api/routers/test_product_router_export_client_format.py`
  ejercita el endpoint real (Postgres de test) para los 3 modos
  (propia/puntual/todas), 403 sin permiso, 422 sin `base_folder`/
  `facebook_groups_fallback`.
- **Lado frontend**: `apps/web/tests/unit/lib/api/products.test.ts`
  verifica que `exportCatalogClientFormat()` arma la URL exacta para
  las 3 combinaciones de parámetros.
- **Ambos lados ya corridos en verde en este stage** — ver
  `test-results.md`. No se agregó un test end-to-end nuevo que levante
  ambos procesos a la vez (fuera de alcance del Test Strategy Standard,
  y el contrato de la URL ya está fijado y testeado por partes en
  ambos lados sin ambigüedad).

## Boundary 2 — `organization_id` del filtrado real de grilla

**Contrato**: `useInfiniteProducts(apiFilters, 50)` con
`apiFilters.organization_id` derivado de `viewingOrgId`, consumido por
`GET /api/v1/products` (comportamiento preexistente de `list_products`,
no tocado por este intent — confirmado en `contract-design/contract-summary.md`
del intent hermano `260911-cross-org-export-ux`: `organization_id`
ausente ya resuelve a "todas" para un usuario `ORG_ADMIN_VIEW_ALL`).

- Cubierto por `apps/web/tests/components/catalog/CatalogPage.test.tsx`
  (describe "CatalogPage — cross-org grid filtering + popups nuevos
  (u2)") para los 3 estados de `viewingOrgId`.
- Sin test de integración nuevo del lado backend — `list_products` no
  fue tocado por este intent, y su comportamiento con
  `organization_id` omitido ya está cubierto por la suite existente
  (verificado, no una asunción nueva).

## Boundary 3 — Proxy BFF de Next.js (blob vs JSON)

**Contrato**: el proxy genérico
`apps/web/src/app/api/v1/products/[...path]/route.ts` debe pasar la
respuesta binaria (ZIP) del backend como blob, nunca forzar
`.json()`.

- Ya cubierto por `apps/web/src/app/api/v1/products/[...path]/route.test.ts`
  (gap cerrado en el intent `260903-catalog-client-export` — el mismo
  proxy genérico atiende el endpoint de export sin cambios de este
  intent, no hace falta un test nuevo por-parámetro).

## Boundary 4 — Resolución batch de `org_code` por-producto (modo "todas")

**Contrato**: cada producto en el ZIP resultante debe aparecer bajo su
PROPIA organización, no la de la primera organización resuelta en el
loop (FR4.2, hallazgo #83 de `code-quality-assessment.md`).

- Cubierto por
  `test_export_catalog_client_format.py::test_all_organizations_mode_resolves_org_code_per_product`
  (2+ organizaciones distintas, cada producto verificado contra SU
  `org_code`).

## Comandos

```bash
# Backend (boundary 1, 4)
cd apps/api
uv run pytest tests/integration/api/routers/test_product_router_export_client_format.py \
  tests/unit/application/use_cases/product/test_export_catalog_client_format.py -q

# Frontend (boundary 1, 2, 3)
cd apps/web
pnpm exec vitest run tests/unit/lib/api/products.test.ts \
  tests/components/catalog/CatalogPage.test.tsx \
  "src/app/api/v1/products/[...path]/route.test.ts"
```

## Resultado

Todos verdes — ver `test-results.md`. Ningún boundary cross-unit quedó
sin cobertura real de ambos lados.
