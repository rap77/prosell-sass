# Requirements — 260911-cross-org-export-ux

## Intent Analysis

El intent `260911-export-org-selector` dejó funcional el wiring de UI
para exportar el catálogo cross-org de UNA organización elegida en el
selector del header, pero al probarlo en staging aparecieron ocho
necesidades reales que este intent resuelve juntas, full-stack: (1)
poder exportar TODAS las organizaciones de una vez, no solo una por
vez; (2) un label del selector desactualizado ("concesionarios",
vehicle-specific); (3) el selector no filtra realmente lo que se ve en
`/catalog`, solo alimenta el export; (4) el selector lista
organizaciones vacías; (5) un bug de datos preexistente (de
`260903-catalog-client-export`) donde varias columnas del CSV cliente
salen vacías o incorrectas; (6)-(7) dos campos del CSV (`path`,
`groups`) que no tienen dato en la plataforma y necesitan pedirse al
usuario; (8) UX/UI prolija en todo lo anterior. El objetivo de negocio
de fondo es que el mecanismo de export cross-org que ya está autorizado
y auditado en el backend (desde `260910-export-cross-org`) sea
realmente USABLE y CORRECTO desde la pantalla real, para cualquier
organización o para todas a la vez, con un archivo que calce con el
formato que el sistema externo del cliente espera.

## Functional Requirements

### FR1 — Selector de organización: label y filtrado por contenido

- **FR1.1**: El sistema DEBE renombrar el label del selector de
  organización de "Todos los concesionarios" a "Todas las
  organizaciones" en las dos ubicaciones donde aparece hoy (botón
  trigger y ítem de menú de limpiar selección).
- **FR1.2**: El sistema DEBE listar en el selector únicamente
  organizaciones que tengan al menos un producto (`product_count > 0`).
  Una organización con `product_count` ausente o `0` NO debe aparecer
  en la lista.

### FR2 — Selector de organización: modo "todas las organizaciones"

- **FR2.1**: El sistema DEBE agregar una tercera opción al selector,
  "Todas las organizaciones", representada como un valor especial
  reservado en el mismo campo de estado (`organizationStore
.viewingOrgId`) que ya existe — no un campo/modo separado.
- **FR2.2**: El valor por defecto del selector (sin selección
  explícita del usuario) DEBE seguir resolviendo a "mi propia
  organización" — nunca a "todas" — para no correr la asimetría de
  convención ya documentada en el endpoint de export (omitir
  `organization_id` significa "mi propia organización", nunca "todas").

### FR3 — Filtrado real del catálogo por la organización elegida

- **FR3.1**: El sistema DEBE hacer que la grilla de `/catalog` refleje
  la organización elegida en el selector del header — hoy la grilla
  siempre muestra los productos de la organización propia del usuario,
  sin importar qué organización esté elegida.
- **FR3.2**: Cuando el selector está en "todas las organizaciones", la
  grilla de `/catalog` DEBE mostrar productos de todas las
  organizaciones (comportamiento a definir en Functional Design en
  términos de paginación/orden, no resuelto acá).
- **FR3.3 (fuera de alcance explícito)**: Este requerimiento se limita
  a `/catalog`. Otras pantallas admin (ej. `review-queue`) NO están en
  alcance de este intent.

### FR4 — Export "todas las organizaciones"

- **FR4.1**: El sistema DEBE permitir exportar el catálogo cliente
  (CSV+ZIP) de TODAS las organizaciones en una sola descarga, cuando el
  selector está en modo "todas las organizaciones".
- **FR4.2**: Cada producto en el ZIP resultante DEBE aparecer en la
  carpeta/segmento de SU PROPIA organización (código de organización
  correcto por producto), no la de la primera organización resuelta
  durante el proceso.
- **FR4.3**: El límite `EXPORT_MAX_PRODUCTS=500` pasa a aplicarse como
  límite GLOBAL (no por-organización) al modo "todas las
  organizaciones". Si se supera, el sistema DEBE responder con el mismo
  error 413 ya existente para el caso de una sola organización — sin
  paginación ni cambio de arquitectura nuevo.
- **FR4.4**: El acceso al modo "todas las organizaciones" (tanto desde
  la UI como llamando el endpoint directamente) DEBE requerir el mismo
  permiso `ORG_ADMIN_VIEW_ALL`/`super_admin` ya exigido para exportar
  una organización ajena puntual — defensa en profundidad, no un
  chequeo nuevo distinto.

### FR5 — Confirmación de UI reforzada para "exportar todas"

- **FR5.1**: El banner de confirmación de export, cuando el modo
  elegido es "todas las organizaciones", DEBE mostrar un texto de
  advertencia adicional que mencione explícitamente la cantidad de
  organizaciones a exportar (ej. "Vas a exportar el catálogo de TODAS
  las organizaciones (N en total)"), sobre el mismo banner
  Continuar/Cancelar ya existente — sin palabra de confirmación
  tipeada.

### FR6 — Auditoría distinguible para "exportar todas"

- **FR6.1**: El log de auditoría (`logger.info()` ya existente en
  `product_router.py`) DEBE distinguir explícitamente un evento de
  "export de todas las organizaciones" de un evento de export de una
  organización ajena puntual — mismo mecanismo (sin tabla de auditoría
  dedicada), contenido/campo distinto.

### FR7 — Corrección del mapeo de columnas del CSV cliente

- **FR7.1**: La columna `VIN` del CSV DEBE tomar su valor de la clave
  `vin` (minúscula) de `attributes`, no de una clave `VIN` inexistente.
- **FR7.2**: La columna `body_style` DEBE tomar su valor de la clave
  `body_type` de `attributes`.
- **FR7.3**: La columna `clean_title` DEBE derivarse de `title_status`
  (`attributes`) con una conversión de valor INVERSA a la del import:
  `"clean"` → `"1"`, `"rebuilt"` → `"0"` — no un rename de clave sin
  conversión.
- **FR7.4**: La columna `groups` DEBE derivarse de `facebook_groups`
  (`attributes`, `list[str]`) uniendo los valores con coma
  (`",".join(...)`) — no `str()` de la lista.
- **FR7.5**: Las columnas `category` y `type` DEBEN derivarse de
  `product.category_id`, resuelto vía `CategoryRepository`, y
  traducido a través de una tabla de traducción nueva (categoría-real →
  vocabulario del cliente) — no los nombres reales del árbol de
  categorías tal cual. El valor final para cada categoría concreta es
  una decisión de Functional Design; el ejemplo de referencia
  confirmado es `category="Vehiculos"`, `type="Auto/camioneta"` (minúscula
  en "camioneta" — verificado carácter a carácter contra `docs/data39.csv`,
  no contra la transcripción de la entrevista) para la rama de vehículos
  terrestres. Functional Design DEBE re-verificar cada entrada de la
  tabla de traducción contra el CSV real, nunca contra un ejemplo
  transcripto en un documento intermedio.
- **FR7.6**: La columna `location` DEBE combinarse de `location_city` +
  `location_state`, usando el código de estado tal cual está guardado
  (ej. `"Orlando FL"`) — sin tabla de nombres completos nueva.

### FR8 — Popup de carpeta base de imágenes

- **FR8.1**: El sistema DEBE pedir al usuario, mediante un popup (mismo
  mecanismo `window.prompt()` con valor por defecto ya usado para el
  nombre del archivo exportado), una carpeta base para las imágenes, en
  TODO export (organización propia, una organización ajena, o todas) —
  no solo en el modo "todas".
- **FR8.2**: El valor por defecto sugerido en el popup DEBE ser
  `Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/` (tomado del
  ejemplo real de `docs/data39.csv`), editable por el usuario.
- **FR8.3**: Si el usuario cancela el popup (`null`), el export NO debe
  dispararse — mismo comportamiento que el popup de nombre de archivo
  existente.
- **FR8.4**: La columna `path` del CSV DEBE completarse, por producto,
  como la concatenación de la carpeta base confirmada + el código de
  organización + el nombre de carpeta del producto, ej.:
  `Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/MF/2020-EXPLORER-XLT-70K-GRIS-MF`.
  Qué lógica existente se reutiliza para construir el segmento de
  organización/carpeta del producto es una decisión de Functional
  Design, no de este requerimiento.

### FR9 — Popup de grupos de Facebook

- **FR9.1**: El sistema DEBE pedir al usuario, mediante un popup (mismo
  mecanismo que FR8.1), los grupos de Facebook a usar cuando un
  producto no tenga `facebook_groups` cargado, en TODO export.
- **FR9.2**: El valor por defecto sugerido en el popup DEBE ser
  `"1,2,3"`, editable por el usuario.
- **FR9.3**: Si el usuario cancela el popup, el export NO debe
  dispararse — mismo comportamiento que FR8.3.
- **FR9.4**: El valor confirmado por el usuario se usa como fallback
  ÚNICAMENTE para productos que no tengan `facebook_groups` propio — un
  producto con `facebook_groups` ya cargado sigue exportando el suyo
  (FR7.4), no el valor del popup.

## Non-Functional Requirements

- **NFR1 (Seguridad — auditoría)**: El evento de "export de todas las
  organizaciones" debe quedar registrado de forma distinguible del
  evento de export de una organización puntual (ver FR6.1) — auditable
  por grep sobre los logs existentes, sin tabla de auditoría dedicada
  nueva (consistente con el precedente ya afirmado de auditoría liviana
  para este tipo de operación).
- **NFR2 (Seguridad — autorización)**: El chequeo de permiso para
  "exportar todas" DEBE aplicar el MISMO mecanismo
  (`_check_org_scope_permission()`) ya usado para el export de una
  organización ajena puntual — no un mecanismo de autorización nuevo
  (ver FR4.4).
- **NFR3 (Confiabilidad — recursos)**: Riesgo residual aceptado, no
  resuelto por este intent: el ZIP del export se arma completo en
  memoria antes de streamear, así que el consumo de memoria de una
  request "todas las organizaciones" escala con el total de la
  plataforma, no de un tenant. `EXPORT_MAX_PRODUCTS=500` como límite
  global (FR4.3) acota parcialmente este riesgo, pero no lo elimina —
  documentado como riesgo aceptado, consistente con la postura de
  pipeline ya afirmada con gaps aceptados y no bloqueantes.
- **NFR4 (Testabilidad)**: Ver el piso mínimo de 6 tests ya afirmado en
  Practices Discovery (`team.md`/`project.md`) — regresión de valor
  para `clean_title`/`groups`; regresión negativa del comportamiento
  por defecto; resolución de `org_code` por-producto; wiring del
  filtrado real de grilla; filtro del picker por `product_count`;
  wiring de los 2 popups nuevos.

## Constraints

- El árbol real de categorías de la plataforma no puede cambiar de
  forma — la traducción al vocabulario del cliente (FR7.5) vive en una
  tabla nueva, no en un cambio al modelo de categorías existente.
- `EXPORT_MAX_PRODUCTS` sigue siendo un valor fijo en código (500),
  ahora aplicado globalmente en el modo "todas" — sin mecanismo de
  configuración dinámica nuevo.
- Los dos popups nuevos (FR8, FR9) usan `window.prompt()` — mismo
  mecanismo ya establecido en el codebase, sin introducir una librería
  de diálogos nueva.

## Assumptions

- Se asume que la resolución batch de `org_code` por-producto (FR4.2)
  puede seguir el patrón ya existente en producción
  (`_resolve_org_codes()` de `bulk_upload_vehicles.py`) — Functional
  Design lo confirma explícitamente.
- Se asume que la tabla de traducción categoría-real → vocabulario del
  cliente (FR7.5) puede resolverse con una estructura estática simple
  (diccionario o tabla de configuración) — no requiere una interfaz de
  administración nueva para mantenerla; Functional Design confirma esta
  asunción o la corrige.
- Se asume que "cantidad de organizaciones" en el texto de advertencia
  de FR5.1 puede calcularse del mismo listado ya filtrado por
  `product_count` (FR1.2) — es decir, el número mostrado es el de
  organizaciones CON catálogo, no el total de organizaciones en el
  sistema.

## Out of Scope

- Filtrar por `viewingOrgId` cualquier pantalla admin distinta de
  `/catalog` (ej. `review-queue`) — ver FR3.3.
- Subir o eliminar el límite `EXPORT_MAX_PRODUCTS` más allá de
  aplicarlo globalmente (FR4.3) — no hay paginación de export ni
  incremento de límite en este intent.
- Rate-limiting nuevo para el endpoint de export (ya evaluado y
  descartado en Practices Discovery — la infraestructura genérica
  existente acota frecuencia, no costo por-request; riesgo residual
  aceptado, ver NFR3).
- Una interfaz de administración para mantener la tabla de traducción
  de categorías (FR7.5) — la tabla en sí es requerida, pero su gestión
  puede ser estática/en código para este intent.
- Palabra de confirmación tipeada para "exportar todas" (descartada en
  Q6 — se eligió texto de advertencia en su lugar).

## Open Questions

Ninguna pregunta de producto queda abierta para User Stories — las 6
preguntas de Practices Discovery más las 7 de esta etapa (incluyendo el
seguimiento Q7) resolvieron todo el criterio de negocio necesario. Quedan
diferidas a Functional Design, ya señaladas explícitamente como fuera del
alcance de Requirements Analysis:

1. Estructura exacta de la tabla de traducción categoría-real →
   vocabulario del cliente (FR7.5) — qué categorías reales existen hoy y
   su valor equivalente exacto en el vocabulario del cliente, más allá
   del único ejemplo confirmado (vehículos terrestres).
2. Firma exacta de la extensión de `build_vehicle_zip_folder_name()`
   (FR8.4) para aceptar la carpeta base del usuario en vez de un valor
   fijo.
3. Comportamiento de paginación/orden de la grilla de `/catalog` cuando
   el modo es "todas las organizaciones" (FR3.2) — mencionado como
   explícitamente no resuelto en Requirements Analysis.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-11T00:00:00Z
**Iteration:** 1

### Findings

| #   | Severity | Location                      | Finding                                                                                                                                                                                                                                                                                                                                                                                                             | Recommendation                                                                                    |
| --- | -------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | Minor    | Intent Analysis (necesidad 8) | La necesidad #8 ("UX/UI prolija en todo lo anterior") no tiene un FR propio y dedicado — queda repartida implícitamente entre FR1.1 (label), FR5.1 (banner), FR8/FR9 (popups). No es un gap real (no hay un criterio de "prolijidad" testeable e independiente de esos FRs concretos), pero convendría una nota explícita en Functional Design confirmando que no queda ninguna superficie de UX suelta sin cubrir. | Ninguna acción bloqueante; señalar para Functional Design como checklist final, no como FR nuevo. |
| 2   | Minor    | FR8.4 / Open Questions #2     | El nombre de función real `build_vehicle_zip_folder_name()` aparece en Open Questions #2, no en el texto normativo de FR8.4 (que correctamente delega la decisión a Functional Design). Es una referencia legítima de contexto para la pregunta abierta, no una violación del hallazgo ya resuelto, pero se señala para que quede constancia de que se revisó con ese criterio.                                     | Ninguna acción — mantener tal cual.                                                               |

### Verificaciones puntuales

- **FR7.5** cita `type="Auto/camioneta"` (minúscula) — verificado carácter a carácter contra `docs/data39.csv` (`rtk proxy rg -n "Auto"`, 18 filas, todas `Auto/camioneta` en minúscula). El hallazgo previo de mayúscula/minúscula está resuelto correctamente en el artefacto.
- **FR8.2 / FR8.4** citan `Users/juanl/proy/facebook-auto-post/IMG/Vehiculos/` y el ejemplo completo `.../MF/2020-EXPLORER-XLT-70K-GRIS-MF` — verificados carácter a carácter contra `docs/data39.csv` (`rtk proxy rg -n "juanl"`), coinciden exactos, incluyendo la ausencia de `/` inicial.
- **FR9.2** cita `"1,2,3"` como default de grupos de Facebook — coincide con el valor real en `docs/data39.csv`.
- **FR8.4** describe comportamiento observable (concatenación carpeta base + código de org + carpeta de producto) sin nombrar una función de implementación en el texto normativo — el hallazgo previo de nombre de función embebido está resuelto.
- **Cobertura de las 8 necesidades** de `## Intent Analysis`: (1) export "todas" → FR2/FR4/FR5/FR6; (2) label desactualizado → FR1.1; (3) filtrado real de `/catalog` → FR3; (4) orgs vacías en el selector → FR1.2; (5) bug de mapeo CSV → FR7; (6)-(7) popups de carpeta base y grupos → FR8/FR9; (8) UX/UI prolija → repartida implícitamente, ver hallazgo Minor #1. Las 8 necesidades tienen cobertura funcional.
- **Consistencia interna**: FR2.2 (default nunca resuelve a "todas") no contradice FR2.1; FR4.3 (límite global) es consistente con NFR3 (riesgo residual aceptado) y con Constraints (`EXPORT_MAX_PRODUCTS` fijo en código); Out of Scope es consistente con Assumptions y con las decisiones Q5/Q6 de `requirements-analysis-questions.md`. Sin contradicciones detectadas.
- **Trazabilidad**: cada FR se origina en una de las 8 necesidades del Intent Analysis, en un hallazgo ya citado de Reverse Engineering/Practices Discovery (hallazgo #83 → FR4.2, hallazgo #85 → FR2.2), o en una respuesta explícita de `requirements-analysis-questions.md` (Q1→FR8.1/FR9.1, Q2→FR2.1, Q3+Q7→FR7.5, Q4→FR7.6, Q5→FR4.3, Q6→FR5.1). Ninguna FR parece inventada sin origen rastreable.

### Summary

Ambos hallazgos de la pasada anterior (mayúscula/minúscula en `type` y nombre de función embebido en FR8.4) están corregidos y verificados carácter a carácter contra `docs/data39.csv`. Las 8 necesidades de usuario tienen FRs correspondientes, no hay contradicciones internas entre FR/NFR/Constraints/Assumptions/Out of Scope, y la trazabilidad hacia Reverse Engineering/Practices Discovery/Q&A es clara. Los dos hallazgos Minor no bloquean — son observaciones de pulido para Functional Design, no gaps de producto. El artefacto está listo para User Stories.
