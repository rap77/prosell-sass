**Collaborator:** aidlc-devsecops-agent

## Contribution

Revisé `team-practices.md`, `discovered-rules.md` y `evidence.md` del draft
del lead, más los hallazgos #87-93 de `code-quality-assessment.md`, y el
código real de `IPublisherService` (`apps/api/src/prosell/domain/ports/i_publisher_service.py`)
y sus tres adapters. Tres observaciones puntuales, todas con verificación
directa contra código — ninguna requiere una especialización nueva de
proceso de equipo (encaja como guía de implementación para Requirements
Analysis/Functional Design, per el criterio ya reconfirmado varias veces en
`project.md`).

**1. `IPublisherService` maneja dos clases de credencial sensible, no una — el draft solo nombra el token de forma genérica.**
Verifiqué el contrato real: los tres métodos (`publish`, `update`, `delete`)
reciben `access_token: str` ya **desencriptado** (el propio docstring dice
"Decrypted Facebook page access token"). Pero el docstring de
`playwright_publisher.py:76` aclara que para ese adapter el mismo parámetro
es en realidad "Facebook session cookies JSON string (Phase 1)" — una
credencial de alcance MAYOR que un token OAuth de página (una sesión de
cookies robada permite actuar como el usuario completo en Facebook, no solo
sobre la Marketplace API). Si este intent extiende el puerto o agrega una
capa de reconciliación de catálogos que toque este boundary (pregunta
abierta #93 en `evidence.md`), `team-practices.md` § Deployment debería
nombrar explícitamente, no solo "verificar los tres adapters":

- **Nunca loguear `access_token` ni incluirlo en mensajes de excepción** —
  verifiqué que hoy ninguno de los tres adapters lo hace (`grep` sobre
  `graph_api_publisher.py`/`playwright_publisher.py`/`null_graph_api_publisher.py`
  no encontró logging del parámetro), pero cualquier código NUEVO que
  envuelva o intercepte esta llamada (ej. para inyectar valores
  reconciliados del catálogo antes de publicar) hereda la misma
  obligación — no es automática solo porque el patrón actual ya la cumple.
- **Tratar el "access_token" de Playwright y el de Graph API con el mismo
  nivel de secreto**, aunque uno sea session cookies y el otro un token
  de página — cualquier código de reconciliación que toque este parámetro
  de forma genérica (por firma) no debe asumir que es siempre un token de
  alcance acotado.
- Esto no depende de si se activa la automatización en vivo (fuera de
  alcance, per el intent) — el riesgo está en tocar la firma/el flujo del
  puerto, no en ejecutar `publish()` de verdad.

**2. La desalineación de catálogos (#87) tiene una implicancia de seguridad concreta en el export, no solo de calidad de dato — no cubierta en el draft.**
Verifiqué `build_client_format_row()` (`csv_export.py:246`):
`values[column] = attributes.get(column)` escribe el valor de `attributes`
tal cual a la celda del CSV, y el writer real (`export_catalog_client_format.py:467`,
`csv.writer(csv_buffer, delimiter=";")`) es el módulo estándar de Python —
que escapa delimitador/comillas pero **no protege contra CSV/formula
injection** (un valor que empieza con `=`, `+`, `-` o `@` se interpreta como
fórmula al abrir el CSV en Excel/Sheets). Hoy esto es un riesgo residual de
baja probabilidad porque `Category.validate_attributes()` corre al guardar y
las `options` vienen de catálogos curados (no de input libre). Pero el
hallazgo central #87 aumenta esa probabilidad: si la reconciliación entre
los dos catálogos introduce un _fallback_ que acepta un valor decodificado
del VIN que no calza con ninguna `option` configurada (para no bloquear el
autocompletado), ese valor deja de ser "curado" y pasa a ser
efectivamente texto arbitrario que llega sin sanitizar hasta la celda del
CSV cliente. Recomiendo que `team-practices.md` § Testing Posture (o
Functional Design) agregue explícitamente: cualquier mecanismo de fallback
para valores no reconciliados debe (a) sanear el valor antes de escribirlo
a `attributes`/CSV (prefijar con `'` o rechazar valores que empiecen con
`=+-@`), o (b) rechazar el guardado en vez de aceptar el valor crudo — no
es aceptable que el fallback del hallazgo #87 abra una vía nueva de
inyección de fórmula en un archivo que el cliente abre directamente en
Excel.

**3. El gate de pre-commit ya afirmado (GGA bloqueante) aplica con fuerza especial a este intent — vale la pena nombrarlo explícito, no solo por referencia.**
El baseline ya afirmado (`project.md` § Mandated: "ALWAYS corregir TODO lo
que GGA señale... aunque sea preexistente") sigue vigente sin cambios, y el
draft no necesita una regla nueva. Pero este intent en particular toca una
concentración inusualmente alta de archivos que el propio scan ya marcó
como deuda técnica preexistente (#88 `CATEGORY_TRANSLATION_TABLE` sin test
dedicado, #89/#91 `FACEBOOK_FIELD_KEY_MAP` sin validación cruzada, #92
migraciones legacy ad-hoc). Es altamente probable que GGA superficie
hallazgos en esos mismos archivos al tocarlos — vale la pena que
`team-practices.md` lo nombre explícitamente como expectativa (no como
regla nueva) para que Deployment Execution no lo trate como scope creep
sorpresivo, sino como aplicación directa del mandate ya vigente.

Ninguna de las tres observaciones requiere `discovered-rules.md` §
Mandated nuevo — son guía de implementación acotada a este intent, mismo
criterio que el propio draft ya aplica en otras secciones.

## Positions

- AGREE: la decisión de no correr walking skeleton porque `IPublisherService`/`PublisherStrategySelector` ya están en producción — extender un puerto ya verificado en vivo es de menor riesgo que diseñarlo de cero, siempre que se preserven las invariantes de manejo de secretos del contrato existente (ver mi punto 1).
- OBJECT: el draft no distingue que el "access_token" del adapter Playwright es en realidad session cookies (credencial de mayor alcance) — si el intent toca el puerto o agrega reconciliación de catálogos en ese boundary, `team-practices.md` § Deployment debe nombrar explícitamente el manejo de logging/alcance de esa credencial, no solo "verificar los tres adapters".
- OBJECT: falta nombrar el riesgo de CSV/formula injection en `build_client_format_row()` (valores de `attributes` escritos sin sanitizar a la celda del CSV cliente vía `csv.writer` estándar) — la desalineación de catálogos del hallazgo #87 aumenta la probabilidad de que un valor no-curado llegue a esa ruta si se introduce un fallback permisivo.
