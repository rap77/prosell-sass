# Cross-Unit Final Coverage Gate — 260903-catalog-client-export

**Veredicto: PASS.** Todos los FR/NFR de `requirements.md` y todos los
AC de `stories.md` están cubiertos con `OK` en al menos un
`traceability.json` de Unit, con target en un archivo real existente,
salvo un caso de cobertura-por-omisión documentado abajo (AC1.2.3).

## FR/NFR (`inception/requirements-analysis/requirements.md`) → AC (`inception/user-stories/traceability.json`) → código

| FR/NFR | AC(s) mapeados            | Unit(s) que cubren el AC    | Estado           |
| ------ | ------------------------- | --------------------------- | ---------------- |
| FR1.1  | — (US1.1 general)         | u1 (endpoint), u2 (trigger) | OK               |
| FR1.2  | AC1.1.1, AC1.1.7          | u1                          | OK               |
| FR1.3  | AC1.1.2                   | u1                          | OK               |
| FR1.4  | AC1.1.11                  | u1                          | OK               |
| FR2.1  | AC1.1.3                   | u1                          | OK               |
| FR2.2  | AC1.1.3                   | u1                          | OK               |
| FR2.3  | AC1.1.4                   | u1                          | OK               |
| FR2.4  | AC1.1.3                   | u1                          | OK               |
| FR3.1  | AC1.2.1, AC1.2.2          | u2                          | OK               |
| FR3.2  | AC1.2.3                   | — (negativo, ver nota)      | OK (por omisión) |
| FR4.1  | AC1.1.5, AC1.1.6          | u1, u2                      | OK               |
| NFR1   | AC1.1.7                   | u1                          | OK               |
| NFR2   | AC1.1.3                   | u1                          | OK               |
| NFR3   | AC1.3.1, AC1.3.2          | u1, u2                      | OK               |
| NFR4   | AC1.1.4, AC1.1.8, AC1.1.9 | u1, u2 (u2 solo AC1.1.9)    | OK               |

## AC (`inception/user-stories/stories.md`) → target real

| AC       | Status           | Unit   | Target                                                                                                                                      |
| -------- | ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1.1.1  | OK               | u1, u2 | `product_router.py` (endpoint); `catalog/page.tsx` (trigger)                                                                                |
| AC1.1.2  | OK               | u1     | `csv_export.py`                                                                                                                             |
| AC1.1.3  | OK               | u1     | `csv_export.py`                                                                                                                             |
| AC1.1.4  | OK               | u1     | `csv_export.py`                                                                                                                             |
| AC1.1.5  | OK               | u1, u2 | `export_catalog_client_format.py` (404 real); `catalog/page.tsx` (toast del 404, tras el fix del hallazgo Critical de Code Generation)      |
| AC1.1.6  | OK               | u1     | `export_catalog_client_format.py`                                                                                                           |
| AC1.1.7  | OK               | u1     | `product_router.py`                                                                                                                         |
| AC1.1.8  | OK               | u1     | `csv_export.py`                                                                                                                             |
| AC1.1.9  | OK               | u1, u2 | `test_product_router_export_client_format.py` (backend); `route.test.ts` (proxy — **test agregado en este stage**, ver "Gap cerrado" abajo) |
| AC1.1.10 | OK               | u2     | `catalog/page.tsx` (guard de doble-clic en dos capas)                                                                                       |
| AC1.1.11 | OK               | u1     | `csv_export.py`                                                                                                                             |
| AC1.2.1  | OK               | u2     | `catalog/page.tsx`                                                                                                                          |
| AC1.2.2  | OK               | u2     | `catalog/page.tsx`                                                                                                                          |
| AC1.2.3  | OK (por omisión) | u2     | ver nota abajo                                                                                                                              |
| AC1.3.1  | OK               | u1, u2 | `export_catalog_client_format.py`; `catalog/page.tsx`                                                                                       |
| AC1.3.2  | OK               | u1     | `csv_export.py`                                                                                                                             |

## Nota — AC1.2.3 (cobertura por omisión, no un gap funcional)

AC1.2.3 es un **AC negativo por diseño**: "no existe un botón de
'elegir carpeta en mi disco'; la descarga sigue el mecanismo estándar
del navegador". Ninguno de los dos `traceability.json` de Code
Generation lo cita explícitamente (es una ausencia, no hay una línea
de código "positiva" que targetear). Verificado directamente por el
conductor en este stage: `rg` sobre `catalog/page.tsx` en busca de
`webkitdirectory`/`showDirectoryPicker`/`type="file"` no encuentra
ningún resultado — confirma que el AC se cumple por la ausencia real
de esa superficie, no por una omisión de test. Se documenta acá para
que quede trazado, sin reabrir el `traceability.json` ya cerrado y
aprobado de `u2-catalog-export-ui`.

## Gap cerrado en este stage (no un hallazgo de Code Generation)

`u1-catalog-export-api`'s `traceability.json` marca AC1.1.9 `OK`
apuntando solo al test de integración del backend — el texto exacto de
AC1.1.9 exige verificación "de punta a punta a través del proxy BFF de
Next.js, no solo en el backend", y ningún test previo (de este intent
ni preexistente) ejercitaba la rama blob-vs-JSON del proxy para
NINGUNA respuesta binaria. Se agregó
`apps/web/src/app/api/v1/products/[...path]/route.test.ts::"passes a
ZIP response through as a blob..."` en este mismo stage — ver
`test-results.md` y `integration-test-instructions.md` § Boundary 2.
No se reabrió `u1-catalog-export-api/code-generation/traceability.json`
(ya cerrado); esta tabla es la fuente de verdad actualizada para el
gate de esta etapa.
