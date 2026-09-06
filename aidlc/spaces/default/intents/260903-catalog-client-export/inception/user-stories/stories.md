# User Stories — Export de catálogo (formato cliente + ZIP de imágenes)

Persona: **Valeria** (ver `personas.md`). Breakdown por workflow step: disparar
export → recibir resultado → manejar errores/edge cases.

## US1.1 — Exportar catálogo en formato cliente

**Como** Valeria (vendedora/dealer),
**quiero** exportar mi catálogo de productos publicados en el mismo formato
CSV que uso para importar vehículos, empaquetado junto con las imágenes de
cada vehículo en un único archivo,
**para** poder cargarlo directamente en `facebook-auto-post` sin tener que
reformatear nada a mano.

**Prioridad**: Must Have.

**Trazabilidad**: FR1.1, FR1.2, FR1.3, FR2.1, FR2.2, FR2.3, FR2.4, FR4.1, NFR1, NFR2, NFR4.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-05T01:32:38Z
**Iteration:** 2

### Findings

Verificación de los 4 hallazgos de la pasada anterior:

| #   | Severidad original                                                         | Estado                          | Evidencia                                                                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Major — FR1.4 marcado `N/A` sin justificación                              | **Resuelto**                    | `traceability.json` ahora marca FR1.4 como `OK` con target `US1.1 (AC1.1.11)`; AC1.1.11 da un Given/When/Then concreto y testeable (`option` vacía, `description` con el valor exacto guardado) que corresponde exactamente al contenido de FR1.4.                                                                                                               |
| 2   | Major — US1.3 en Should Have pese al "DEBE" de NFR3                        | **Resuelto**                    | US1.3 quedó en Must Have con justificación explícita: una mitigación de seguridad/disponibilidad obligatoria aguas arriba no se degrada solo porque el usuario no la pidió.                                                                                                                                                                                      |
| 3   | Minor — placeholder sin definir en AC1.1.8                                 | **Resuelto**                    | AC1.1.8 fija el literal `sin-codigo` para el caso `Organization.code = None`, dejando claro que ese valor queda cerrado acá (a diferencia del número de NFR3, explícitamente diferido).                                                                                                                                                                          |
| 4   | Minor — `requirements.md` sin actualizar tras la decisión de ZIP combinado | **Tratado como deuda aceptada** | La sección `## Deuda documentada` es transparente: no se reabre un stage ya aprobado, y se deja constancia explícita para que Functional Design reconcilie el contrato del endpoint contra el comportamiento real ya fijado en estas historias. Tratamiento razonable — no oculta el gap, y consistente con no reabrir retroactivamente un artefacto ya cerrado. |

No se detectan hallazgos nuevos en esta pasada: `traceability.json` cubre el 100% de los FR/NFR con targets `OK` que existen en `stories.md`, las tres contribuciones ciegas de la ronda mob (design/developer/quality) están presentes, y las historias mantienen notas INVEST y AC en formato Given/When/Then testeable.

### Summary

Los tres hallazgos que bloqueaban la pasada anterior (2 Major, 1 Minor) quedaron corregidos con evidencia verificable en el propio artefacto, y el cuarto (deuda de `requirements.md`) recibió un tratamiento transparente y razonable sin reabrir un stage ya cerrado. El artefacto está listo para el gate.

**Acceptance Criteria**:

- **AC1.1.1**: Given tengo productos en estado `published` en mi organización, When hago clic en "Exportar catálogo (formato cliente)", Then se descarga un único archivo ZIP (no dos descargas separadas, no requiere ninguna acción adicional).
- **AC1.1.2**: Given el ZIP se descargó, When lo abro, Then contiene un archivo CSV en la raíz con exactamente 24 columnas, en el mismo orden y separador (`;`) que `docs/data39.csv`, incluyendo la columna `id`.
- **AC1.1.3**: Given el ZIP se descargó, When reviso su contenido, Then hay una carpeta por cada vehículo publicado, nombrada `<código_organización>/<año>-<marca>-<modelo>-<millas_en_K>-<color>-<código_organización>/`, conteniendo todas las imágenes de ese vehículo — con cada segmento del nombre (marca, modelo, color, código de organización) pasado por el sanitizador de nombres ya existente en el dominio (`_slug_part()`/`_sanitize_filename` equivalente) antes de concatenarse, para que ningún atributo de producto pueda alterar la ruta interna del ZIP. [design/developer, ronda 1: NFR2 sin AC — corregido]
- **AC1.1.4**: Given un vehículo tiene un color guardado (`attributes.exterior_color`), When se arma el nombre de su carpeta, Then el segmento de color usa ese valor real — nunca queda vacío ni usa un campo distinto que no exista.
- **AC1.1.5** (edge — catálogo vacío): Given mi organización no tiene ningún producto en estado `published`, When hago clic en exportar, Then veo un mensaje claro indicando que no hay productos publicados para exportar — respuesta HTTP 404 cuyo cuerpo sigue el contrato ya vigente de excepciones tipadas de dominio (`ProductError` + handler centralizado, mismo patrón que el resto de `product_router.py`), no un error genérico de servidor. [quality, ronda 1: shape de error sin contrato — corregido]
- **AC1.1.6** (edge — imagen no disponible): Given un vehículo tiene una imagen referenciada en `image_urls` que ya no se puede leer al armar el ZIP, When ocurre esto, Then el export NO se aborta por completo — el vehículo se incluye igual en el CSV y en su carpeta con las imágenes que sí están disponibles, y se emite un log de aplicación en nivel `warning` con, como mínimo, el `product_id` y la URL/clave de imagen que falló, para diagnóstico posterior. [quality, ronda 1: "queda registrado" sin especificar nivel/campos — corregido]
- **AC1.1.7** (aislamiento multi-tenant): Given estoy autenticada como Valeria de la Organización A, When exporto, Then solo veo productos de mi propia organización — el endpoint nunca acepta un identificador de organización distinto desde la petición.
- **AC1.1.8** (piso de test — límites de `Organization.code`): Given mi organización tiene un código (`Organization.code`) de 1 carácter o de 5 caracteres, When exporto, Then el segmento `{código_organización}` del nombre de carpeta refleja ese valor exacto. Given mi organización NO tiene código (`None`), When exporto, Then ese segmento usa el placeholder literal `sin-codigo` (valor fijado acá; no queda diferido a Functional Design, a diferencia del número de NFR3/AC1.3.2). [quality, ronda 1: ítem del piso de test de Practices Discovery sin AC equivalente — corregido; reviewer ronda 1: placeholder sin definir — corregido]
- **AC1.1.9** (piso de test — contrato de descarga): Given el ZIP se generó correctamente, When inspecciono la respuesta HTTP del endpoint (no solo el archivo ya descargado por el navegador), Then el header `Content-Type` es el de un ZIP binario y `Content-Disposition` trae `attachment` con un nombre de archivo — verificado de punta a punta a través del proxy BFF de Next.js, no solo en el backend. [quality, ronda 1: ítem del piso de test de Practices Discovery sin AC equivalente — corregido]
- **AC1.1.10** (estado de UI — progreso y éxito): Given inicié el export y el armado del ZIP toma más de un instante perceptible, When espero el resultado, Then veo una indicación de que el export está en curso (botón deshabilitado o spinner — el detalle visual queda para Refined Mockups) y, al completarse, una confirmación de que la descarga terminó. Un segundo clic mientras el export está en curso no dispara un segundo request. [design, ronda 1: sin estado de loading/éxito ni protección de doble-clic — corregido]
- **AC1.1.11** (contenido — `option`/`description`): Given un vehículo publicado tiene un valor guardado en `description`, When abro el CSV exportado, Then la columna `option` de ese vehículo está vacía y la columna `description` trae exactamente el valor guardado en el producto. [reviewer ronda 1: FR1.4 marcado `N/A` sin justificación válida — corregido, ver `traceability.json`]

**INVEST**: Independent (no depende de otra historia para entregar valor); Negotiable (el detalle de mensaje de error es ajustable); Valuable (resuelve el dolor real de reformateo manual); Estimable; Small (un flujo, un endpoint); Testable (11 AC concretos, Given/When/Then).

## US1.2 — Nombre sugerido para el archivo descargado

**Como** Valeria,
**quiero** que se me sugiera un nombre/ruta base antes de exportar, pero
poder editarlo libremente,
**para** reconocer fácilmente el archivo descargado y saber dónde ubicarlo
en mi flujo de trabajo con `facebook-auto-post`.

**Prioridad**: Must Have (pedido explícito del intent original).

**Trazabilidad**: FR3.1, FR3.2.

**Acceptance Criteria**:

- **AC1.2.1**: Given voy a exportar, When se abre el diálogo/paso de confirmación, Then veo un campo de texto editable con un valor sugerido por defecto.
- **AC1.2.2**: Given el campo tiene un valor sugerido, When lo edito antes de confirmar, Then el nombre que ingreso se usa como base del nombre del archivo ZIP descargado.
- **AC1.2.3** (fuera de alcance explícito, documentado como AC negativo): Given estoy en el diálogo, When busco un botón de "elegir carpeta en mi disco", Then NO existe tal botón — la descarga sigue el mecanismo estándar del navegador; no hay escritura directa al filesystem local ni selector de directorio del sistema operativo.

**INVEST**: Independent (se puede entregar aunque US1.1 cambie de implementación interna); Negotiable; Valuable (evita confusión sobre qué archivo es cuál); Estimable; Small; Testable.

## US1.3 — Aviso cuando el catálogo excede el límite de exportación

**Como** Valeria,
**quiero** ver un mensaje claro si mi catálogo es demasiado grande para
exportarse de una sola vez,
**para** entender que necesito reintentar o contactar soporte, en vez de ver
una descarga corrupta o un timeout silencioso.

**Prioridad**: Must Have (reclasificado en revisión: `requirements.md` NFR3
usa lenguaje obligatorio — "el endpoint DEBE acotar el volumen..." — para
mitigar un riesgo real de DoS por agotamiento de memoria; una mitigación de
seguridad obligatoria aguas arriba no se degrada a Should Have solo porque
el usuario no la pidió explícitamente).

**Trazabilidad**: NFR3.

**Acceptance Criteria**:

- **AC1.3.1**: Given mi catálogo de productos `published` supera el límite soportado por request, When intento exportar, Then veo un mensaje de error específico indicando que el catálogo excede el límite — no un timeout, no un ZIP corrupto o incompleto sin explicación.
- **AC1.3.2**: El valor exacto del límite (filas/imágenes/tamaño de ZIP) queda pendiente de dimensionamiento en NFR Design — esta historia fija el COMPORTAMIENTO esperado (rechazo total con mensaje claro), no el número.

**INVEST**: Independent; Negotiable (el número exacto es negociable, el comportamiento no); Valuable (evita una falla confusa en producción); Estimable; Small; Testable (una vez fijado el número en NFR Design).

## Deuda documentada (no corregida retroactivamente)

El reviewer de esta etapa señaló que `requirements.md` (Requirements Analysis,
ya aprobado) nunca fue corregido para reflejar la decisión de entrega tomada
acá en Q1 (un único ZIP combinado) — `FR1.1` sigue nombrando un endpoint con
sufijo `.csv` sin FR de ZIP. Se decidió NO reabrir ni editar retroactivamente
el artefacto de un stage ya cerrado; queda como nota explícita para que
**Functional Design** reconcilie el contrato exacto del endpoint (nombre,
`Content-Type`, forma de la respuesta) contra lo que estas historias ya
establecen como fuente de verdad del comportamiento real.
