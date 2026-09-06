# Build and Test Summary — 260903-catalog-client-export

## Estado general

**Build-ready**: sí. **Test-ready**: sí. **Deployment-ready**: sí,
pendiente únicamente del gate humano de esta etapa y de CI Pipeline.

## Inventario de tipos de test generados

Test Strategy activo: **standard**.

| Tipo                               | Generado | Motivo                          |
| ---------------------------------- | -------- | ------------------------------- |
| `build-instructions.md`            | Sí       | Siempre requerido               |
| `integration-test-instructions.md` | Sí       | Requerido por strategy standard |
| `performance-test-instructions.md` | **No**   | Ver justificación abajo         |
| `security-test-instructions.md`    | **No**   | Ver justificación abajo         |
| `test-results.md`                  | Sí       | Resultados reales de ejecución  |
| `cross-unit-traceability.md`       | Sí       | Gate obligatorio de esta etapa  |

### Por qué no se generaron performance/security-test-instructions.md

La estrategia `standard` solo exige `integration-test-instructions.md`
por defecto (`performance`/`security` son de tier `comprehensive`,
condicionados además a que existan NFR de esa clase). Este intent SÍ
tiene NFR de performance (`NFR-PERF-1/2/3`, semáforo 20 + timeout +
retry) y de seguridad (`NFR1`/`NFR2`/`NFR3` de `requirements.md` —
aislamiento multi-tenant, zip-slip, límite de recursos), pero ambos ya
tienen su propio test DEDICADO escrito y verificado en Code Generation
(no genérico de "load testing"/"SAST"):

- Performance: `test_export_catalog_client_format.py` prueba el cap de
  500→413 y el manejo de fallo de imagen sin abortar el batch; el
  semáforo/retry están en `nfr-design/performance-design.md` con
  pseudocódigo ya implementado 1:1.
- Seguridad: `test_csv_export.py` prueba la sanitización de nombres de
  carpeta (anti zip-slip) reutilizando `_slug_part()`/
  `_sanitize_filename()` ya probados; `test_product_router_export_client_format.py::TestExportClientFormatTenantIsolation`
  prueba aislamiento cross-tenant end-to-end contra DB real.

Generar `performance-test-instructions.md`/`security-test-instructions.md`
adicionales sería ceremonia sin valor nuevo — no hay una superficie de
carga o de amenaza sin cubrir que un test de "load testing"/"SAST"
genérico agregaría por encima de los tests dedicados ya existentes.
Devsecops (postura ya afirmada en `team.md`, Practices Discovery de
este intent) confirmó sin objeción que ninguno de los riesgos de este
feature (zip-slip, DoS por memoria, tenant scoping) justifica abrir el
intent de seguridad dedicado ya diferido — son manejables en el diseño
de este feature, que es exactamente lo que se implementó y probó.

## Cobertura por Unit

| Unit                  | Tests nuevos/extendidos                                                | Resultado   |
| --------------------- | ---------------------------------------------------------------------- | ----------- |
| u1-catalog-export-api | 33 unitarios + 7 integración                                           | 40/40 verde |
| u2-catalog-export-ui  | 16 en `CatalogPage.test.tsx` + 3 en el proxy `route.test.ts` (1 nuevo) | 19/19 verde |

## Gap encontrado y cerrado en esta etapa

El proxy BFF de Next.js (`route.ts`) ya tenía la lógica correcta de
blob-vs-JSON, pero ningún test la ejercitaba para ninguna respuesta
binaria — ni siquiera para el CSV existente. El piso mínimo del equipo
exige verificación "de punta a punta a través del proxy" para AC1.1.9;
se agregó el test faltante en este stage (`route.test.ts`, ver
`integration-test-instructions.md` § Boundary 2). No era un hallazgo de
Code Generation sin resolver — era una superficie de test que ningún
stage anterior había cubierto para este tipo de respuesta.

## Readiness assessment

- **Build**: ruff/ruff-format/pyright (backend) y eslint/tsc (frontend)
  limpios, corridos en vivo en este stage.
- **Tests**: suite completa backend (1999 tests, Postgres 17 temporal)
  y frontend (166 archivos, 1292 tests) en verde. Ver `test-results.md`.
- **Cross-unit traceability**: todos los FR/NFR/AC cubiertos — ver
  `cross-unit-traceability.md` (un caso de cobertura-por-omisión
  documentado: AC1.2.3, negativo por diseño).

## Limitaciones conocidas / ítems pendientes

- Sin test E2E real de navegador (Playwright) para este flujo — decisión
  de alcance, consistente con el resto del proyecto para flujos de
  descarga de archivo similares (ver `integration-test-instructions.md`
  § Boundary 4).
- `apps/api/tests/unit/services/test_csv_image_mapper.py` sigue
  duplicado en dos ubicaciones (deuda ya documentada en `team.md`,
  fuera del alcance de este intent — no lo toca ningún archivo nuevo
  de este feature).
