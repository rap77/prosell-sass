# Code Summary — u2-catalog-export-ui

Los 6 steps del plan aprobado se ejecutaron (Steps 1-5 código/test;
Step 6 es este propio documento, fuera del alcance del subagent
delegado). Independientemente re-verificado por el conductor (no solo
confiando en el reporte del subagent): `pnpm tsc --noEmit`,
`pnpm eslint`, `pnpm vitest run` — todo corrido en vivo, no asumido.

## Archivos modificados

| Archivo                                                  | Cambio                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/api/products.ts`                       | Nueva `exportCatalogClientFormat(): Promise<Response>` — mismo patrón fetch que `exportCatalogCsv`/`downloadSchemaTemplate`, sin tocar ninguna de las dos                                                                                                                                                                                                           |
| `apps/web/src/app/(seller)/catalog/page.tsx`             | Botón de export envuelto en `DropdownMenu` (2 ítems: CSV existente sin tocar + nuevo "Exportar catálogo (formato cliente)"); nuevo componente `ExportSummaryBanner` inline (no modal); estado `isExportingClientFormat`/`showExportSummary`; handlers `handleOpenExportSummary`/`handleCancelExportSummary`/`handleConfirmExportSummary`/`handleExportClientFormat` |
| `apps/web/tests/components/catalog/CatalogPage.test.tsx` | Extendido (no creado nuevo) con 9 tests nuevos: los 8 casos obligatorios de `unit-test-instructions.md` + 1 agregado por el conductor (ver "Hallazgo corregido" abajo)                                                                                                                                                                                              |

## Decisiones de implementación clave

1. **Shape real del error 413/404** (`{"detail": "<string>"}`, `HTTPException(detail=str(e))` en `product_router.py:759-764`) es distinto del que `contract-summary.md`/`unit-test-instructions.md` asumían (`detail.message`). El subagent verificó el router real y reutilizó el util ya existente `extractErrorMessage(body, fallback)` (`apps/web/src/lib/api/extractErrorMessage.ts`), que ya soporta ese shape y es la convención vigente en todo `products.ts` — se prefirió esto sobre escribir un parser ad-hoc, sin desviarse del comportamiento pedido (mostrar el mensaje del backend con fallback genérico).
2. **Guard de doble-clic en dos capas**: `disabled={isExportingClientFormat}` en el `DropdownMenuItem` (UI) + chequeo temprano en `handleOpenExportSummary` (lógica) — necesario porque el mock de test del `DropdownMenuItem` no respeta `disabled` de forma nativa, y porque el guard lógico es la garantía real independientemente del render.
3. **Conteo del banner sin fetch nuevo**: `viewModelsByStatus.published.length` — dato ya derivado en memoria de la lista cargada por `useInfiniteProducts`, confirmado con un test que compara los argumentos pasados al hook antes/después de abrir el banner (deben ser idénticos).

## Hallazgo corregido por el conductor (antes de dispatchear el reviewer)

El subagent implementó manejo explícito de 404/413/`!res.ok`, pero
`handleExportClientFormat` no tenía `catch` alrededor del `await
exportCatalogClientFormat()` — un fallo de red (fetch rechazado, ej.
sin conexión) escapaba como unhandled rejection en vez de mostrarse al
usuario. Es un gap real de manejo de errores en un boundary de
integración (`phases/construction.md` — "Errors must be surfaced to
the caller or logged"), y el mandate de equipo Q6
(`project.md`, "adoptar en el frontend un patrón de manejo de errores
equivalente al backend... hacia adelante") aplica de lleno a código
NUEVO como este. **Corregido directamente**: se agregó un `catch`
mostrando un toast de error genérico, y se agregó el test
correspondiente ("on a network failure shows a generic error toast
instead of an unhandled rejection") — re-verificado en vivo
(`tsc`/`eslint`/`vitest` en verde, suite completa 166 archivos/1291
tests sin romper nada).

Este hallazgo es del mismo tipo (mecánico/objetivo, sin trade-off de
diseño) que los que la reviewer de u1 encontró — se corrige antes de
abrir el gate, siguiendo el patrón ya establecido en esta sesión.

## Desviaciones del plan (documentadas)

- El plan no anticipaba el shape real del body de error 413 (asumía
  `detail.message` en vez de `detail: string`) — la desviación del
  subagent (reutilizar `extractErrorMessage`) es más correcta que lo
  planeado, no un recorte.
- No se agregó un test dedicado de 404 (el plan lo dejaba opcional,
  "no debería ocurrir en la práctica porque ya se filtró en el
  banner") — el código sí lo maneja (`toast.error` + early return),
  solo no tiene test dedicado; cubierto indirectamente por el mismo
  patrón de manejo que 413.

## Test coverage summary

16 tests en `CatalogPage.test.tsx` (166 archivos, 1291 tests en la
suite completa del frontend) — todos verificados en vivo por el
conductor, no solo reportados por el subagent. `tsc --noEmit` y
`eslint` sobre los 3 archivos tocados: limpios.

## Review

**Verdict:** READY (tras resolución del hallazgo #1, ver "Resolución" al final)
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-05T22:47:10Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                                                                                                                               | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Critical | `apps/web/src/app/(seller)/catalog/page.tsx` líneas 540-547, 675, 322-330 (`viewModelsByStatus`, `allProducts`, `useInfiniteProducts(apiFilters, 50)`) | El conteo de `ExportSummaryBanner` (`viewModelsByStatus.published.length`) y el gate "catálogo vacío" (AC1.1.5) se calculan sobre `allProducts`, que es el resultado de `useInfiniteProducts(apiFilters, 50)` — **filtrado** por `search`/`status`/`category_id`/`attributes` de la URL actual y **paginado** (solo las páginas ya cargadas por scroll infinito). El backend de `u1-catalog-export-api` exporta TODOS los productos `published` de la organización, sin filtro ni límite de paginación (`u1.../functional-design/rules.md:9,15`: "Solo productos con status=published Y organization_id..."; `contract-summary.md:38`: "Filtra productos status=published de la organización resuelta"). `functional-spec.md` de este mismo Unit asume explícitamente lo contrario ("el catálogo completo de la organización ya está en memoria del lado del cliente... el catálogo completo... ya está en memoria"), una premisa que el código real de `catalog/page.tsx` contradice: la página SIEMPRE opera sobre una vista filtrada+paginada, nunca sobre "todo el catálogo cargado". Consecuencia observable: (a) con cualquier filtro de categoría/búsqueda/estado activo — el uso normal de esta página — el banner muestra un conteo menor al que realmente se exportará; (b) si la vista filtrada actual da 0 resultados `published` (p. ej. una categoría sin productos publicados) pero la organización SÍ tiene productos `published` en otras categorías, el banner bloquea el flujo con el mensaje de "catálogo vacío" y nunca deja llegar al usuario al prompt — un falso negativo que impide exportar un catálogo que no está vacío; (c) si la organización tiene más de 50 productos `published` y el usuario no hizo scroll hasta el final, el conteo mostrado es parcial. Ninguno de los 9 tests nuevos ejercita un escenario con filtro activo o con más de una página cargada — todos usan `mockProducts` con 1-3 productos y sin filtros, por lo que el defecto no se manifiesta en la suite. | No es un fix mecánico — requiere una decisión de diseño explícita, no corregido en esta pasada. Alternativas a decidir en Functional/NFR Design: (1) el banner consulta un endpoint de conteo real (org-wide, sin filtro) antes de mostrar el resumen — implica agregar una llamada nueva a `u1`; (2) el frontend computa el conteo/gate ignorando `apiFilters` pero sin paginación (llamando `useInfiniteProducts` sin filtros y cargando todas las páginas antes de abrir el banner) — evita el endpoint nuevo pero puede ser costoso con catálogos grandes; (3) el banner deja explícito en el copy que el conteo es "de la vista actual, con filtros aplicados" y fuerza al usuario a limpiar filtros antes de continuar — cambia el contrato de UX pero no requiere backend nuevo. Cualquiera de las tres es preferible a la premisa actual, que es objetivamente falsa contra el código real de esta misma página. |
| 2   | Minor    | `code-summary.md` § "Hallazgo corregido por el conductor"                                                                                              | El fix de `catch` para fallos de red ya aplicado por el conductor (guard de red faltante) es correcto y está bien testeado (`"on a network failure shows a generic error toast instead of an unhandled rejection"`, confirmado pasando). Sin objeción — se menciona solo para dejar constancia de que fue revisado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Ninguna acción — ya resuelto correctamente.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### Validation Tool Results

| Tool                                                                                                                    | Result                                                               | Interpretation                                                                            |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm tsc --noEmit`                                                                                                     | Sin salida (0 errores)                                               | Limpio                                                                                    |
| `pnpm eslint src/lib/api/products.ts "src/app/(seller)/catalog/page.tsx" tests/components/catalog/CatalogPage.test.tsx` | Sin salida (0 errores/warnings)                                      | Limpio                                                                                    |
| `pnpm vitest run tests/components/catalog/CatalogPage.test.tsx`                                                         | 16/16 tests pasando (incluye los 9 nuevos de export formato cliente) | Verde, pero no cubre el escenario de filtro activo / paginación parcial (ver hallazgo #1) |

### Summary

El manejo de errores (200/404/413/red), el guard de doble-clic (dos capas: UI + lógica), las convenciones de código (sin `useMemo`/`useCallback`, sin `any`, sin clases Tailwind inválidas, sin dependencias nuevas) y la fidelidad del contrato de descarga (`Content-Type: application/zip` consumido como blob) están todos bien resueltos y probados. El bloqueo es un hallazgo Critical real y no mecánico: el conteo/gate del `ExportSummaryBanner` se computa sobre una vista de productos filtrada y paginada (`useInfiniteProducts(apiFilters, 50)`), mientras que el export real del backend opera sobre el catálogo `published` completo de la organización sin filtros ni límite de página — la premisa de `functional-spec.md` ("el catálogo completo ya está en memoria") es falsa contra el código real de esta misma página, y el efecto práctico es que un filtro de categoría/búsqueda activo (el uso normal de esta pantalla) puede subestimar el conteo o incluso bloquear el flujo por error cuando el catálogo real no está vacío. Requiere una decisión de diseño (endpoint de conteo real, ignorar filtros, o advertir en el copy) antes de aprobar este Unit.

## Resolución del hallazgo #1 (post-review, con decisión humana)

El hallazgo Critical era real (verificado por el conductor directamente
contra el código: `apiFilters` en línea 315 incluye `search`/`status`/
`category_id`/`attributes`, y `useInfiniteProducts(apiFilters, 50)` en
línea 330 confirma filtro+paginación) y no era mecánico — requería una
decisión de diseño. Se presentó al humano con 3 alternativas (endpoint
de conteo real, ignorar filtros sin paginar, o solo aclarar el copy).

**Decisión del humano**: quitar el conteo/gate client-side por
completo. `ExportSummaryBanner` pasa a ser una confirmación simple
("Se exportará el catálogo completo de productos publicados de tu
organización") sin número y sin bloqueo previo — el caso de catálogo
vacío (AC1.1.5) lo cubre el 404 real del backend, que ya estaba
implementado y testeado en el flujo de `handleExportClientFormat`
desde la primera pasada de Code Generation.

**Cambios aplicados**:

- `ExportSummaryBanner` — quitada la prop `count` y toda la lógica de
  `isEmpty`; `onContinue` ahora es obligatorio (siempre hay a dónde
  continuar, el backend decide si el catálogo está vacío).
- `catalog/page.tsx` — el render del banner ya no pasa `count` ni
  condiciona `onContinue` sobre `viewModelsByStatus.published.length`.
- Tests: reemplazado el test de conteo por uno que solo confirma que
  abrir el banner no dispara un fetch nuevo; reemplazado el test de
  gate-vacío-client-side por un test real contra un 404 devuelto por
  `exportCatalogClientFormat()` (mismo mecanismo que el test de 413 ya
  existente).

**Nota para trazabilidad**: `functional-spec.md` de este Unit (ya
aprobado en una etapa anterior) sigue describiendo la premisa
incorrecta ("el catálogo completo ya está en memoria del lado del
cliente") — no se editó retroactivamente ese artefacto ya cerrado,
siguiendo el patrón ya establecido en este intent (dejar la
inconsistencia documentada acá y que el gate humano decida). Esta
resolución es la fuente de verdad para el comportamiento real
implementado.

**Re-verificación tras el fix** (corrida en vivo por el conductor):
`pnpm tsc --noEmit` limpio; `pnpm eslint` sobre los 3 archivos tocados
limpio; `pnpm vitest run tests/components/catalog/CatalogPage.test.tsx`
→ 16/16 tests pasando; suite completa del frontend → 166 archivos,
1291 tests, todos en verde.
