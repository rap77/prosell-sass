# Performance Requirements — u1-catalog-export-api

`requirements.md` no define ningún NFR de performance para este intent —
los targets de esta sección son originados en esta etapa, siguiendo
`nfr-requirements-guide.md` (benchmarking de performance) y el
`functional-spec.md` de este Unit (Functional Design), que ya describe el
flujo síncrono completo (query → armado de CSV+ZIP → respuesta).

## Contexto de carga

Operación de generación de archivo en bulk, no un endpoint interactivo de
uso frecuente — se dispara manualmente por el vendedor/dealer, no en cada
carga de página. El volumen está acotado por el cap de NFR3.1
(`scalability-requirements.md`): máximo 500 productos `published` por
export.

## Targets

| ID         | Métrica                                                                                     | Target                                             | Percentil | Condición de carga                                       | Método de medición                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| NFR-PERF-1 | Tiempo de respuesta del endpoint completo (`GET /api/v1/products/export-client-format.zip`) | < 15s para 500 productos con hasta 10 imágenes c/u | p95       | 1 request concurrente (uso esperado: un dealer a la vez) | Medición end-to-end en `build-and-test` (Construction), tiempo desde request hasta última byte de respuesta |
| NFR-PERF-2 | Tiempo de respuesta para catálogos chicos (≤50 productos, caso típico)                      | < 3s                                               | p95       | 1 request concurrente                                    | Mismo método que NFR-PERF-1                                                                                 |
| NFR-PERF-3 | Lectura de una imagen individual vía `IDOSpacesService.get_object()`                        | < 500ms                                            | p95       | Por imagen, dentro del flujo de armado del ZIP           | Medición interna (logging de duración por llamada)                                                          |

## Anti-requisitos explícitos

- NO se exige "exportar instantáneamente" ni un target sin condición de
  carga — el cap de NFR3.1 (500 productos) es la condición de carga
  máxima soportada; por encima de ese número, el sistema rechaza (413)
  en vez de degradar silenciosamente.
- NO hay requisito de streaming progresivo de la respuesta (el ZIP se
  arma completo en memoria antes de responder, dentro del cap ya
  acotado) — streaming incremental queda fuera de alcance de este
  intent.

## Trazabilidad

Deriva de `functional-spec.md` § Workflow (Pasos 5-7, el request síncrono
completo) y del cap de recursos ya fijado en Functional Design (`rules.md`
BR3.1). Sin NFR de origen en `requirements.md` — target nuevo,
justificado por el tipo de operación (bulk file generation, no CRUD
interactivo).
