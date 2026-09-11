# Code Summary — u1-export-org-confirmation

Implementado exactamente per el plan aprobado (`code-generation-plan.md`,
9/9 pasos completados). Sin backend tocado (ya resuelto en
`260910-export-cross-org`, merged `264d99f1`).

## Archivos modificados

- **`apps/web/src/lib/api/products.ts`** (+16/-2) —
  `exportCatalogClientFormat(organizationId?: string): Promise<Response>`.
  Agrega `?organization_id=<encodeURIComponent(id)>` a la URL solo cuando
  `organizationId` está presente; URL sin cambios en caso contrario
  (AC1.1.2/AC3.1.2).

- **`apps/web/src/app/(seller)/catalog/page.tsx`** (+109/-24) — union
  discriminada `ExportOrganization` (`"own" | "loading" | "cross-org"`).
  `CatalogPage()` lee `viewingOrgId` de `organizationStore` (Zustand) +
  `useOrganization(viewingOrgId ?? undefined)` (mismo query cacheado por
  `TanStack Query` que ya dispara `OrganizationPicker` en el Header — sin
  fetch nuevo, confirmado en `nfr-design/performance-design.md`).
  `ExportSummaryBanner` recibe el prop `organization` y renderiza el
  badge destacado (ícono `Building2` + texto en negrita, pill,
  `data-testid="export-summary-org-badge"`) ARRIBA del párrafo existente,
  nunca in-line con él; estado skeleton
  (`data-testid="export-summary-org-badge-skeleton"`) cuando
  `kind === "loading"` — nunca ausente cuando `viewingOrgId` está seteado
  (fix del hallazgo Major del reviewer de Refined Mockups).
  `handleExportClientFormat` pasa `organization_id` condicional y
  bifurca el toast de 404 en 3 mensajes (cross-org con nombre / fallback
  genérico exacto / mensaje propio YA EXISTENTE sin cambios).

- **`apps/web/tests/unit/lib/api/products.test.ts`** (+37) — el archivo
  ya existía (otra cobertura previa de `products.ts`); se extendió con
  `describe("exportCatalogClientFormat", …)`, 3 casos (sin id / con id /
  id con caracteres que requieren URL-encoding).

- **`apps/web/tests/components/catalog/CatalogPage.test.tsx`** (+231/-27)
  — `openExportSummary` promovido a scope de módulo (antes anidado en el
  describe hermano) para reusarlo sin duplicar; mocks nuevos de
  `useOrganization`/`useOrganizationStore` (patrón selector-consuming
  copiado de `OrganizationPicker.test.tsx`, per Testing Contract § team);
  nuevo describe "CatalogPage — export cross-org (selector de
  organización)" con los 8 casos de `unit-test-instructions.md`.

## Decisiones clave

- Reutilizar `useOrganization()` (ya existente en `organizations.ts`) en
  vez de crear un hook nuevo — mismo query key `["admin-organizations"]`
  que `OrganizationPicker`, deduplicado por TanStack Query (cero costo de
  red incremental).
- Badge SIEMPRE presente (en skeleton) cuando `viewingOrgId` está
  seteado, nunca omitido — la unión discriminada de 3 estados (no 2)
  evita colapsar "own" y "loading" al mismo valor, exactamente el fix ya
  cerrado en Refined Mockups.
- `exportOrganization` se computa una sola vez por render en `CatalogPage`
  y se pasa tanto al banner como al handler de export — un único punto de
  verdad, sin segundo mecanismo de estado paralelo (AC1.1.3/AC1.1.4).

## Cobertura de tests

`vitest run` → 42/42 verde (18 en `products.test.ts`, 24 en
`CatalogPage.test.tsx`, antes 16). `tsc --noEmit` limpio. `eslint`
(`--max-warnings=0`) limpio en los 4 archivos tocados. `prettier --check`
limpio.

## Desviaciones del plan

1. `products.test.ts` — el plan lo describía como archivo nuevo; ya
   existía con cobertura no relacionada de `products.ts`. Se extendió en
   vez de sobreescribir (mismo resultado funcional, sin duplicar
   configuración de test).
2. Caso 8 de `unit-test-instructions.md` especificaba
   `screen.queryByText(/organiza/i)` como aserción de "sin elementos de
   organización" — pero el párrafo YA EXISTENTE del banner (sin cambios
   de este Unit) contiene literalmente la palabra "organización"
   ("...catálogo completo... de tu organización."), lo que haría fallar
   ese regex exacto por una razón ajena al feature. Se acotó la aserción
   al string específico del badge (`/exportando catálogo de:/i`), que es
   lo que la AC realmente verifica (presencia/ausencia del badge) —
   documentado inline en el test.

## Review

**Verdict:** READY

**Reviewer:** aidlc-architecture-reviewer-agent

**Date:** 2026-09-11T15:54:45Z

**Iteration:** 1

**Findings:**

1. **[Major]** `apps/web/src/app/(seller)/catalog/page.tsx:295-298` — `useOrganization(viewingOrgId ?? undefined)` se llama de forma INCONDICIONAL en cada render de `CatalogPage`, para TODO usuario que visita `/catalog` — no solo cuando `viewingOrgId` está seteado, y no solo para usuarios con `ORG_ADMIN_VIEW_ALL`. `useOrganization()` (`apps/web/src/lib/api/organizations.ts:86-94`) delega siempre en `useOrganizations()` (línea 91: `const query = useOrganizations();`), que no tiene ningún `enabled:` — dispara `GET /api/v1/admin/organizations` sin condición. Verificado contra `apps/web/src/components/layout/Header.tsx:187-191`: hoy `OrganizationPicker` (el ÚNICO consumidor existente de `useOrganizations()`) solo se monta cuando `isAdmin` es true — el resto de los usuarios (la mayoría de los vendedores que visitan `/catalog`) nunca disparaban esa query. Con este cambio, CADA visita a `/catalog`, de CUALQUIER usuario (admin o no), dispara esa misma query contra un endpoint gateado server-side por `ORG_ADMIN_VIEW_ALL` (aprendizaje ya persistido en `project.md`: "ya gateado server-side por `ORG_ADMIN_VIEW_ALL`") — para el usuario común, es un fetch nuevo que falla (`getJson()` en `organizations.ts:47-56` hace `throw new Error(...)` sin `res.ok`, y nada en `CatalogPage` consume `isError`/`error` de `useOrganization`, así que el fallo queda silencioso en el cache de TanStack Query, pero el request sale igual). Esto contradice explícitamente la afirmación de `nfr-design/performance-design.md` ("no agrega latencia medible... igual que ya hace `OrganizationPicker`") y la de `code-summary.md` ("mismo query cacheado... sin fetch nuevo") — esa afirmación es cierta solo para el subconjunto de usuarios admin que ya montan `OrganizationPicker`, y falsa para el resto. Ningún test de `CatalogPage.test.tsx` cubre este caso porque el hook está mockeado globalmente (`vi.mock("@/lib/api/organizations", …)`) en las 24 pruebas — el mock oculta que la llamada real ocurre siempre, sin gating por permiso. Recomendación: condicionar la llamada (ej. `enabled: hasPermission(role, Permission.ORG_ADMIN_VIEW_ALL)` pasado a través de un nuevo parámetro en `useOrganization`, o simplemente no invocar el hook cuando `viewingOrgId` es `null` Y el usuario no tiene el permiso) antes de mergear, o al menos registrar el hallazgo como deuda documentada si el equipo decide aceptar el costo.

2. **[Minor]** La cobertura declarada en `code-summary.md`/`traceability.json` es precisa en todo lo demás que se pudo verificar mecánicamente: `exportCatalogClientFormat()` (`products.ts:1548-1557`) omite `organization_id` para "own" e incluye `?organization_id=<encodeURIComponent(id)>` para cross-org (AC1.1.2/AC3.1.2, confirmado con los 3 tests de `products.test.ts:801-826`); los 3 mensajes de 404 (`page.tsx:515-527`) coinciden byte a byte con `functional-spec.md` §6 (incluyendo el fallback genérico "Esta organización no tiene catálogo publicado para exportar." con el punto final, y el mensaje "own" sin cambios respecto al `git diff` contra `HEAD`, confirmado línea por línea); el guard de permiso real (`organizationStore.setViewingOrgId()`, `organizationStore.ts:361-367`) coincide con lo citado en `security-design.md`/`traceability.json` para NFR1; el badge de 3 estados (own/loading/cross-org) nunca colapsa "loading" con "own" (línea 184: `organization.kind !== "own"` cubre ambos "loading" y "cross-org") — el fix del hallazgo Major de Refined Mockups sí llegó al código real, no solo al diseño. Re-ejecuté `vitest run` sobre los 2 archivos de test (42/42 verde), `tsc --noEmit` (limpio) y `eslint --max-warnings=0` sobre los 4 archivos tocados (limpio) — las claims de "42/42 passing, tsc clean" de `code-summary.md` siguen siendo ciertas ahora mismo. La UI de gating (`ExportSummaryBanner`/`exportOrganization`) nunca se presenta como la barrera real de autorización — el texto de `security-design.md` y los comentarios del código dejan explícito que la barrera real vive en `_check_org_scope_permission()` del backend, consistente con lo afirmado en `team.md`.

El hallazgo #1 no bloquea el veredicto por sí solo (es 1 Major, no rompe la funcionalidad del feature ni expone datos — el fetch fallido queda silencioso) pero sí es una regresión de performance/ruido real y una afirmación de diseño verificablemente falsa para el caso más común (usuario sin `ORG_ADMIN_VIEW_ALL`); se documenta para que el humano decida en el gate si amerita un fix antes de mergear o queda como deuda a resolver en un intent de seguimiento.
