# Requirements Analysis — Batch de bugfixes de producción

## Fuentes

- `[desc]` Descripción inicial del intent (`aidlc-state.md` § Project Information) — 7 bugs reportados por usuarios activos + 1 feature (exportación CSV), con comportamiento esperado y orden de prioridad explícitos para cada uno.
- `[memory:M1..M4]` Codekb `aidlc/spaces/default/codekb/prosell-sass/` (business-overview.md, architecture.md, code-structure.md, reverse-engineering-timestamp.md) — reverse engineering de este mismo intent, con causa raíz trazada a nivel de archivo para 4 de los 7 bugs.
- `[Q1]`–`[Q5]` Respuestas del usuario en `requirements-analysis-questions.md` (incluye una pregunta de seguimiento por ambigüedad detectada en Q3).

## Intent analysis

El objetivo de negocio es estabilizar la operación diaria de la plataforma para vendedores, administradores de organización y compradores del marketplace público, corrigiendo 7 defectos reportados por usuarios activos y agregando una capacidad de exportación de catálogo que hoy no existe. No es una iniciativa de producto nueva: es mantenimiento correctivo dirigido, con alcance `express` (Depth Minimal, Test Strategy Minimal) `[scope]`.

Los bugs no son homogéneos en profundidad: la reverse-engineering encontró que 4 de los 7 (BUG-3/6, BUG-4, BUG-5, BUG-7) tienen causas raíz que requieren cambios de contrato de datos o de plomería backend, no solo ajustes de UI — información que el reporte original de usuario no podía conocer. Las respuestas a las preguntas de esta etapa confirmaron que el usuario quiere las soluciones de fondo, no parches superficiales, en los tres casos donde eso implicaba una decisión (BUG-3/6, BUG-4, BUG-5) `[Q1][Q2][Q3]`.

## Functional requirements

### FR1 — Cola de revisión: mostrar thumbnail del producto

**FR1.1** Cada registro en la pestaña "Cola de revisión" debe mostrar el thumbnail (imagen principal) del producto asociado. `[desc]`

_Nota de investigación_: la reverse-engineering no identificó la causa raíz de esta ausencia de imagen (fuera del alcance profundo del scan) — queda para investigación puntual en Code Generation. Ver Open Questions.

### FR2 — Lista de publicaciones (catálogo): mostrar thumbnail del producto

**FR2.1** La vista de lista de publicaciones debe incluir una columna con el thumbnail visible del producto. `[desc]`

_Nota de investigación_: mismo caso que FR1 — causa raíz no identificada en este pase, pendiente de investigación en Code Generation.

### FR3 — Editor de schema de categorías: selects deben retener y renderizar su valor

**FR3.1** El sistema debe usar un único contrato de tipo compartido entre el editor de schema de categorías (`CategorySchemaEditor`) y el renderer de formularios de producto (`SchemaFieldRenderer`) para el concepto de "entrada de atributo de schema" — eliminando la duplicación actual entre `AttributeField` (Zod, editor) y `AttributeSchemaEntry` (types/category.ts, renderer). `[Q2]`

**FR3.2** El contrato unificado debe exponer el campo `options` tanto en el editor como en el renderer, de forma que un administrador que elige "Render As → select" pueda cargar las opciones desde la misma UI. `[Q2]`

**FR3.3** El renderer de formularios debe decidir si renderiza un `<Select>` en base al campo `render_as`, no en base a la mera presencia de un array `options` no vacío (comportamiento actual). `[Q2]`

**FR3.4** Los dropdowns de "Type" y "Group" en el editor de schema deben reflejar visualmente el valor ya seleccionado en el state (bug de renderizado original reportado). `[desc]`

### FR4 — Campos select del formulario de vehículos

**FR4.1** Los campos "Bed Type", "Body Type", "Drivetrain", "Cab Type" y "Wheelbase Type" del formulario de vehículos deben renderizarse como selects/combobox cuando su schema de categoría los define como tales — consecuencia directa de FR3 (una vez el schema tenga `options` pobladas y el renderer decida por `render_as`, estos campos dejan de caer al input de texto por defecto). `[desc]`

### FR5 — Contacto de organización por WhatsApp: ocultar teléfono, mostrar dirección

**FR5.1** El endpoint público de producto debe exponer los datos de contacto de la organización necesarios para el mensaje de WhatsApp — específicamente nombre y dirección completa — mediante el join/lookup hacia los contactos de la organización que hoy no existe en el camino público. `[Q1]`

**FR5.2** El endpoint público NO debe exponer el teléfono de contacto de la organización, incluso si está registrado en `OrganizationContact`. `[desc]`

**FR5.3** El mensaje de WhatsApp generado desde la página pública de producto debe incluir nombre + dirección de la organización, sin teléfono. `[desc]`

### FR6 — Capitalización (Title Case) en formulario de vehículos

**FR6.1** Todos los campos de texto libre del formulario de vehículos —tanto los autocompletados por el decodificador VIN como los tipeados manualmente por el vendedor— deben normalizarse a Title Case (mayúscula al inicio de cada palabra: "spark" → "Spark", "HONDA CIVIC" → "Honda Civic"). `[Q3]`

**FR6.2** El valor canónico almacenado/utilizado para un atributo de vehículo (make, model, body_type, etc.) pasa a ser el valor en Title Case — no solo una transformación de presentación — incluyendo el valor que se envía a Facebook al publicar o scrapear. `[Q3][seguimiento]`

**FR6.3** Debe introducirse una utilidad de Title Case aplicada de forma consistente en los puntos donde hoy se persiste o compone el valor (incluyendo, como mínimo, el mapeo de datos decodificados del VIN, la composición del título automático del producto y la composición del subtítulo de catálogo). `[memory:architecture.md §Improvement Opportunities]`

### FR7 — Normalización de idioma en formularios de vehículos (español)

**FR7.1** Los labels en inglés de los formularios de vehículos (ej. "make", "trim", "mileage", "clean_title", "Doors", "Windows", "Bed Type") deben traducirse a español ("Marca", "Versión", "Millaje", "Título limpio", etc.), sin implementar un sistema de i18n multi-idioma completo. `[desc]`

**FR7.2** Esta normalización se limita a los formularios de vehículos — no incluye la remediación general del resto del panel admin/seller/CRM, aunque la investigación confirmó que el mismo patrón de strings hardcodeados está presente en más de 125 archivos (`docs/AUDIT-UI-UX-I18N-2026-07-21.md`). `[desc][memory:business-overview.md]`

### FR8 — Exportación de catálogo a CSV (FEAT-1)

**FR8.1** El sistema debe permitir exportar el catálogo completo a un archivo `.csv`, usando los mismos campos y el mismo orden de columnas que el importador CSV actual. `[desc]`

**FR8.2** `UNIVERSAL_COLUMNS` (hoy un `set` de Python sin orden garantizado entre reinicios del proceso) debe convertirse en una secuencia ordenada, compartida entre el endpoint de plantilla de importación existente y el nuevo endpoint de exportación, de forma que ambos deriven el orden de columnas de una única fuente de verdad. `[Q4]`

**FR8.3** Al usuario solo se le debe pedir el path de la carpeta destino para las imágenes exportadas. `[desc]`

**FR8.4** El nombre de cada carpeta de imágenes debe seguir el patrón `{AÑO}-{MARCA}-{MODELO}-{MILLAS_EN_K}K-{COLOR}-{CÓDIGO_ORG}`, en mayúsculas y separado por guiones (ejemplo: `2017-SPARK-128K-BLANCO-DK`). `[desc]`

**FR8.5** El CSV exportado debe incluir una columna con la ruta relativa a la carpeta de imágenes de cada producto. `[desc]`

## Non-functional requirements

**NFR1** — Cada requerimiento funcional de este batch debe tener al menos una prueba unitaria dirigida por requerimiento, con piso de happy-path por componente afectado, conforme a la Test Strategy Minimal del scope `express`. `[org.md §Testing Posture]`

**NFR2** — La suite de tests existente debe permanecer en verde después de cada grupo de fixes, sin regresiones introducidas por los cambios de este batch. `[org.md §Testing Posture]`

**NFR3** — El cambio de contrato de `attribute_schema` (FR3) no debe romper la validación de dominio existente (`Category.validate_attributes()`), que ya sabe validar `options` cuando están presentes. `[memory:architecture.md]`

## Constraints

- **C1** — Alcance `express`, Depth Minimal: no corresponde en este batch abordar deuda técnica no relacionada directamente con los 7 bugs + FEAT-1, aunque la investigación la haya detectado (ej. `CreateOrganizationUseCase` duplicado, archivo `auth_router.py.backup2`, drift de documentación de Tailwind). `[memory:architecture.md §Improvement Opportunities]`
- **C2** — No se implementa un sistema de i18n multi-idioma completo (locale de operador vs. locale de publicación) en este batch — queda explícitamente como feature separada futura. `[desc]`
- **C3** — El dominio backend (`apps/api/src/prosell/domain/`) debe seguir sin dependencias externas (regla de arquitectura del proyecto) — cualquier cambio en FR3/FR5 debe respetar la separación domain → application → infrastructure. `[org.md / CLAUDE.md]`
- **C4** — El fix de Title Case (FR6) no debe alterar el pipeline de decodificación VIN en sí (`nhtsa_vin_service.py`, `nhtsa_normalizer.py` como fuente de datos) — solo el punto donde el valor se compone/persiste como canónico. `[Q3][seguimiento]`

## Assumptions

- **A1** — El editor de schema de categorías (`CategorySchemaEditor`) es usado solo por roles `platform`/admin, por lo que unificar su contrato (FR3) no afecta a vendedores directamente — solo indirectamente, vía los productos que crean después del cambio. Sin validar explícitamente con el usuario; razonable dado el rol gating ya documentado en `architecture.md`.
- **A2** — Las categorías con `attribute_schema` ya guardado en producción que definan `render_as: "select"` sin `options` (el estado inconsistente que causó BUG-3/6) NO requieren una migración de datos automática como parte de este batch — se asume que basta con que el editor permita corregirlas manualmente hacia adelante. **No confirmado con el usuario** — ver Open Questions.
- **A3** (`[Q3][seguimiento]`) — Facebook Marketplace acepta/espera los valores de atributo de vehículo capitalizados (Title Case) al publicar/scrapear. El usuario indicó estar "casi seguro" pero no 100% confirmado. Esta asunción debe verificarse contra el código real de publicación/scraping a Facebook (fuera del scan profundo de este pase de RE) antes de implementar FR6.2 — si resulta falsa, FR6.2 debe revisarse para mantener dos representaciones del valor (canónico en minúsculas para Facebook, presentación en Title Case para humanos) en vez de una sola.

## Out of scope

- Migración completa a `next-intl` o remediación general de i18n fuera de los formularios de vehículos (C2, FR7.2).
- Reactivación o eliminación del sistema de i18n backend muerto (`infrastructure/i18n/translator.py`).
- Refactor de `CreateOrganizationUseCase` duplicado (`org/` vs `organization/`).
- Eliminación de `auth_router.py.backup2` y otra limpieza de deuda técnica no directamente relacionada.
- Corrección del drift de documentación de versión de Tailwind (`CLAUDE.md` dice 4.0, el repo tiene 3.4.17).
- Investigación de causa raíz de BUG-1/BUG-2 dentro de esta etapa — se investiga en Code Generation (ver Open Questions).
- Auditoría de otros proxies BFF (`organizations`, `categories`) por el mismo patrón de headers descartados encontrado en `products` en una sesión previa — mencionado como riesgo relacionado, no como alcance de este batch.

## Open questions

- **OQ1** — BUG-1/BUG-2 (thumbnails faltantes en cola de revisión y lista de publicaciones): la investigación no trazó causa raíz para estos dos bugs — quedó fuera del scan profundo. Debe investigarse en Code Generation antes de poder estimar si es un bug compartido (mismo componente de imagen) o dos bugs independientes.
- **OQ2** — Ver Assumption A2: ¿las categorías ya guardadas con `render_as: "select"` sin `options` necesitan un script de backfill/migración, o alcanza con permitir la corrección manual hacia adelante? No se preguntó explícitamente por ser un detalle de implementación de bajo impacto para el usuario final — recomendado confirmar con el owner de datos si aparecen categorías así en producción durante Code Generation.
- **OQ3** — Ver Assumption A3: verificar contra el código de publicación/scraping a Facebook si depende del formato exacto en minúsculas de los valores de atributo antes de implementar FR6.2.
