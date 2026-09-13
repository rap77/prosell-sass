# User Stories — 260911-cross-org-export-ux

Personas: Ana (Super Admin de plataforma), Marcos (Vendedor/Dealer) —
ver `personas.md`.

## US1 — Selector de organización: label y filtrado por contenido

**Prioridad**: Must Have

### US1.1

Como Ana, quiero que el selector diga "Todas las organizaciones" en
vez de "Todos los concesionarios", para que el lenguaje refleje que la
plataforma no es exclusiva de vehículos/concesionarios.

**AC1.1.1**

```
Given que Ana abre el selector de organización en el header
When el selector se renderiza
Then el botón trigger y el ítem de menú de limpiar selección dicen "Todas las organizaciones"
```

### US1.2

Como Ana, quiero que el selector solo liste organizaciones que tengan
al menos un producto, para no perder tiempo navegando organizaciones
vacías.

**AC1.2.1**

```
Given que existen organizaciones con product_count > 0 y organizaciones con product_count 0 o ausente
When Ana abre el selector de organización
Then solo aparecen en la lista las organizaciones con product_count > 0
```

**AC1.2.2**

```
Given una organización con product_count ausente en la respuesta del backend
When se renderiza el selector
Then esa organización NO aparece en la lista (tratada como 0)
```

## US2 — Selector de organización: modo "todas las organizaciones"

**Prioridad**: Must Have

### US2.1

Como Ana, quiero elegir "Todas las organizaciones" como una opción más
del selector, para preparar un export o una vista de todo el catálogo
de la plataforma sin salir del mismo control que ya uso.

**AC2.1.1**

```
Given que Ana tiene permiso ORG_ADMIN_VIEW_ALL
When abre el selector de organización
Then ve "Todas las organizaciones" como una tercera opción, junto a su organización propia y las organizaciones puntuales
```

**AC2.1.2**

```
Given que Marcos NO tiene permiso ORG_ADMIN_VIEW_ALL
When Marcos interactúa con la UI
Then no ve la opción "Todas las organizaciones" en ningún selector
```

### US2.2

Como Ana, quiero que el sistema siga mostrando MI organización por
defecto cuando no elijo nada, para no exponer accidentalmente el
catálogo completo de la plataforma sin una elección explícita.

**AC2.2.1**

```
Given que Ana no ha hecho ninguna selección explícita en el selector
When se resuelve la organización activa (para grilla o export)
Then el sistema usa "mi propia organización", nunca "todas las organizaciones"
```

## US3 — Filtrado real del catálogo por la organización elegida

**Prioridad**: Must Have

### US3.1

Como Ana, quiero que la grilla de `/catalog` muestre los productos de
la organización que elijo en el selector del header, para poder
verificar visualmente qué voy a exportar antes de hacerlo.

**AC3.1.1**

```
Given que Ana elige una organización puntual en el selector del header
When la página /catalog se refresca
Then la grilla muestra únicamente productos de esa organización
```

### US3.2

Como Ana, quiero que la grilla muestre productos de todas las
organizaciones cuando elijo el modo "todas", para tener una vista
consolidada de la plataforma completa.

**AC3.2.1**

```
Given que Ana elige "Todas las organizaciones" en el selector
When la página /catalog se refresca
Then la grilla muestra productos de cualquier organización (no solo la propia)
```

### US3.3

Como Marcos, quiero seguir viendo únicamente mi propio catálogo en
`/catalog`, sin ningún cambio de comportamiento por este intent.

**AC3.3.1**

```
Given que Marcos no tiene permiso ORG_ADMIN_VIEW_ALL
When Marcos visita /catalog
Then la grilla muestra únicamente productos de su propia organización, sin selector cross-org visible
```

## US4 — Export "todas las organizaciones"

**Prioridad**: Must Have

### US4.1

Como Ana, quiero exportar el catálogo cliente (CSV+ZIP) de todas las
organizaciones en una sola descarga, para no tener que repetir la
exportación 29+ veces.

**AC4.1.1**

```
Given que Ana eligió "Todas las organizaciones" en el selector
When confirma el export del catálogo formato cliente
Then recibe un único CSV+ZIP con productos de todas las organizaciones con catálogo
```

### US4.2

Como Ana, quiero que cada producto del ZIP aparezca en la
carpeta/segmento de SU PROPIA organización, para que el material
quede correctamente organizado por dealer.

**AC4.2.1**

```
Given un export "todas las organizaciones" con productos de 2+ organizaciones distintas
When se genera el ZIP
Then cada producto aparece en la carpeta con el código de SU PROPIA organización, no la de otro producto exportado antes
```

### US4.3

Como Ana, quiero recibir un error claro si el catálogo completo supera
el límite permitido, para saber que necesito acotar el alcance del
export.

**AC4.3.1**

```
Given que el total de productos de todas las organizaciones supera EXPORT_MAX_PRODUCTS (500)
When Ana intenta exportar "todas las organizaciones"
Then recibe el mismo error 413 ya usado para el caso de una sola organización
```

**AC4.3.2** (caso límite, hallazgo de quality)

```
Given que el total de productos de todas las organizaciones es EXACTAMENTE 500
When Ana exporta "todas las organizaciones"
Then el export se completa normalmente (el límite es "mayor que 500", no "mayor o igual")
```

### US4.4

Como Marcos (sin permiso), quiero que el sistema rechace cualquier
intento de exportar "todas las organizaciones", incluso si intento
invocar el endpoint directamente, para que la restricción no dependa
solo de que la UI la oculte.

**AC4.4.1**

```
Given que Marcos no tiene ORG_ADMIN_VIEW_ALL
When invoca directamente el endpoint de export con el sentinel "todas las organizaciones" (sin pasar por la UI)
Then el use case rechaza la llamada con el mismo chequeo de permiso ya usado para el sentinel puntual de una organización ajena
```

### US4.5 (hallazgo de quality — caso de borde sin AC en el draft)

Como Ana, quiero un resultado predecible si exporto "todas las
organizaciones" cuando ninguna organización tiene productos, para
entender que no hay nada que exportar en vez de recibir un error
confuso.

**AC4.5.1**

```
Given que ninguna organización tiene product_count > 0
When Ana exporta "todas las organizaciones"
Then recibe el mismo comportamiento de "catálogo vacío" ya usado hoy para el export de una sola organización (404, per el precedente de 260903-catalog-client-export)
```

## US5 — Confirmación de UI reforzada para "exportar todas"

**Prioridad**: Should Have

### US5.1

Como Ana, quiero ver una advertencia clara antes de confirmar un
export de "todas las organizaciones", para tener conciencia del
tamaño real de la operación antes de dispararla.

**AC5.1.1**

```
Given que Ana eligió "Todas las organizaciones" y hay N organizaciones con product_count > 0
When abre el banner de confirmación de export
Then el banner muestra un texto que contiene el número N (ej. "Vas a exportar el catálogo de TODAS las organizaciones (N en total)"), sobre el mismo Continuar/Cancelar ya existente
```

> Nota para Functional Design (hallazgo de quality, mob-elaboration): el
> texto exacto queda a su criterio, pero el AC exige que el número N
> (cantidad de organizaciones con `product_count > 0`) aparezca de forma
> verificable, no solo "menciona la cantidad" en abstracto.

## US6 — Auditoría distinguible para "exportar todas"

**Prioridad**: Should Have

### US6.1

Como responsable de seguridad de la plataforma, quiero que el log de
auditoría distinga un export de "todas las organizaciones" de un
export de una organización ajena puntual, para poder responder por
grep si alguna vez se exportó el catálogo completo.

**AC6.1.1**

```
Given que Ana ejecuta un export "todas las organizaciones"
When se genera el log de auditoría
Then el log incluye un campo/valor que lo distingue explícitamente de un export de organización ajena puntual (ej. scope=ALL_ORGS)
```

> Nota para Functional Design (hallazgo de quality): el campo/valor
> exacto queda deliberadamente abierto acá (correctamente diferido por
> FR6.1) — Functional Design debe fijarlo antes de que Build and Test
> pueda escribir el test literal de este AC.

## US7 — Corrección del mapeo de columnas del CSV cliente

**Prioridad**: Must Have

### US7.1

Como Marcos, quiero que la columna `VIN` del CSV tenga el VIN real del
vehículo, para no tener que completarla a mano.

**AC7.1.1**

```
Given un producto con attributes["vin"] = "1HGCM82633A004352"
When se exporta el catálogo formato cliente
Then la columna VIN del CSV contiene "1HGCM82633A004352"
```

### US7.2

Como Marcos, quiero que `body_style` refleje el tipo de carrocería real
del vehículo.

**AC7.2.1**

```
Given un producto con attributes["body_type"] = "SUV"
When se exporta el catálogo formato cliente
Then la columna body_style del CSV contiene "SUV"
```

### US7.3

Como Marcos, quiero que `clean_title` tenga el valor "1"/"0" que el
sistema del cliente espera, no el string interno de la plataforma.

**AC7.3.1**

```
Given un producto con attributes["title_status"] = "clean"
When se exporta el catálogo formato cliente
Then la columna clean_title del CSV contiene "1"
```

**AC7.3.2**

```
Given un producto con attributes["title_status"] = "rebuilt"
When se exporta el catálogo formato cliente
Then la columna clean_title del CSV contiene "0"
```

### US7.4

Como Marcos, quiero que `groups` liste mis grupos de Facebook
separados por coma, en vez de un valor de lista mal formateado.

**AC7.4.1**

```
Given un producto con attributes["facebook_groups"] = ["A", "B"]
When se exporta el catálogo formato cliente
Then la columna groups del CSV contiene "A,B"
```

**AC7.4.2**

```
Given un producto con attributes["facebook_groups"] = []
When se exporta el catálogo formato cliente
Then la columna groups del CSV contiene "" (vacío)
```

### US7.5

Como Marcos, quiero que `category`/`type` usen el vocabulario que el
sistema del cliente reconoce, no los nombres internos del árbol de
categorías de la plataforma.

**AC7.5.1**

```
Given un producto categorizado en la rama de vehículos terrestres de la plataforma
When se exporta el catálogo formato cliente
Then category="Vehiculos" y type="Auto/camioneta" (valores del vocabulario del cliente, verificados contra docs/data39.csv)
```

### US7.6

Como Marcos, quiero que `location` combine ciudad y estado en un solo
valor legible.

**AC7.6.1**

```
Given un producto con location_city="Orlando" y location_state="FL"
When se exporta el catálogo formato cliente
Then la columna location del CSV contiene "Orlando FL"
```

## US8 — Popup de carpeta base de imágenes

**Prioridad**: Could Have

> Nota de orden (hallazgo de design): este popup aparece DESPUÉS del
> popup de nombre de archivo ya existente y ANTES del popup de grupos
> de Facebook (US9) — orden: archivo → carpeta base → grupos de
> Facebook. Cancelar cualquiera de los tres aborta el export completo
> (ver AC9.1.3 más abajo, que fija explícitamente la interacción entre
> US8 y US9).

### US8.1

Como Marcos, quiero que se me pregunte la carpeta base de imágenes al
exportar, con un valor sugerido, para no tener que editar el CSV a
mano después.

**AC8.1.1**

```
Given que Marcos confirma un export (cualquier tipo: propia org, org ajena, o todas)
When se dispara el flujo de export
Then aparece un popup pidiendo la carpeta base, sugerido con "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/"
```

**AC8.1.2**

```
Given que el popup de carpeta base está abierto
When Marcos cancela el popup
Then el export NO se dispara
```

### US8.2

Como Marcos, quiero que la columna `path` del CSV combine la carpeta
base confirmada con el código de mi organización y la carpeta de cada
producto.

**AC8.2.1**

```
Given carpeta base confirmada "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/", org_code="MF", y producto con carpeta "2020-EXPLORER-XLT-70K-GRIS-MF"
When se exporta el catálogo formato cliente
Then la columna path del CSV de ese producto contiene "Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/MF/2020-EXPLORER-XLT-70K-GRIS-MF"
```

## US9 — Popup de grupos de Facebook

**Prioridad**: Could Have

### US9.1

Como Marcos, quiero que se me pregunten los grupos de Facebook a usar
como fallback al exportar, con un valor sugerido, para los productos
que todavía no tienen grupos propios cargados.

**AC9.1.1**

```
Given que Marcos confirma un export (cualquier tipo)
When se dispara el flujo de export
Then aparece un popup pidiendo los grupos de Facebook, sugerido con "1,2,3"
```

**AC9.1.2**

```
Given que el popup de grupos de Facebook está abierto
When Marcos cancela el popup
Then el export NO se dispara
```

**AC9.1.3** (interacción entre popups, hallazgo de design/quality)

```
Given que Marcos confirma el popup de carpeta base (US8) y luego cancela el popup de grupos de Facebook (US9)
When se procesa la cancelación
Then el export NO se dispara, igual que si hubiera cancelado el primer popup
```

### US9.2

Como Marcos, quiero que el valor del popup se use SOLO para productos
sin `facebook_groups` propio, para no pisar datos ya cargados.

**AC9.2.1**

```
Given un producto CON facebook_groups propio y otro SIN facebook_groups, y el popup confirmado con "1,2,3"
When se exporta el catálogo formato cliente
Then el producto con facebook_groups propio exporta el suyo (AC7.4.1), y el producto sin facebook_groups exporta "1,2,3"
```

## Notes for Functional Design (mob-elaboration, non-blocking)

- **US4.2 — método de repositorio nuevo requerido (hallazgo de
  developer)**: el precedente citado en `team-practices.md`
  (`_resolve_org_codes()`) resuelve código→`organization_id`,
  tenant-scoped — la dirección que US4.2 necesita es la INVERSA
  (`organization_id`→`org_code`, cross-tenant). `AbstractOrganizationRepository`
  hoy no tiene un método batch para esa dirección; Functional Design
  necesita diseñar uno nuevo (ej. `get_by_ids_cross_tenant()`), no
  reusar el método literal del precedente. El patrón en espíritu
  (resolver todo antes del loop, un solo query batch, dict O(1)) sigue
  vigente.
- **Fricción acumulada de popups (hallazgo de design)**: con el popup
  de nombre de archivo ya existente + US8 + US9, cada export dispara 3
  `window.prompt()` secuenciales. Ninguna historia pide recordar el
  último valor (ej. `localStorage`) — vale la pena que Functional
  Design lo considere para no reintroducir trabajo repetitivo, aunque
  no es un requisito de `requirements.md` y no bloquea esta etapa.
- **Default de carpeta base expone un path ajeno (hallazgo de
  design)**: el valor sugerido en US8
  (`Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/`) es la ruta
  local de una persona específica, verificada correctamente contra
  `docs/data39.csv`, pero puede confundir a un dealer sin relación con
  ese nombre. Aceptado tal cual para este intent (confirmado en
  requirements.md FR8.2); Functional Design puede revisar el texto de
  ayuda del popup si lo considera necesario.
- **AC de resultado vs. AC de mecanismo para US3 (hallazgo de
  quality)**: AC3.1.1/AC3.2.1 verifican el efecto observable final
  (contenido de la grilla). El piso de test ya afirmado en
  `team-practices.md` (punto 4) exige además una aserción de mecanismo
  (el parámetro llega al hook, se dispara un refetch) — Build and Test
  no debe darla por cubierta solo con el AC de historia.

## Traceability Note

Ver `traceability.json` para el mapeo completo FR/NFR → US.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-12T02:21:16Z
**Iteration:** 1

### Correcciones aplicadas antes de este veredicto

| #   | Ubicación                             | Corrección mecánica                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `traceability.json`, target de `NFR4` | El target original listaba `US1.2, US2.2, US4.2, US3.1, US3.2, US8.1, US9.1` como cobertura del piso mínimo de 6 puntos de `team-practices.md`, pero omitía por completo el punto 1 (regresión de valor `clean_title`/`groups` → US7.3/US7.4) — precisamente el punto que el propio `team.md` marca como de mayor severidad ("impacto real de un bug no detectado es dato incorrecto enviado a un sistema externo del cliente"). También omitía US2.1/US4.4 del punto 2 (gating de UI + defensa en profundidad del use case), dejando solo US2.2 (default negativo). Corregido el target para listar los 11 US IDs reales con mapeo explícito punto→US. |
| 2   | `stories.md`, orden físico de US4.5   | US4.5 aparecía físicamente ANTES de US4.4 (`US4.3 → US4.5 → US4.4`), rompiendo tanto el orden numérico como la lectura secuencial del documento. Movida la sección US4.5 a su posición correcta, después de US4.4.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 3   | `stories.md`, orden físico de AC9.1.3 | AC9.1.3 (interacción entre popups, hallazgo de design/quality) estaba numerado bajo US9.1 pero ubicado físicamente DESPUÉS de la sección US9.2 y su AC9.2.1 — inconsistencia entre ID y posición que dificulta la lectura y la trazabilidad de Build and Test. Movido el bloque para que aparezca inmediatamente después de AC9.1.2, antes de la sección US9.2.                                                                                                                                                                                                                                                                                         |

Ninguna de las tres correcciones cambia el contenido de negocio de ninguna historia ni AC — son correcciones de exactitud de trazabilidad y de orden de lectura.

### Verificación de las 31 IDs de FR/NFR de `requirements.md`

Las 31 IDs (FR1.1–FR9.4, NFR1–NFR4) están presentes en `upstream_ids` de `traceability.json` y las 31 tienen entrada en `coverage[]`. Verificado contra `stories.md` que cada target `US{n}.{m}` referenciado existe realmente en el documento:

- FR1.1→US1.1, FR1.2→US1.2, FR2.1→US2.1, FR2.2→US2.2, FR3.1→US3.1, FR3.2→US3.2 — todos existen, contenido coherente con el FR.
- FR3.3→`N/A` con justificación explícita ("restricción de alcance, no una capacidad testeable por una historia") — consistente con el patrón ya usado para restricciones de alcance no testeables, y coherente con `requirements.md` § Out of Scope.
- FR4.1→US4.1, FR4.2→US4.2, FR4.3→US4.3, FR4.4→US4.4 — todos existen y el AC de cada uno cubre literalmente el FR (incluyendo el caso límite adicional AC4.3.2, hallazgo de quality, aditivo y no contradictorio).
- FR5.1→US5.1, FR6.1→US6.1 — existen, con notas explícitas para Functional Design sobre el texto/campo exacto (correctamente diferido, no un gap de esta etapa).
- FR7.1–FR7.6→US7.1–US7.6 — las 6 existen 1:1, cada AC fija valor de entrada conocido y valor de salida exacto (ej. AC7.3.1/AC7.3.2 para la inversión de `title_status`, AC7.4.1/AC7.4.2 para el join de `facebook_groups`), consistente con el piso de test más severo ya afirmado en `team.md`.
- FR8.1/FR8.2/FR8.3→US8.1 (agrupados, correcto: los tres regulan el mismo popup), FR8.4→US8.2 — existen.
- FR9.1/FR9.2/FR9.3→US9.1 (agrupados, correcto), FR9.4→US9.2 — existen.
- NFR1→US6.1, NFR2→US4.4+US2.1 — existen y son coherentes.
- NFR3→`N/A` justificado (riesgo residual aceptado, no mitigado por este intent) — consistente con `requirements.md` § NFR3.
- NFR4→corregido (ver tabla arriba) — ahora los 11 US IDs reales, con mapeo explícito a cada uno de los 6 puntos del piso mínimo.

Ningún target apunta a una historia inexistente. Ninguna FR/NFR queda sin entrada de cobertura.

### Verificación de integración de los tres hallazgos de contribuciones ciegas

Confirmado leyendo las tres contribuciones y comparando contra `stories.md` — las tres están efectivamente reflejadas en el artefacto final, no solo mencionadas en el archivo de contribución:

- **design** — fricción acumulada de popups: integrada como nota en `## Notes for Functional Design` ("Fricción acumulada de popups"). Path de "juanl": integrada como nota en la misma sección ("Default de carpeta base expone un path ajeno"). Orden/cancelación parcial: integrada de forma MÁS fuerte que una nota — se agregó la nota de orden explícita bajo `## US8` ("archivo → carpeta base → grupos de Facebook") y un AC nuevo y concreto (AC9.1.3) que fija el comportamiento de cancelación parcial, no solo una nota diferida.
- **developer** — método de repositorio nuevo para US4.2: integrado como nota en `## Notes for Functional Design` ("US4.2 — método de repositorio nuevo requerido"), con el detalle técnico completo (dirección inversa, cross-tenant, método a diseñar) preservado fielmente desde la contribución.
- **quality** — AC5.1.1/AC6.1.1 vagos: ambos tienen nota explícita "Nota para Functional Design" inmediatamente debajo de su AC respectivo, señalando qué falta fijar. Los 3 casos de borde (universo vacío en export "todas", cancelación del segundo popup, valor límite exacto de `EXPORT_MAX_PRODUCTS`) están resueltos con ACs nuevos y concretos (AC4.5.1/US4.5, AC9.1.3, AC4.3.2 respectivamente) — no como notas diferidas, sino como cobertura de test real agregada al artefacto. El cuarto punto (AC de mecanismo vs. resultado para US3) está integrado como nota en `## Notes for Functional Design`.

Las tres contribuciones fueron `AGREE` con hallazgos aditivos (`OBJECT` no bloqueantes, sin disputas entre colaboradores) — consistente con el patrón ya aprendido de integrar directo sin escalar a ronda 2, y la integración real en el artefacto lo confirma.

### Formato INVEST / Given-When-Then

Las 25 sub-historias (US1.1–US9.2) siguen el formato actor+acción+valor de negocio en la narrativa "Como X, quiero Y, para Z". Todos los ACs usan bloques `Given/When/Then` explícitos. IDs consistentes en todo el documento: `US{grupo}.{secuencia}` y `AC{grupo}.{secuencia}.{n}`, sin colisiones ni huecos numéricos no documentados (US4.5 es aditivo, señalado explícitamente como "hallazgo de quality — caso de borde sin AC en el draft"). Cada historia es independientemente testeable — las únicas dependencias son de precondición BDD normal entre historias del mismo grupo (ej. US3.2 asume el sentinel de US2.1), no dependencias de secuenciación de implementación.

### Consistencia con decisiones cerradas de `requirements.md`

Ninguna historia contradice una decisión ya cerrada: el sentinel de "todas" no reemplaza el campo (`organizationStore.viewingOrgId`, consistente con FR2.1); el default nunca resuelve a "todas" (AC2.2.1, consistente con FR2.2); FR3.3 (fuera de alcance `/catalog`) no tiene ninguna historia que lo contradiga; FR5.1 descarta explícitamente palabra de confirmación tipeada y ninguna historia la introduce; los popups usan `window.prompt()` sin librería nueva, consistente con Constraints.

### Summary

El artefacto llega sólido: las 31 IDs de FR/NFR tienen cobertura completa y verificable en `stories.md`, y las tres contribuciones ciegas de la ronda mob quedaron genuinamente integradas — en varios casos con ACs nuevos y concretos, no solo notas. Encontré y corrigí directamente tres defectos mecánicos (un gap real de trazabilidad en el target de NFR4 que omitía el punto más severo del piso de test, y dos inconsistencias de orden físico entre ID y posición) antes de este veredicto. Ningún hallazgo restante requiere una decisión de producto — las notas diferidas a Functional Design (texto exacto de AC5.1.1, campo exacto de AC6.1.1, método de repositorio de US4.2) están correctamente señaladas como tales, no como gaps de esta etapa.
