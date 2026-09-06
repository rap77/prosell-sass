# Requirements — Exportación de catálogo en formato CSV cliente + ZIP de imágenes

## Intent analysis

El vendedor/dealer necesita sacar su catálogo de ProSell hacia una herramienta
externa (`facebook-auto-post`) que consume un formato CSV específico — el
mismo formato que el cliente usa hoy para _importar_ vehículos a ProSell
(`docs/data39.csv`, 24 columnas, separador `;`). El objetivo no es un export
genérico de reporting, sino producir un archivo que otra herramienta pueda
leer sin transformación adicional, más un ZIP de imágenes organizado por
vehículo para que esa misma herramienta externa las asocie correctamente.

Fuente: `aidlc/spaces/default/intents/260903-catalog-client-export/audit/portatil-rap-c915f463315f.md`
(descripción inicial del intent) + reverse-engineering (`business-overview.md`,
`code-quality-assessment.md`) + practices-discovery (`evidence.md`,
`team-practices.md`) + esta entrevista.

## Functional Requirements

### FR1 — Endpoint de export en formato cliente

- **FR1.1**: El sistema expone un endpoint HTTP nuevo y dedicado (ej. `GET
/api/v1/products/export-client-format.csv`) para este formato, sin modificar
  el endpoint genérico existente (`GET /api/v1/products/export.csv`, FEAT-1).
  [Q1: A]
- **FR1.2**: El export incluye únicamente productos en estado `published` de
  la organización del usuario autenticado. El `tenant_id`/`organization_id`
  se resuelve SIEMPRE desde el JWT del usuario, nunca desde un parámetro de
  la petición — igual que el patrón ya vigente en `export.csv` (nunca el
  patrón de `list_products()`, que sí acepta `organization_id` de otro admin
  bajo permiso explícito). [Q3 follow-up]
- **FR1.3**: El CSV generado es estructuralmente idéntico a `docs/data39.csv`:
  24 columnas exactas, mismo orden, separador `;`, incluyendo la columna `id`.
  Header exacto: `id;cod_dealer;price;category;type;location;year;make;model;mileage;body_style;exterior_color;interior_color;clean_title;state;fuel_type;transmission;option;description;path;groups;label;publicado;VIN`.
  [confirmado por el usuario a mitad de Reverse Engineering, reafirmado acá]
- **FR1.4**: La columna `option` se exporta vacía (el dato original de
  `option` no se persiste hoy en el modelo de producto — se descarta en el
  import salvo un fallback de extracción de VIN por regex). La columna
  `description` se puebla con el valor guardado en el producto. [Q5: B]

### FR2 — ZIP de imágenes por vehículo

- **FR2.1**: El ZIP incluye TODAS las imágenes de cada vehículo (`image_urls`
  completo), no solo la portada. [Q4: A]
- **FR2.2**: Estructura de carpetas dentro del ZIP, por vehículo:
  `<código_organización>/<año>-<marca>-<modelo>-<millas_en_K>-<color>-<código_organización>/`
  (ejemplo: `MF/2020-EXPLORER-XLT-70K-GRIS-MF/`). `código_organización` es
  `Organization.code` (`str | None`, 1 a 5 caracteres — NO fijo en 2 como
  sugiere el ejemplo).
- **FR2.3**: Se corrige el bug ya confirmado en `build_image_folder_name()`
  (`apps/api/src/prosell/domain/services/csv_export.py`): debe leer el color
  desde `attributes["exterior_color"]`, no desde `attrs.get("color")` — hoy
  el segmento COLOR del nombre de carpeta se pierde silenciosamente para
  vehículos reales.
- **FR2.4**: El código nuevo que arma el ZIP reutiliza el sanitizador de
  nombres ya existente en el dominio (`_slug_part()` en `csv_export.py` o el
  equivalente probado en `CSVImageMapper`/`_sanitize_filename`) para nombrar
  carpetas y archivos dentro del ZIP — nunca concatenar atributos de producto
  (marca, modelo, color) sin sanitizar, para no abrir una superficie de
  zip-slip.

### FR3 — UX de destino de descarga

- **FR3.1**: Antes de exportar, la UI le pide al usuario una ruta/nombre base
  mediante un campo de texto editable, con un valor sugerido por defecto.
- **FR3.2**: Ese campo es puramente informativo/de nomenclatura — el
  navegador ejecuta la descarga ZIP estándar; la aplicación NO escribe
  directamente en el filesystem local del usuario ni ofrece un selector de
  carpeta del sistema operativo (se evaluó la File System Access API —
  descartada por incompatibilidad con Firefox y Safari). [Q2 + follow-up]

### FR4 — Manejo de errores

- **FR4.1**: Los errores del flujo de export (ej. una imagen referenciada en
  `image_urls` que no se puede leer al armar el ZIP, catálogo vacío) se
  modelan como una subclase nueva de `ProductError`
  (`apps/api/src/prosell/domain/exceptions/product_exceptions.py`), siguiendo
  la convención de excepciones tipadas por dominio ya vigente en el backend
  — no una jerarquía separada tipo `CatalogExportException`. [afirmado en
  Practices Discovery Q2]

## Non-Functional Requirements

- **NFR1 (Seguridad — aislamiento multi-tenant)**: El endpoint de export DEBE
  filtrar exclusivamente por el `tenant_id`/`organization_id` resuelto del
  JWT del usuario autenticado. Ningún parámetro de la petición (query, body)
  puede alterar qué organización se exporta — mitigación IDOR, patrón ya
  vigente en `export.csv`.
- **NFR2 (Seguridad — zip-slip)**: Todo nombre de carpeta/archivo escrito
  dentro del ZIP pasa por el sanitizador ya existente del dominio antes de
  concatenarse a una ruta interna del ZIP.
- **NFR3 (Disponibilidad — límite de recursos)**: El endpoint DEBE acotar el
  volumen de datos/imágenes procesadas en una sola respuesta para evitar
  agotamiento de memoria armando el ZIP completo en memoria (devsecops:
  riesgo de DoS). El valor exacto del cap (filas, imágenes totales, o tamaño
  de ZIP) queda como decisión de dimensionamiento para NFR Design — ver Open
  Questions.
- **NFR4 (Testing)**: Piso mínimo de test para este intent (afirmado en
  Practices Discovery, no cambia el piso general del proyecto):
  1. Regresión del bug de `build_image_folder_name()` usando la clave real
     `exterior_color`.
  2. Casos límite de `Organization.code`: 1 carácter, 5 caracteres, y
     ausente (`None`).
  3. Test de contrato para `Content-Type`/`Content-Disposition` del nuevo
     endpoint (el repo ya tuvo dos bugs reales de proxy forzando `.json()`
     sobre contenido no-JSON).

## Constraints

- No agregar dependencias nuevas: `zipfile` y `csv` (stdlib) ya alcanzan;
  `boto3`/`httpx` ya están instalados si hace falta leer bytes de imágenes ya
  subidas.
- Seguir la convención de nombres ya vigente de la familia `csv_*.py` en
  `domain/services/` para cualquier módulo nuevo.
- `IDOSpacesService` vive en `application/ports/` (no `domain/ports/` como
  indicaba una versión anterior de `code-structure.md`, ya corregida) — toda
  llamada de red/storage para leer imágenes va en `application`/
  `infrastructure`, nunca en `domain/services/` junto a la lógica pura de
  nombrado de carpetas.

## Assumptions

- El usuario exporta desde un navegador moderno (Chrome, Edge, Firefox o
  Safari) — el flujo de descarga estándar de ZIP funciona sin permisos
  especiales en cualquiera de los cuatro.
- La ruta/nombre sugerido por defecto es solo una ayuda de nomenclatura para
  que el usuario reconozca dónde ubicar manualmente el ZIP descargado dentro
  del flujo de `facebook-auto-post`; no hay integración directa con esa
  herramienta externa en este intent.
- `IDOSpacesService` no necesita un método nuevo de lectura (`get_object`) si
  se opta por leer las imágenes vía `httpx` contra las `image_urls` públicas
  ya guardadas en `Product` — la decisión final (agregar `get_object` al
  puerto vs. usar `httpx`) queda para Functional Design.

## Out of Scope

- Persistir el campo `option` original del CSV cliente en el modelo de
  producto (el export lo deja vacío en este intent).
- Exportar productos en cualquier estado que no sea `published` (draft,
  pending, paused, reserved, sold, rejected, archived quedan fuera).
- Selector de carpeta real vía File System Access API o cualquier mecanismo
  de escritura directa al filesystem local del usuario.
- Integración directa/automática con la herramienta externa
  `facebook-auto-post` (el intent solo produce el CSV+ZIP compatible).
- Modificar o deprecar el endpoint genérico existente `GET
/api/v1/products/export.csv`.

## Open Questions

- **Cap de recursos exacto (NFR3)**: ¿cuál es el límite razonable de
  filas/imágenes/tamaño de ZIP por request? No se le preguntó al usuario un
  número concreto — queda para NFR Design/Functional Design dimensionarlo
  (el precedente `max_rows=5000` del import existente es un punto de
  partida razonable a evaluar).
- **Lectura de imágenes**: decisión final entre agregar `get_object()` al
  puerto `IDOSpacesService` vs. usar `httpx` contra `image_urls` públicas —
  queda para Functional Design (ver Assumptions).
- **Nombre final del endpoint**: `export-client-format.csv` es un nombre
  propuesto en la entrevista, no confirmado como definitivo — Functional
  Design puede ajustarlo siempre que sea un endpoint nuevo y dedicado (FR1.1).

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-04T12:38:03Z
**Iteration:** 1

### Findings

| #   | Severity | Location                     | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Recommendation                                                                                                                                                                                                                                                           |
| --- | -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Critical | FR1 / FR2                    | El documento nunca especifica el mecanismo de entrega que relaciona el CSV (FR1) con el ZIP de imágenes (FR2). FR1.1 nombra un único endpoint nuevo con extensión `.csv` (`GET /api/v1/products/export-client-format.csv`), lo que sugiere `Content-Type: text/csv`. FR2 describe en detalle la estructura interna del ZIP (carpetas por vehículo, sanitización, imágenes) pero **no define ningún endpoint, ruta ni trigger propio** para producirlo. NFR4.3 habla de "el nuevo endpoint" en singular al describir el test de contrato de `Content-Type`/`Content-Disposition`, reforzando la ambigüedad: ¿es un solo endpoint que devuelve un ZIP combinado (CSV + carpetas de imágenes adentro, y entonces el sufijo `.csv` del nombre del endpoint sería engañoso), o son dos endpoints/descargas separadas (uno `.csv`, otro `.zip`) disparadas por una sola acción de UI? Q1 de la entrevista solo preguntó por el diseño del endpoint CSV — el ZIP nunca fue objeto de una pregunta de diseño equivalente, y tampoco aparece registrado en `## Open Questions`. Un developer no puede implementar FR1+FR2 sin adivinar esta decisión de arquitectura básica. | Antes de Functional Design, resolver explícitamente (con el usuario si hace falta) si es 1 endpoint que devuelve un único ZIP conteniendo el CSV + carpetas de imágenes, o 2 endpoints/descargas separadas — y reflejarlo como un FR nuevo o una corrección a FR1.1/FR2. |
| 2   | Major    | FR4.1                        | "Catálogo vacío" se declara como un caso de error mapeado a una subclase de `ProductError`, pero no se especifica el comportamiento observable: código HTTP, cuerpo de la respuesta, ni qué ve el usuario en la UI (¿mensaje de error, botón deshabilitado, CSV vacío con solo header?). Tal como está redactado, QA no puede escribir un test de pass/fail para este escenario — viola el requisito de "cada requerimiento debe ser testeable y verificable" de `phases/inception.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Especificar el contrato exacto: status HTTP, payload de error, y el estado de UI resultante cuando la organización no tiene productos `published`.                                                                                                                       |
| 3   | Major    | FR1.2                        | La cita de trazabilidad `[Q3 follow-up]` atribuye a la respuesta de Q3 tanto el filtro de estado (`published`) como la regla de seguridad "el tenant_id se resuelve SIEMPRE desde el JWT, nunca de un parámetro". Pero Q3 (pregunta y follow-up) tratan exclusivamente sobre qué estados de producto entran al export — en ningún momento se pregunta ni se responde sobre el origen del `tenant_id`. La regla de JWT-only es real y está bien fundamentada por el patrón ya vigente en `export.csv` (repetida correctamente en NFR1), pero la cita de fuente en FR1.2 es incorrecta y podría inducir a error a quien audite la cadena de trazabilidad de este FR contra la entrevista real.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Separar la cita: la parte de estado `published` cita `[Q3]`, la parte de JWT-only cita el patrón de reverse-engineering/`business-overview.md` (o una nueva cita `[RE: export.csv pattern]`), no `[Q3 follow-up]`.                                                       |
| 4   | Major    | NFR3                         | El cap de recursos (filas/imágenes/tamaño de ZIP) queda explícitamente sin definir y diferido a NFR Design — aceptable como decisión pendiente declarada. Pero el NFR tampoco define qué le pasa al usuario cuando el cap se excede (¿HTTP 413, export parcial, mensaje de error?), dejando el NFR completo sin un criterio de pass/fail verificable hoy, más allá de "existe algún límite".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Si el valor exacto se difiere a NFR Design, al menos fijar en este documento el comportamiento esperado al exceder el cap (rechazo total vs. parcial) para que NFR Design solo tenga que dimensionar el número, no diseñar el comportamiento de falla.                   |
| 5   | Minor    | NFR (dimensión no-funcional) | No hay ningún requerimiento de observabilidad (logging/auditoría) para el nuevo endpoint de export, pese a que el proyecto ya tiene un patrón establecido de auditoría para operaciones sensibles sobre `Product` (`ProductAuditLog`, ver `project.md`/`business-overview.md`) y este endpoint expone el catálogo completo + URLs de imágenes de la organización. No es necesariamente bloqueante — el equipo no lo mandató — pero es un gap real en la dimensión "atributos de calidad" del análisis de completitud.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Evaluar en Functional Design si corresponde loguear quién exportó y cuándo, aunque sea a nivel de log de aplicación (no necesariamente audit trail completo).                                                                                                            |
| 6   | Minor    | FR3.1                        | El campo de "ruta/nombre base" sugerido al usuario está descripto como puramente informativo, pero no se especifica el nombre de archivo por defecto real de la descarga (CSV y/o ZIP) que el navegador va a usar — distinto del texto que el usuario ve en el campo editable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Aclarar en Functional Design el nombre de archivo real de la descarga (ej. `catalogo_<org>_<fecha>.zip`).                                                                                                                                                                |

### Summary

El documento tiene buena trazabilidad de FR/NFR a la entrevista en la mayoría de los casos, y las cinco preguntas resueltas (Q1–Q5) están reflejadas fielmente. Sin embargo, hay un gap crítico de diseño no detectado durante la entrevista: la relación de entrega entre el CSV (FR1) y el ZIP de imágenes (FR2) — el corazón mismo del feature ("CSV cliente + ZIP de imágenes") — nunca quedó resuelta ni siquiera como pregunta abierta, y un developer no puede arrancar Functional Design sin adivinarla. Sumado a dos requerimientos de error/límite (FR4.1, NFR3) que no son testeables tal como están redactados y a una cita de trazabilidad incorrecta en FR1.2, el artefacto no está listo para pasar el gate sin una vuelta de aclaración.
