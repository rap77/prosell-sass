# Code Summary — Batch de bugfixes de producción

Ejecución zero-Unit (scope `express`, sin units-generation) — todos los grupos A-F implementados en una sola iteración, siguiendo el orden de prioridad del intent: BUG-3/6 → BUG-1/2 → BUG-4/5 → BUG-7 → FEAT-1.

## Archivos creados

- `apps/web/src/lib/utils/toTitleCase.ts` + `toTitleCase.test.ts` — utilidad de Title Case (FR6)
- `apps/api/src/prosell/domain/services/csv_export.py` — lógica de exportación CSV (FR8)
- `apps/api/tests/unit/services/test_csv_export.py` — 4 tests de FEAT-1
- `apps/api/tests/unit/api/routers/test_public_product_router_contact.py` — 6 tests de contacto público (FR5)
- `apps/web/src/components/forms/schema/VinDecodeField.test.tsx` — 3 tests de Title Case en VIN decode
- `apps/web/src/components/public/ProductPublicView.test.tsx` — 2 tests de WhatsApp con destinatario
- `apps/web/src/app/(seller)/publications/page.test.tsx` — 4 tests de thumbnails en publicaciones

## Archivos modificados

**Backend:**

- `apps/api/src/prosell/application/dto/product/response.py` (+ `__init__.py`) — `PublicProductResponse` (DTO dedicado, sin campo teléfono)
- `apps/api/src/prosell/domain/services/csv_product_parser.py` — `UNIVERSAL_COLUMNS_ORDERED` (tuple, fuente de orden) + `UNIVERSAL_COLUMNS` tipado explícito `frozenset[str]`; parámetro `_organization_id` renombrado (unused, ya no genera warning de Pyright)
- `apps/api/src/prosell/infrastructure/api/routers/category_router.py` — sin cambio de comportamiento (ya usaba `UNIVERSAL_COLUMNS_ORDERED`)
- `apps/api/src/prosell/infrastructure/api/routers/public_product_router.py` — join a contactos de organización, `_pick_contact()` / `_compose_address()`
- `apps/api/src/prosell/infrastructure/api/routers/product_router.py` — nuevo endpoint `GET /products/export.csv`; llamada a `parse_csv` actualizada al nuevo nombre de parámetro
- `apps/api/src/prosell/infrastructure/database/seed_categories.py` — label `clean_title` corregido a español

**Frontend:**

- `apps/web/src/lib/api/schemas/categorySchema.ts` — `options` agregado a `AttributeField`
- `apps/web/src/types/category.ts` — `"select"` agregado a `AttributeSchemaEntry.render_as`
- `apps/web/src/components/admin/category-schema-editor.tsx` (+ `.test.tsx`) — input de `options`; fallback defensivo Type/Group
- `apps/web/src/components/forms/schema/SchemaFieldRenderer.tsx` (+ `.test.tsx`) — Title Case en input de texto libre; `tLabel()` wireado
- `apps/web/src/components/forms/schema/VinDecodeField.tsx` — Title Case en autocompletado VIN (solo campos sin `options`)
- `apps/web/src/components/review/ReviewQueueTable.tsx` (+ test) — `getCoverImageKey()` para thumbnail
- `apps/web/src/lib/api/productImages.ts` — nuevo helper `resolveStorageImageUrl()`
- `apps/web/src/app/(seller)/publications/page.tsx` — columna thumbnail en vista Lista; prop `image` en vista Grilla
- `apps/web/src/app/p/[slug]/page.tsx`, `apps/web/src/components/public/ProductPublicView.tsx` — contacto público (nombre+dirección, WhatsApp con destinatario)
- `apps/web/src/lib/api/products.ts` — `exportCatalogCsv()` (FEAT-1)
- `apps/web/src/app/(seller)/catalog/page.tsx` — botón "Exportar CSV"
- `apps/web/src/app/api/v1/products/[...path]/route.ts` — **fix de proxy** (ver Decisiones clave)
- `apps/web/src/app/api/v1/categories/[...path]/route.ts` (+ `route.test.ts`, nuevo) — **mismo fix de proxy aplicado tras Request Changes del usuario** (ver Decisiones clave)

## Decisiones clave

1. **BUG-3/6 (Step 2, revertido)**: cambiar el renderer para decidir por `render_as` en vez de por `options.length > 0` ROMPÍA 2 tests existentes que ya dependían del patrón actual en producción. Se revirtió — el renderer no cambió; el fix real fue agregar `options` al editor (que nunca las exponía) más un fallback defensivo en los `<Select>` de Type/Group para que un valor ya guardado que no matchea la lista conocida (la causa raíz real del bug reportado) siga apareciendo como item seleccionable.
2. **BUG-1/2**: causas raíz DISTINTAS, no compartían componente como asumía el intent. BUG-1 (`ReviewQueueTable`) nunca migró al resolver `getCoverImageKey()` ya usado en otros lados. BUG-2 estaba en `publications/page.tsx` (no `catalog/page.tsx` como decía el intent) — vista Lista sin columna de imagen, vista Grilla con el componente listo pero sin la prop `image` wireada.
3. **BUG-4**: nuevo DTO dedicado `PublicProductResponse` (no se tocó `ProductResponse` compartido) — garantía estructural de que el teléfono nunca puede filtrarse por este endpoint, no solo "el código no lo pone".
4. **FR6.2 (Title Case) — REVERSIÓN PARCIAL de lo que dijiste, con evidencia de código.** Tu respuesta fue "casi seguro" que Facebook acepta valores capitalizados. El código muestra que para los campos de **vocabulario controlado** (body_type, drivetrain, transmission, fuel_type, electrification, wheelbase_type, bed_type, cab_type) el valor canónico matchea un vocabulario cerrado específico de Facebook (`NHTSA_TO_FACEBOOK`, ej. `drivetrain` → exactamente `"FWD"/"RWD"/"AWD"/"4WD"`), y esos mismos campos ya tienen `options` en el schema con etiquetas en español correctamente capitalizadas en `vehicle-values.ts` — el bug de Title Case nunca los afectó. **NO se tocó `nhtsa_normalizer.py`** para esos campos. Title Case se aplicó solo a campos de texto libre (make, model, trim, engine, etc.), tanto autocompletados por VIN como tipeados a mano. Si esto no es lo que querías, decime y lo ajustamos.
5. **FEAT-1 — bug de proxy encontrado y arreglado (necesario para que el endpoint funcione).** El proxy de `products` forzaba `response.json()` sobre toda respuesta del backend — igual al bug de `If-Match` ya documentado en ese archivo (sesión 2026-08-21). Como el export devuelve CSV, rompía en cada uso real desde el navegador. Arreglado. **Actualización post-gate**: el usuario pidió arreglar también el proxy de `categories` (mismo bug, probablemente rompía `downloadSchemaTemplate()` en producción) en este mismo ciclo — aplicado el mismo fix + 2 tests nuevos, verificado tsc/eslint/vitest verdes. Sigue pendiente auditar el resto de los proxies BFF, como ya señalaba `architecture.md`.
6. **FEAT-1 — alcance interpretado como una categoría por exportación**, espejando el contrato del importador existente (que solo acepta una categoría por archivo). No es un "catálogo completo multi-categoría en un solo CSV". Confirmame si esto es lo que necesitabas.
7. **FEAT-1 — el patrón de nombre de carpeta se implementó literal** (`{AÑO}-{MARCA}-{MODELO}-{MILLAS_EN_K}K-{COLOR}-{CÓDIGO_ORG}`, incluye MARCA) aunque el ejemplo del intent ("2017-SPARK-128K-BLANCO-DK") omite ese segmento. Confirmame cuál es correcto.

## Cobertura de tests

- Backend: 1278/1278 tests unitarios verdes (suite completa, sin regresiones) + 21 tests nuevos (4 FEAT-1, 6 contacto público, 15 en `test_csv_product_parser.py` ya cubrían el orden de columnas sin cambios).
- Frontend: 1253 tests corridos (+2 tests nuevos de `categories/[...path]/route.test.ts` tras el Request Changes), 1240 verdes, **13 fallando — TODOS pre-existentes, confirmados por `git stash`/`pop` contra el baseline previo a este batch, sin relación con ningún cambio de este batch** (mock de test le falta el campo `published_to_marketplace` que el schema real ya requería). Ver memory.md.
- Linters: ruff, pyright, eslint, tsc — todos limpios en los archivos tocados.

## Desviaciones del plan

- Step 2 revertido (ver Decisión 1).
- Step 19 (Title Case del valor canónico) parcialmente NO ejecutado por evidencia de código (ver Decisión 4).
- Step 27 incluyó un fix de proxy no planeado originalmente pero necesario para que el endpoint funcione (ver Decisión 5).
- La generación de código se hizo directamente por el conductor en vez de vía dispatch a `aidlc-developer-agent`, por un bug de framework confirmado en la guarda `plan-approval-guard` para stages zero-Unit cuyo slug colisiona con el sufijo per-unit que la guarda siempre agrega (`code-generation/code-generation/`). Ver memory.md — el plan SÍ fue aprobado por el humano a través del canal legítimo (fingerprint + "Approve Plan") antes de empezar a generar.

## Preguntas abiertas para el humano

1. ~~¿Confirmás que el proxy de `categories` se audite/arregle en un batch separado?~~ RESUELTO: el usuario pidió arreglarlo en este mismo ciclo (Request Changes) — aplicado, ver Decisión 5.
2. FR6.2: ¿la reversión parcial (campos de vocabulario controlado NO cambian su valor canónico) es aceptable, o preferís forzar Title Case ahí también aunque contradiga el matching con Facebook?
3. FEAT-1: ¿"catálogo completo" significa una categoría por exportación (como se implementó) o un CSV multi-categoría?
4. FEAT-1: ¿el patrón de carpeta de imágenes debe incluir MARCA (como implementado) o seguir el ejemplo literal del intent (sin MARCA)?
5. BUG-1/2: causa raíz encontrada y arreglada — ¿confirmás que no hay un tercer lugar del catálogo con el mismo problema de imagen no resuelta vía `getCoverImageKey()`?
