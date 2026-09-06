# Integration Test Instructions — 260903-catalog-client-export

Test Strategy: **standard** → boundary tests + interacción cross-unit
(no se generan performance/security-test-instructions.md separados —
ver justificación en `build-and-test-summary.md`).

## Boundary 1 — Backend: endpoint real contra DB (u1)

Ya cubierto por Code Generation, re-verificado en vivo en este stage:

```bash
cd apps/api && uv run pytest tests/integration/api/routers/test_product_router_export_client_format.py tests/integration/api/routers/test_product_router_export_csv.py -v
```

Cubre: 200/404/413, aislamiento multi-tenant, Content-Type/Content-Disposition
a nivel FastAPI (sin pasar por el proxy Next.js todavía), regresión del
call site de color en el endpoint genérico existente.

## Boundary 2 — Proxy BFF Next.js → backend (cross-unit real)

**Gap encontrado en este stage** (no en Code Generation): el proxy
genérico `apps/web/src/app/api/v1/products/[...path]/route.ts` ya tenía
la lógica de branching blob-vs-JSON (arreglada en un intent previo para
el bug de `.json()` forzado sobre contenido no-JSON), pero ningún test
ejercitaba esa rama para NINGÚN endpoint binario — ni siquiera el CSV
existente. El piso mínimo del equipo (`team.md`, ítem 3) exige
verificar el contrato Content-Type/Content-Disposition "de punta a
punta a través del proxy BFF, no solo en el backend" para AC1.1.9.

Test agregado en este stage:
`apps/web/src/app/api/v1/products/[...path]/route.test.ts` — nuevo
caso `"passes a ZIP response through as a blob, preserving Content-Type
and Content-Disposition"`. Verifica que la rama `.blob()` (no `.json()`)
se toma para un content-type no-JSON, y que ambos headers sobreviven
el proxy.

```bash
pnpm --filter web vitest run "src/app/api/v1/products/[...path]/route.test.ts"
```

## Boundary 3 — Frontend: componente contra API client mockeado (u2)

Ya cubierto por Code Generation, re-verificado en vivo:

```bash
pnpm --filter web vitest run tests/components/catalog/CatalogPage.test.tsx
```

Cubre: flujo completo del banner de confirmación → prompt →
export, 200/404/413/red, guard de doble-clic, contrato de descarga a
nivel de componente (con `exportCatalogClientFormat` mockeado — el
mock en sí queda validado por el Boundary 2 de arriba).

## Boundary 4 — No cubierto por diseño (fuera de alcance)

No hay un test E2E real (browser + backend real + proxy real) para
este intent — el patrón de test ya vigente en el proyecto para flujos
de descarga de archivo (`export.csv`, `download_bulk_upload_errors_csv`)
tampoco lo tiene; los 3 boundaries de arriba (backend real, proxy real
con mocks de fetch, componente con API mockeada) cadena completa la
prueba sin necesitar Playwright para este feature.

## Cómo correr todo junto

```bash
# Backend
cd apps/api && uv run pytest tests/integration/api/routers/test_product_router_export_client_format.py tests/integration/api/routers/test_product_router_export_csv.py -v

# Frontend (proxy + componente)
pnpm --filter web vitest run "src/app/api/v1/products/[...path]/route.test.ts" tests/components/catalog/CatalogPage.test.tsx
```
