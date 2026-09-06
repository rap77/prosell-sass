<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-03T16:57:00Z — Store STALE (rutas cambiadas por intent 260828-zod-3-to-4-migration, área no relacionada); el humano eligió scan enfocado sobre catálogo/productos/export/imágenes en vez de full rescan.
- 2026-09-03T16:57:00Z — El usuario confirmó a mitad de stage que la salida del export debe ser "exactamente igual" a `docs/data39.csv` — esto resuelve a favor de replicar las 24 columnas reales del CSV cliente (incluyendo `id`), no la versión de 23 campos "limpia" que describe la doc F01 desactualizada.

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-03T16:57:00Z — Scan enfocado descartó re-verificar en profundidad el área de zod-migration/schemas (fuera de foco de este intent); el compare dio NARROWER como se esperaba, mergeado aditivamente sobre el store existente sin perder esas secciones (marcadas [PRESERVADO ÍNTEGRO]).

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-09-03T16:57:00Z — `IDOSpacesService` no tiene método de descarga de bytes ya almacenados; dos alternativas viables sin dependencias nuevas quedaron documentadas para Requirements/Design: agregar `get_object` al puerto S3, o usar `httpx` contra las `image_urls` públicas ya guardadas en `Product`.

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-03T16:57:00Z — ¿El nuevo export de formato cliente es un endpoint nuevo o una extensión del `GET /api/v1/products/export.csv` genérico ya existente (FEAT-1)? Decisión de diseño pendiente para Requirements Analysis.
- 2026-09-03T16:57:00Z — Discrepancia confirmada entre `docs/canonical/F01-bulk-upload-csv-import.md` y los datos reales: el texto descriptivo real del vehículo vive en la columna `option` (que F01 dice ignorar), no en `description`; hoy solo se persiste `description`, así que no hay forma de reconstruir `option` para el export sin un cambio de modelo. A resolver en Requirements Analysis.
- 2026-09-03T16:57:00Z — Bug real confirmado en `build_image_folder_name()` (`csv_export.py`): lee `attrs.get("color")` en vez de `attributes["exterior_color"]`, perdiendo el segmento COLOR del nombre de carpeta para vehículos reales — fix mecánico acotado, candidato a resolverse junto con este intent.
- 2026-09-03T16:57:00Z — Posible test duplicado: `test_csv_image_mapper.py` existe tanto en `apps/api/tests/unit/services/` como en `apps/api/tests/unit/domain/services/` — no investigado en profundidad, señalar para Build and Test.
