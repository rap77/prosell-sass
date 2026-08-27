# Requirements Analysis — Preguntas

Contexto: la reverse-engineering ya trazó causa raíz concreta para 4 de los 7 bugs (BUG-3/6, BUG-5, BUG-4, BUG-7). Estas preguntas apuntan solo a las decisiones de alcance que la investigación dejó abiertas — no repiten nada que el intent ya especificó explícitamente.

## Pregunta 1: BUG-4 — alcance de datos públicos para compartir contacto por WhatsApp

La investigación encontró que el endpoint público de producto (`public_product_router.py`) NO expone ningún dato de contacto de la organización hoy — ni teléfono ni dirección. El botón de WhatsApp arma un link genérico sin destinatario. Arreglar "debe ocultar el teléfono, mostrar solo la dirección" requiere primero decidir qué SÍ se expone públicamente, lo cual implica tocar el backend (join o endpoint nuevo hacia los contactos de la organización), no solo la UI.

A. Extender el endpoint público (agregar el join/lookup necesario) para exponer nombre + dirección — sin teléfono — como parte de este batch
B. Solo ajustar la UI actual si en algún momento llega a mostrarse un teléfono; no tocar la plomería del endpoint público ahora (el botón de WhatsApp seguiría sin destinatario)
C. Postergar BUG-4 completo para otro sprint, fuera de este batch
X. Other (please specify)

[Answer]: A. Extender el endpoint público (agregar el join/lookup necesario) para exponer nombre + dirección — sin teléfono — como parte de este batch

## Pregunta 2: BUG-3/6 — qué tan profunda debe ser la "solución permanente" del schema de categorías

El intent pide explícitamente "buscar la solución permanente, no un parche". La investigación encontró que el editor de schema (`AttributeField`, Zod) y el renderer de formularios (`AttributeSchemaEntry`, types/category.ts) son dos contratos de tipo DISTINTOS para el mismo concepto backend — el editor no tiene campo `options` y el renderer decide por presencia de `options`, no por `render_as`.

A. Unificar ambos contratos en un único schema Zod compartido, con `options` disponible en el editor y el renderer decidiendo por `render_as` en vez de por presencia de `options` (cambio más profundo, elimina la causa raíz de fondo)
B. Parche más acotado: solo agregar el campo `options` a `AttributeField` para que el admin pueda cargarlas, sin unificar los dos tipos ni tocar la lógica de decisión del renderer
C. Otra estrategia (especificar)
X. Other (please specify)

[Answer]: A. Unificar ambos contratos en un único schema Zod compartido, con `options` disponible en el editor y el renderer decidiendo por `render_as` en vez de por presencia de `options`

## Pregunta 3: BUG-5 — alcance de campos afectados por Title Case

A. Aplicar Title Case a TODOS los campos de texto libre del formulario de vehículos (autocompletados por VIN Y tipeados a mano por el vendedor), en el momento de presentación/guardado — sin tocar los valores "canónicos" en minúsculas que se usan para scraping/publicación a Facebook
B. Aplicar Title Case SOLO a los campos autocompletados por el decodificador VIN; lo que el vendedor tipea a mano queda como lo escribe
C. Otra combinación de alcance (especificar)
X. Other (please specify)

[Answer]: A. Todos los campos — "que sin tocar los valores en minúsculas si facebook los toma capitalizados" (respuesta textual del usuario, ambigua — ver Pregunta de seguimiento más abajo)

## Pregunta 4: FEAT-1 — fuente de verdad para el orden de columnas del CSV

La investigación encontró que `UNIVERSAL_COLUMNS` (usado hoy por la plantilla de importación) es un `set` de Python, cuyo orden NO está garantizado entre reinicios del proceso — un riesgo real para "mismos campos y orden que el importador actual".

A. Corregir `UNIVERSAL_COLUMNS` a una secuencia ordenada (tuple/list) como parte de este batch, compartida entre el importador existente y el nuevo exportador — una única fuente de verdad estable
B. Dejar `UNIVERSAL_COLUMNS` como está; el exportador reproduce el orden observado hoy de forma independiente, sin tocar el importador
C. Otra estrategia (especificar)
X. Other (please specify)

[Answer]: A. Corregir `UNIVERSAL_COLUMNS` a una secuencia ordenada, compartida entre el importador existente y el nuevo exportador

## Pregunta de seguimiento: BUG-5 — aclarar qué valores debe recibir Facebook

Tu respuesta a la Pregunta 3 fue "Todos los campos" pero con una aclaración textual ambigua: "que sin tocar los valores en minúsculas si facebook los toma capitalizados". Esto podría leerse de dos formas opuestas:

(a) Facebook necesita los valores en minúsculas/snake_case (como hoy los produce `nhtsa_normalizer.py`) — el Title Case se aplica SOLO en la capa de presentación humana, sin tocar el valor "canónico" que va a Facebook.
(b) Facebook en realidad espera/acepta los valores capitalizados, y por eso no habría problema en cambiar el valor canónico también a Title Case.

A. (a) — Facebook sigue recibiendo minúsculas/snake_case sin cambios; el Title Case es solo de presentación (formulario, título, subtítulo del producto)
B. (b) — Cambiar también el valor canónico a Title Case; Facebook debe recibir los valores capitalizados
C. Otra aclaración (especificar)
X. Other (please specify)

[Answer]: B. Facebook toma los valores capitalizados (Title Case) — el usuario está "casi seguro", no 100% confirmado. Cambiar el valor canónico también a Title Case en todos lados, incluido lo que recibe/scrapea Facebook. ASUNCIÓN A VERIFICAR: revisar el código real de publicación/scraping a FB antes de implementar, en caso de que dependa del formato exacto en minúsculas para matching.

## Consolidated Summary Confirmation

- BUG-4 (WhatsApp): se extiende el backend público (join/lookup a contactos de organización) para exponer nombre + dirección — sin teléfono — como parte de este batch.
- BUG-3/6 (schema selects): solución permanente = unificar `AttributeField` (editor) y `AttributeSchemaEntry` (renderer) en un único contrato Zod compartido con `options`, y el renderer decide por `render_as` en vez de por presencia de `options`.
- BUG-5 (Title Case): aplica a TODOS los campos del formulario de vehículos (VIN-autocompletados y tipeados a mano). El valor canónico se cambia a Title Case en todos lados, incluido lo que recibe/scrapea Facebook — marcado como ASUNCIÓN A VERIFICAR contra el código real de publicación FB antes de implementar, porque el usuario no tenía 100% certeza.
- FEAT-1 (export CSV): se corrige `UNIVERSAL_COLUMNS` a una secuencia ordenada, compartida entre el importador existente y el nuevo exportador, como parte de este batch.
- El resto del intent (BUG-1, BUG-2, BUG-7, orden de prioridad, alcance de i18n "solo UI sin multi-idioma completo", patrón de nombres de carpeta de FEAT-1) se toma tal como está especificado explícitamente en el intent original — sin ambigüedad detectada ahí.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
