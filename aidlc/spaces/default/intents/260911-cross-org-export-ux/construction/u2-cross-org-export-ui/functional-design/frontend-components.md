# Frontend Components — u2-cross-org-export-ui

Extiende `refined-mockups/interaction-spec.md` con el detalle de
integración de API y el naming exacto de props que Code Generation
debe usar (camelCase TS, per `team-practices.md` § Code Style).

## Jerarquía de componentes

```
Header.tsx
  └── OrganizationPicker.tsx (extensión)
        - consume: useAuth() (isAdmin), useOrganizations(), useOrganizationStore()

(seller)/catalog/page.tsx (extensión)
  ├── CatalogGrid (interno a page.tsx, extensión)
  │     - consume: useOrganizationStore() (viewingOrgId), useInfiniteProducts(apiFilters, 50)
  └── ExportSummaryBanner (extensión)
        - consume: resolveExportOrganization(), emptyCatalogExportMessage() (helpers ya existentes)
```

## OrganizationPicker.tsx (extensión)

| Prop/Estado                | Tipo                                            | Descripción                                                                                                     |
| -------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `viewingOrgId` (store)     | `string \| "ALL_ORGS" \| null`                  | Extendido con el sentinel `"ALL_ORGS"` — antes solo `string \| null`                                            |
| `setViewingOrgId` (store)  | `(value: string \| "ALL_ORGS" \| null) => void` | Sin cambio de firma externa — el no-op de permiso ya existente (líneas 361-367) cubre también el sentinel nuevo |
| `organizations` (derivado) | `Organization[]`                                | Filtrado client-side: `.filter(o => (o.product_count ?? 0) > 0)` (US1.2)                                        |

**Interacción**: sin cambios en el mecanismo de apertura/cierre del
dropdown — se agrega la opción "Todas las organizaciones" (ícono
`Layers` de lucide-react, per Q1) entre "Mi organización" y las
organizaciones puntuales, con separador visual antes y después (per
`refined-mockups/mockups.md` M1).

**Validación de formulario**: N/A — es un selector, no un formulario.

## CatalogGrid (extensión de `catalog/page.tsx`)

| Prop/Estado                 | Tipo                  | Descripción                                                                                  |
| --------------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| `apiFilters.organizationId` | `string \| undefined` | Derivado de `viewingOrgId` per la regla de integración de `contract-summary.md` (Contract 1) |

**Punto de integración de API** — `GET /api/v1/products`:

```typescript
// Derivación de organizationId, NO omitir cuando viewingOrgId es null
const organizationId =
  viewingOrgId === "ALL_ORGS" ? undefined : (viewingOrgId ?? myOrganizationId); // NUNCA omitido en el caso default
```

Conversión a `organization_id` (snake_case) recién en el punto de
armado del query param hacia el backend, per convención ya afirmada en
`team-practices.md` § Code Style (mismo patrón que otros parámetros de
`products.ts`).

**Validación de formulario**: N/A.

## ExportSummaryBanner (extensión)

| Prop           | Tipo                             | Descripción                                                                                                                            |
| -------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `organization` | `ExportOrganization` (extendido) | `{kind:"own"} \| {kind:"loading"} \| {kind:"cross-org", name: string} \| {kind:"all-orgs", count: number}` — variante `all-orgs` NUEVA |
| `isExporting`  | `boolean`                        | NUEVO — controla el estado de carga distinguible (Q2 de refined-mockups)                                                               |

**Punto de integración de API** — `GET /api/v1/products/export-client-format.zip`:

```typescript
// apps/web/src/lib/api/products.ts — exportCatalogClientFormat() extendido
function exportCatalogClientFormat(params: {
  organizationId?: string;
  allOrganizations?: boolean;
  baseFolder: string;
  facebookGroupsFallback: string;
  filename: string;
}): Promise<Response> {
  /* arma la URL per contract-summary.md Contract 2 */
}
```

Manejo de errores: reutiliza `extractErrorMessage(body, fallback)` ya
existente (`apps/web/src/lib/api/extractErrorMessage.ts`, precedente
confirmado en `260903-catalog-client-export`) para los 3 shapes de
error (403/404/413) — sin parser ad-hoc nuevo.

**Validación de formulario**: N/A — los 3 valores nuevos vienen de
`window.prompt()`, no de un formulario controlado; la única
"validación" es el chequeo de `!== null` ya especificado en
`functional-spec.md` Workflow 3.

## Flujo de interacción end-to-end (referencia visual)

Ver `functional-spec.md` Workflows 1-3 para la secuencia completa
picker → grilla → export → popups → llamado de API.
