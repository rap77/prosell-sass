# Unit Test Instructions — u1-export-org-confirmation

Test Strategy: **Standard** (5-8 tests por componente + límites de
comportamiento clave). Scope `classic`: sin piso de test nuevo adicional
más allá de la estrategia seleccionada, y la suite existente debe seguir
en verde. Metodología: **test-after** (implementar la capa, luego
escribir/correr sus tests) — ver `code-generation-plan.md` § Testing
Contract para el bloque completo.

## Framework y configuración

Ya existente, sin cambios: **Vitest** + **Testing Library** (`@testing-
library/react`, `@testing-library/user-event`), configurados en
`apps/web/vitest.config.ts`. Mocks globales de Radix `DropdownMenu` en
`apps/web/tests/setup.tsx` (`data-testid="dropdown-trigger"`,
`role="menuitem"` por item).

## Comando exacto para correr ESTE Unit (scoped, no full-suite)

```bash
pnpm --filter web exec vitest run tests/components/catalog/CatalogPage.test.tsx tests/unit/lib/api/products.test.ts
```

Ejecutar desde la raíz del repo (Turborepo `--filter web` resuelve el
workspace `apps/web`). Verificado runnable antes del primer ciclo
test-after (Step 1 del plan) — el archivo `CatalogPage.test.tsx` ya
existe y ya corre en CI; `products.test.ts` es nuevo pero usa la misma
config de Vitest sin bootstrap adicional.

## Archivos de test

### `apps/web/tests/unit/lib/api/products.test.ts` (nuevo)

Cubre `exportCatalogClientFormat()`. Mockear `global.fetch` con `vi.fn()`
(patrón ya usado en `tests/unit/api/products.test.tsx` para otras
funciones de este mismo módulo — mismo archivo fuente, mismo estilo de
mock, archivo de test separado por convención unit-vs-component ya
existente en el repo: `tests/unit/api/*.test.tsx` y
`tests/unit/lib/api/*.test.ts` coexisten para `products.ts`).

1. Sin `organizationId` → `fetch` se llama con la URL exacta
   `/api/v1/products/export-client-format.zip` (sin query string) y
   `{ credentials: "include" }`.
2. Con `organizationId` (ej. `"org-b"`) → `fetch` se llama con
   `/api/v1/products/export-client-format.zip?organization_id=org-b`.
3. `organizationId` con caracteres que requieren URL-encoding (ej. un
   UUID no lo necesita, pero cubrir el caso genérico con
   `encodeURIComponent` — usar un id con un carácter reservado, ej.
   `"org b"` → `org_id=org%20b`) para no asumir que todo id es
   URL-safe.

### `apps/web/tests/components/catalog/CatalogPage.test.tsx` (extendido)

Agregar un nuevo `describe` bajo el ya existente "CatalogPage — export
catálogo (formato cliente)" (o un describe hermano
"CatalogPage — export cross-org (selector de organización)"), reusando
los mismos helpers (`openExportSummary`, `makeProduct`,
`buildZipResponse`, `buildErrorResponse`) ya definidos en el archivo.

Mocks nuevos a agregar (mismo archivo, arriba de los `describe`
existentes):

```tsx
const mockUseOrganization = vi.fn();
vi.mock("@/lib/api/organizations", () => ({
  useOrganization: (...args: unknown[]) => mockUseOrganization(...args),
}));

let mockViewingOrgId: string | null = null;
vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: (selector: (state: unknown) => unknown) =>
    selector({ viewingOrgId: mockViewingOrgId }),
}));
```

(Mismo patrón selector-consuming mock que `OrganizationPicker.test.tsx`
usa para `useOrganizationStore` — reusar, no inventar uno nuevo, per el
Testing Contract § team.)

En el `beforeEach` de cada describe nuevo: `mockViewingOrgId = null;
mockUseOrganization.mockReturnValue({ organization: undefined });`
(default: propia organización, sin cross-org).

Casos (8 — dentro del rango 5-8 de Standard, cubren los 3 puntos del piso
de equipo del Testing Contract más las 11 AC de `stories.md`):

1. **"no badge y sin `organization_id` cuando `viewingOrgId` es null"**
   — `mockViewingOrgId = null`. Abrir el banner → `queryByTestId
("export-summary-org-badge")` no existe. Confirmar export → `toast
.success`/`anchorClickSpy` en el flujo 200 ya cubierto; el foco de
   este test es `mockExportCatalogClientFormat).toHaveBeenCalledWith
(undefined)` (o sin argumentos). AC1.1.2, AC1.1.6, AC3.1.2.

2. **"badge con el nombre cuando `viewingOrgId` apunta a una org
   resuelta"** — `mockViewingOrgId = "org-b"`;
   `mockUseOrganization.mockReturnValue({ organization: { id: "org-b",
name: "Organización B" } })`. Abrir el banner → `getByText("Exportando
catálogo de: Organización B")`. Confirmar → `mockExportCatalogClient
Format).toHaveBeenCalledWith("org-b")`. AC1.1.1, AC1.1.5.

3. **"badge en skeleton (nunca ausente) cuando el nombre no resolvió
   todavía"** — `mockViewingOrgId = "org-b"`;
   `mockUseOrganization.mockReturnValue({ organization: undefined })`.
   Abrir el banner → `getByTestId("export-summary-org-badge-skeleton")`
   presente Y distinto del caso 1 (el badge contenedor
   `export-summary-org-badge` SÍ está en el DOM, a diferencia del caso
   1 donde no lo está). AC1.1.4 (Major fix — nunca idéntico a "own").

4. **"404 cross-org con nombre resuelto → mensaje con el nombre"** —
   mismo setup que el caso 2, `mockExportCatalogClientFormat
.mockResolvedValue(new Response(null, { status: 404 }))`. Confirmar
   → `toast.error` llamado con `"Organización B no tiene catálogo
publicado para exportar."`. AC2.1.1.

5. **"404 cross-org con nombre NO resuelto (borrada/inaccesible) →
   mensaje fallback genérico"** — mismo setup que el caso 3, 404.
   Confirmar → `toast.error` llamado con exactamente `"Esta
organización no tiene catálogo publicado para exportar."`. Nota
   no-bloqueante de US1 (organización borrada), Q3.

6. **"404 org propia → mensaje genérico existente sin cambios"** —
   `mockViewingOrgId = null`, 404. Confirmar → `toast.error` llamado
   con `"No hay productos publicados para exportar."` (mismo string que
   el test ya existente del archivo — pin de no-regresión). AC2.1.2.

7. **"mismo store, mismo valor — sin mecanismo de estado paralelo"** —
   `mockViewingOrgId = "org-b"` una sola vez; verificar que el
   `organization_id` de la request de export (`toHaveBeenCalledWith
("org-b")`) coincide exactamente con el `viewingOrgId` mockeado, sin
   ningún segundo estado local (`useState`) de organización en el
   componente. AC1.1.3, AC1.1.4 — piso de equipo punto 3.

8. **"sin `viewingOrgId`, cero elementos nuevos relacionados a
   organización en el DOM del flujo completo"** — `mockViewingOrgId =
null`. Recorrer el flujo completo (menú → banner → prompt) y
   verificar `screen.queryByText(/organiza/i)` y
   `screen.queryByTestId("export-summary-org-badge")` ambos `null`.
   AC3.1.1, AC3.1.3 (equivalente observacional al caso "sin permiso",
   ya que `organizationStore.setViewingOrgId` es no-op sin
   `ORG_ADMIN_VIEW_ALL` — verificado ya en
   `organizationStoreViewingOrgId.test.ts`, no se re-testea el guard del
   store acá).

## Cobertura esperada

Sin piso numérico nuevo (scope `classic` no agrega 80%-coverage nuevo más
allá del ya vigente 40% frontend de `team.md`). Los 8 casos nuevos +
los 11 casos ya existentes en el describe "export catálogo (formato
cliente)" cubren el 100% de las 11 AC de `stories.md` (AC1.1.1–AC1.1.6,
AC2.1.1–AC2.1.2, AC3.1.1–AC3.1.3) y los 3 puntos del piso de equipo del
Testing Contract.

## Mocking/stubbing guidance

- `useOrganization` y `useOrganizationStore` se mockean directamente por
  módulo (`vi.mock`), NO por fixture compartido — mismo patrón que
  `useInfiniteProducts`/`exportCatalogClientFormat` ya mockeados en este
  archivo.
- `global.fetch` se mockea SOLO en `products.test.ts` (capa de cliente
  API) — en `CatalogPage.test.tsx`, `exportCatalogClientFormat` en sí
  sigue mockeado (no se testea fetch real desde el componente, ya
  establecido).

## Test data management

Reusar `makeProduct()` ya existente en `CatalogPage.test.tsx`. Ningún
dato nuevo de organización requiere un builder dedicado — un objeto
literal `{ id, name }` alcanza para los 2 shapes usados (`useOrganization
().organization`).
