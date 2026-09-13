**Collaborator:** aidlc-developer-agent

## Contribution

Evalué implementabilidad y tamaño de las 9 historias (25 sub-historias
US1.x–US9.x) contra el código real (`csv_export.py`,
`export_catalog_client_format.py`, `bulk_upload_vehicles.py`,
`csv_field_mapper.py`, `organizationStore.ts`,
`schemas/organizations.ts`, `OrganizationPicker.tsx`, `catalog/page.tsx`,
`products.ts`). No usé `graphify query` como primer paso porque para
este tipo de verificación (valores exactos línea a línea, firma de
función, contenido de un archivo puntual) el propio Paso 0 ya afirmado
en `project.md` reserva la lectura directa — pero sí lo corrí primero
en los tres temas señalados en el brief y confirmé que las líneas/nodos
que devolvió apuntaban a los mismos archivos que terminé leyendo
directamente para el detalle exacto.

### US4.2 (resolución de `org_code` por-producto) — verificado, historia bien dimensionada

Confirmé el bug real citado en `component-inventory.md`/hallazgo #83:
`ExportCatalogClientFormatUseCase.execute()` hoy resuelve `org_code`
**UNA sola vez** (`organization = await
self._organization_repository.get_by_tenant_id(tenant_id)`, línea 111)
y lo reutiliza sin cambios en el loop completo de `products` para
`build_client_format_row()` y `build_vehicle_zip_folder_name()`
(líneas 127-147). Para el modo "todas" esto produciría exactamente el
bug que US4.2 describe (todos los productos con el código de la
PRIMERA organización resuelta). La historia es real, no redundante con
ninguna otra, y su AC (US4.2/AC4.2.1) es directamente testeable de forma
aislada del resto de US4 — tamaño correcto.

**Precisión técnica para Functional Design (no es un defecto de la
historia, es una aclaración de la guía de implementación ya afirmada en
`team.md`)**: el patrón citado como precedente,
`_resolve_org_codes()` de `bulk_upload_vehicles.py` (línea 248-278),
resuelve **código de string → `organization_id`** vía
`AbstractOrganizationRepository.get_by_codes()`, siempre acotado a un
solo `tenant_id`. El caso de US4.2 es la operación INVERSA:
**`organization_id` (ya conocido, FK del `Product`) → `org_code`**, y
CROSS-tenant (productos de 2+ organizaciones distintas). Revisé
`AbstractOrganizationRepository` completo
(`domain/repositories/organization_repository.py`) y hoy NO existe un
método batch para esa dirección — `get_by_id()` es singular y
tenant-scoped, `get_by_tenant_id()` es singular, `get_by_codes()` es
batch pero por código y (a confirmar) tenant-scoped. El "mismo patrón"
que `team.md` cita es correcto en **espíritu** (resolver todo antes del
loop, un solo query batch, dict de lookup O(1)) pero Functional Design
va a necesitar diseñar/agregar un método de repositorio nuevo (algo
como `get_by_ids_cross_tenant()` o extender `get_all()`), no reusar
`_resolve_org_codes()` literalmente. Esto no cambia el tamaño de la
historia — sigue siendo una única AC testeable — pero sí es información
que Functional Design necesita para no asumir que el método batch ya
existe.

### US7.3/US7.4 (transformación de valor, no rename) — verificado, y el alcance real es MAYOR al de estas dos historias puntuales

Leí `build_client_format_row()` completo (`csv_export.py` líneas
161-193). Hoy TODAS las columnas de `_CLIENT_FORMAT_ATTRIBUTE_COLUMNS`
(incluyendo `clean_title`, `groups`, `category`, `type`, `location`,
`VIN`, `body_style`, `state`) se completan con un passthrough literal:
`values[column] = attributes.get(column)` — sin ninguna transformación,
ni siquiera de clave. Esto confirma exactamente lo que
`component-inventory.md` documenta ("5 de 8 columnas... requieren
transformación de VALOR") y lo que US7.1-7.6 describen individualmente.
Contrasté además contra `csv_field_mapper.py` (dirección de import):
`parse_title_status()` mapea `"1"→"clean"`, `"0"→"rebuilt"`; US7.3/FR7.3
piden la inversa exacta (`"clean"→"1"`, `"rebuilt"→"0"`) — consistente,
sin inversión de signo accidental. `parse_facebook_groups()` en el
import separa por coma hacia una lista; US7.4/FR7.4 piden la inversa
(`",".join(...)`) — consistente. Ningún AC de US7 contradice la
dirección real del mapeo inverso.

División en 6 sub-historias (US7.1-US7.6), una por columna: tamaño
CORRECTO, no artificialmente partido — cada columna tiene una lógica de
transformación genuinamente distinta (passthrough de otra clave para
VIN/body_style, inversión booleana para clean_title, join de lista para
groups, resolución cross-repo + tabla de traducción nueva para
category/type, concatenación de dos campos para location). Fusionarlas
en una sola historia diluiría la granularidad de AC que el piso de test
ya afirmado en `team.md` exige (valor de entrada conocido → valor de
salida exacto, por columna).

### US1.2/US2.1 vs. campos reales de `OrganizationSchema`/`organizationStore.ts` — verificado, sin inconsistencia

`OrganizationSchema` (`apps/web/src/lib/api/schemas/organizations.ts`,
línea 79) ya expone `product_count: z.number().optional()` — US1.2/FR1.2
(filtro client-side por `product_count > 0`, tratando ausente como 0)
es implementable sin ningún cambio de backend, tal como
`component-inventory.md` ya documentaba. `organizationStore.ts`
(`viewingOrgId: string | null`, línea 58) hoy solo distingue "mi org"
(`null`) de "una org puntual" (string = UUID) — no existe un tercer
estado. US2.1/FR2.1 pide agregar un valor sentinel reservado en el MISMO
campo (no un campo nuevo) — técnicamente correcto y de bajo riesgo,
siempre que Functional Design elija un sentinel que nunca colisione con
un UUID real (ej. un string no-UUID tipo `"ALL_ORGS"`). No encontré
ningún guard existente en `setViewingOrgId()` (líneas 361-367) que
rechace un sentinel no-UUID — el guard actual solo verifica el permiso
`ORG_ADMIN_VIEW_ALL`, así que agregar el sentinel no rompe el guard
existente.

### US3.1/US3.2 (filtrado real de grilla) — confirmado que es superficie 100% nueva

Verifiqué `catalog/page.tsx`: `viewingOrgId` (línea 320) hoy se usa
EXCLUSIVAMENTE para `resolveExportOrganization()` (banner de export,
líneas 320-327) — el objeto `apiFilters` que alimenta
`useInfiniteProducts(apiFilters, 50)` (líneas 379-394) no incluye
`organization_id`/`viewingOrgId` en absoluto. `ProductFilters` (grep en
`products.ts`) tampoco declara hoy un campo `organization_id`. Esto
confirma que US3.1/US3.2 son trabajo genuinamente nuevo (no wiring
trivial de un campo ya presente) — consistente con la Prioridad "Must
Have" y con el tamaño de 2 historias (una org puntual, todas las
organizaciones) más una tercera (US3.3) que fija el comportamiento sin
cambios para Marcos. Las tres son independientemente testeables.

### Precedente de `window.prompt()` — confirmado

`catalog/page.tsx` ya tiene 2 usos de `window.prompt()` (líneas 507 y
577, carpeta destino de export genérico y nombre de archivo) — el
mecanismo que FR8.1/FR9.1 piden reusar existe y está en el mismo
archivo donde US8/US9 van a agregar los dos popups nuevos. Tamaño de
US8 (2 historias: pedir popup + usar el valor en `path`) y US9 (2
historias: pedir popup + fallback solo-si-falta) es correcto — separar
"pedir el dato" de "usarlo" es la misma frontera de test que ya aplica
el team-practices point 6 (wiring del popup) vs. point 1 (transformación
de valor en `build_client_format_row()`).

### Tamaño global

25 sub-historias es un número alto para un solo Bolt, pero cada una es
pequeña, atómica y trazable a un FR/AC concreto y a una causa raíz de
código ya verificada (no hay ninguna "épica disfrazada" ni ninguna
historia que dependa de otra para tener sentido como unidad de test
aislada — las dependencias son de precondición BDD normal, ej. US3.2
asume que el sentinel de US2.1 existe, lo cual es correcto en Given/
When/Then). La decisión de bundlear todo en un solo Bolt (ya afirmada
en `team.md` como reconfirmación del precedente
`260903-catalog-client-export`) es de Delivery Planning, no una
objeción de tamaño de historia individual.

## Positions

AGREE: Las 9 historias (25 ACs) están bien dimensionadas — ninguna es una épica disfrazada, ninguna está artificialmente partida. Verifiqué contra código real que US4.2 (bug de org_code por-producto), US7.1-7.6 (passthrough sin transformación en `build_client_format_row()`), US1.2 (`product_count` ya existe en el schema), US2.1 (sentinel nuevo en el mismo campo `viewingOrgId`), y US3.1-3.3 (grilla nunca consumió `viewingOrgId`, superficie 100% nueva) describen exactamente el estado real del código, sin ningún AC técnicamente inconsistente con lo que encontré.
OBJECT: None.
