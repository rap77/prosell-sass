# Performance Requirements — u1-cross-org-export-api

`requirements.md` no define ningún NFR de performance propio para este
intent. Los targets de esta sección EXTIENDEN los ya establecidos en el
intent hermano `260903-catalog-client-export` (mismo endpoint, mismo
Unit kind `service`) al nuevo modo "todas las organizaciones" — sin
`NFR{n}` de inception del que heredar un sub-número, mismo criterio ya
aprobado (reviewer, iteración 1) en ese intent.

## Contexto de carga

El modo "todas las organizaciones" (`all_organizations=true`, FR2/FR4)
no cambia el ORDEN DE MAGNITUD del volumen procesado en una sola
request — `EXPORT_MAX_PRODUCTS=500` (BR2.4) pasa de límite por-org a
límite GLOBAL (FR4.3), así que el peor caso sigue siendo 500 productos
con imágenes, igual que el caso puntual ya cubierto en `260903`. Lo que
sí cambia es el TRABAJO ADICIONAL por request: resolución batch de
`org_code` por-producto (BR2.3, sobre como máximo ~29-30 organizaciones
reales del sistema, `technology-stack.md`) y walk-up de vertical de
categoría por-producto (BR1.3, `entities.md`/`rules.md`), ambos
resueltos con una única query batch / cache por request respectivamente
(ver `nfr-requirements-questions.md` decisiones 1 y 2) — overhead
despreciable frente al tiempo dominante de lectura de imágenes desde
storage.

## Targets

| ID         | Métrica                                                                                                                 | Target                                                                                                 | Percentil | Condición de carga                                      | Método de medición                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| NFR-PERF-1 | Tiempo de respuesta del endpoint completo, caso puntual (`organization_id` presente o ausente, sin `all_organizations`) | < 15s para 500 productos con hasta 10 imágenes c/u                                                     | p95       | 1 request concurrente                                   | Medición end-to-end en `build-and-test` (Construction) — sin cambio respecto a `260903` |
| NFR-PERF-2 | Tiempo de respuesta para catálogos chicos (≤50 productos, caso típico puntual)                                          | < 3s                                                                                                   | p95       | 1 request concurrente                                   | Mismo método que NFR-PERF-1 — sin cambio respecto a `260903`                            |
| NFR-PERF-3 | Lectura de una imagen individual vía `IDOSpacesService.get_object()`                                                    | < 500ms                                                                                                | p95       | Por imagen, dentro del flujo de armado del ZIP          | Medición interna (logging de duración por llamada) — sin cambio respecto a `260903`     |
| NFR-PERF-4 | Tiempo de respuesta del endpoint completo, modo `all_organizations=true`, con el cap global de 500 productos            | < 18s para 500 productos con hasta 10 imágenes c/u, distribuidos en cualquier número de organizaciones | p95       | 1 request concurrente                                   | Medición end-to-end en `build-and-test` (Construction)                                  |
| NFR-PERF-5 | Resolución batch de `org_code` por-producto (BR2.3)                                                                     | < 200ms para el conjunto completo de organizaciones distintas del lote (≤30 organizaciones reales hoy) | p95       | Una sola query batch, antes del loop de armado de filas | Medición interna (logging de duración de la query batch)                                |

**NFR-PERF-4** usa un presupuesto levemente mayor que NFR-PERF-1 (15s → 18s,
+20%) para absorber la resolución batch adicional de `org_code`
(NFR-PERF-5) y el overhead de walk-up de categoría cacheado — ambos
acotados y no proporcionales al volumen de productos, sino al número de
organizaciones/categorías DISTINTAS del lote (órdenes de magnitud menor
que 500).

## Anti-requisitos explícitos

- NO se exige un target de "exportar instantáneamente" ni sin condición
  de carga — el cap global de NFR3.1 (`scalability-requirements.md`) es
  la condición de carga máxima soportada; por encima de ese número, el
  sistema rechaza (413) en vez de degradar silenciosamente, igual en
  ambos modos.
- NO hay requisito de streaming progresivo de la respuesta en ningún
  modo — sin cambio respecto a `260903`.
- NO se exige un target de performance específico por-organización
  dentro del modo "todas" (ej. "cada organización individual debe
  resolverse en X ms") — el target es sobre el request COMPLETO, no
  desagregado por organización.

## Trazabilidad

Deriva de `functional-spec.md` § Workflow 2 (pasos 6-8, resolución
batch + armado + respuesta) y de BR2.3/BR2.4 de `rules.md`. Sin NFR de
origen en `requirements.md` para performance — mismo criterio ya
afirmado en `260903-catalog-client-export`.
