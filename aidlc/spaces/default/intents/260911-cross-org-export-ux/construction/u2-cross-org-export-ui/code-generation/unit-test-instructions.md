# Unit Test Instructions — u2-cross-org-export-ui

Test Strategy: **Standard** (5-8 tests por componente). Contrato de
testing embebido en `code-generation-plan.md`.

## Framework y comandos exactos (scoped a esta Unit)

```bash
pnpm --filter web vitest run tests/components/catalog/CatalogPage.test.tsx
pnpm --filter web vitest run src/components/admin/OrganizationPicker.test.tsx
```

Correr ANTES del primer cambio (baseline) y después de cada capa
implementada — nunca `pnpm test` a secas (correría toda la suite del
proyecto).

## Piso mínimo de tests para este Unit (afirmado en Practices Discovery, team.md)

4. **Wiring del filtrado real de la grilla**: `organization_id`
   (derivado de `viewingOrgId`) llega a `useInfiniteProducts()`, y
   cambiar de organización en el picker dispara un refetch con el
   filtro nuevo. `tests/components/catalog/CatalogPage.test.tsx`.
5. **Filtro del picker por `product_count`**: una organización con
   `product_count: 0` (o ausente) desaparece de la lista.
   `src/components/admin/OrganizationPicker.test.tsx`.
6. **Wiring de los 2 popups nuevos**: un valor no-null en cada popup
   (carpeta base, grupos de Facebook) llega al parámetro correcto del
   llamado de export; `null` (cancelar) en cualquiera de los 3 popups
   no dispara el export. `tests/components/catalog/CatalogPage.test.tsx`.

(Los puntos 1-3 del piso de equipo pertenecen a `u1-cross-org-export-api`,
no a este Unit frontend.)

## Cobertura adicional (Standard, más allá del piso mínimo)

- Labels correctos del picker para las 3 variantes (mi organización /
  todas las organizaciones / organización puntual).
- `organizationStore.setViewingOrgId("ALL_ORGS")` sin permiso es un
  no-op (mismo comportamiento ya cubierto para un UUID puntual).
- `exportCatalogClientFormat()` arma la URL correcta para las 3
  combinaciones de parámetros (propia por defecto, puntual, "todas") y
  siempre incluye `base_folder`/`facebook_groups_fallback`.
- Banner "todas las organizaciones" muestra el conteo N correcto
  (mismo listado ya cargado por `useOrganizations()`, sin request
  nuevo).

## Mocking

Sigue el patrón ya vigente:

- `OrganizationPicker.test.tsx`: `vi.mock` de `@/hooks/useAuth`,
  `@/lib/api/organizations`, `@/stores/organizationStore` — reusar el
  mismo patrón para los casos nuevos, no inventar uno distinto.
- `CatalogPage.test.tsx`: mockear `fetch`/módulos de `products.ts`,
  `window.prompt` (ya hay precedente en el archivo para el popup de
  nombre de archivo existente) — sin red real, sin backend real.

## No hacer

- No backfillear cobertura de código pre-existente no tocado por este
  cambio (ej. flujos de `handleExportCsv`/vista de tabla/estado —
  fuera de alcance de este intent).
- No generar `integration-test-instructions.md` /
  `performance-test-instructions.md` / `security-test-instructions.md`
  — Unit kind `ui` sin NFR de performance/security propio (ya
  confirmado en `nfr-requirements`/`nfr-design` de este Unit).

## Coverage target

Sin piso de cobertura numérico nuevo — el piso real es cualitativo
(los 3 puntos del equipo arriba). La suite existente de
`CatalogPage.test.tsx` (32 tests) y `OrganizationPicker.test.tsx`
permanece verde.
