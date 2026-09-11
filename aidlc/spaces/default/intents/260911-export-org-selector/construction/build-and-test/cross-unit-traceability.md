# Cross-Unit Final Coverage Gate — 260911-export-org-selector

**Veredicto**: PASS (10/10 FR/NFR cubiertos; 1 nota de status, no un gap
real — ver detalle en FR2.1/NFR1 abajo).

Único Unit en este Bolt (`u1-export-org-confirmation`) — no hay
cruce cross-Unit real que verificar más allá de la cadena de
trazabilidad completa FR/NFR → AC → código.

## FR/NFR de `requirements.md` (vía `user-stories/traceability.json`) → AC de `stories.md` → `code-generation/traceability.json`

| FR/NFR | AC(s) (user-stories/traceability.json) | Status en code-generation/traceability.json | Target                                                                                                                            |
| ------ | -------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| FR1.1  | AC1.1.1                                | OK                                          | `catalog/page.tsx` (handleExportClientFormat, organization_id condicional)                                                        |
| FR1.2  | AC1.1.2                                | OK                                          | `products.ts` (exportCatalogClientFormat, organizationId? opcional)                                                               |
| FR1.3  | AC1.1.3, AC1.1.5, AC3.1.3              | OK, OK, OK                                  | `catalog/page.tsx` (exportOrganization derivado de viewingOrgId); `CatalogPage.test.tsx` (badge con nombre; sin elementos nuevos) |
| FR1.4  | AC1.1.3                                | OK                                          | (mismo que arriba)                                                                                                                |
| FR2.1  | AC3.1.1                                | **N/A** (ver nota)                          | `OrganizationPicker.tsx` no modificado                                                                                            |
| FR2.2  | AC3.1.2, AC3.1.3                       | OK, OK                                      | `catalog/page.tsx` (organization_id undefined en "own"); `CatalogPage.test.tsx`                                                   |
| FR3.1  | AC2.1.1                                | OK                                          | `catalog/page.tsx` (toast 404 con nombre)                                                                                         |
| FR3.2  | AC2.1.2                                | OK                                          | `catalog/page.tsx` (mensaje 404 propio sin cambios)                                                                               |
| NFR1   | AC3.1.1, AC3.1.2                       | **N/A**, OK                                 | ver nota; `catalog/page.tsx`                                                                                                      |
| NFR2   | AC1.1.4                                | OK                                          | `catalog/page.tsx` (badge skeleton, nunca ausente)                                                                                |

## Nota: AC3.1.1 / FR2.1 / NFR1 — status `N/A`, no un gap real

`code-generation/traceability.json` marca `AC3.1.1` como `N/A` (no `OK`)
porque este Unit no agrega ni modifica ningún código para esa AC —
`OrganizationPicker.tsx` queda intacto por diseño (FR1.3, decisión ya
cerrada en Requirements Analysis). La cobertura REAL de AC3.1.1 ("sin
selector visible para usuarios sin permiso") existe igual, pero vive en
la regresión YA EXISTENTE, no tocada por este intent:

- `apps/web/src/components/admin/OrganizationPicker.test.tsx` → test
  `"renders nothing for a non-admin user"` — verificado PASANDO en la
  corrida de suite completa de este stage (`test-results.md`).

Esto es inconsistente con el precedente ya establecido en
`nfr-requirements`/`nfr-design` de este mismo intent, donde NFR1 se
marcó `OK` (no `N/A`) citando exactamente este mismo patrón — código ya
existente e implementado, verificado contra el código real
(`organizationStore.ts:361-367`). El `traceability.json` de Code
Generation debería haber seguido el mismo criterio (`OK`, target =
`OrganizationPicker.test.tsx`) en vez de `N/A`. No se corrige acá
editando el artefacto de Code Generation — esa etapa ya tiene un
`REVIEW_COMPLETED` terminal y un gate aprobado; reabrirla por un nit de
status invalidaría ese receipt sin necesidad. Se documenta acá como
hallazgo de Build and Test para que el humano lo vea en el gate: es un
nit de bookkeeping (el status field debería decir `OK`), NO una
funcionalidad faltante — la AC está genuinamente cubierta y el test que
la cubre está verde.

## AC completas de `stories.md` (11 total)

Las 11 ACs (AC1.1.1–AC1.1.6, AC2.1.1–AC2.1.2, AC3.1.1–AC3.1.3) tienen
target concreto en `code-generation/traceability.json`, sin huérfanos:
ninguna AC sin target, ningún target sin AC citada.

## Conclusión

10/10 FR/NFR tienen cobertura real y verificable (9 con status `OK`
literal, 1 — AC3.1.1/FR2.1/NFR1 — con cobertura real pero status `N/A`
por el motivo explicado arriba, sin gap funcional). Cero elementos sin
cubrir.
