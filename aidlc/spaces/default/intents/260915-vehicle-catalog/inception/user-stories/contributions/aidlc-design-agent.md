**Collaborator:** aidlc-design-agent

## Contribution

### 1. La persona única calza bien para US1.1 y US2.1, pero NO para US1.2 (hallazgo verificado en código, no solo en el draft)

Para las dos pantallas efectivamente bocetadas en `wireframes.md` — Screen 1 (crear/editar vehículo) y Screen 2 (editar default de ubicación por producto) — el Admin de Dealership/Organización es el actor correcto: ambas superficies viven en flujos de creación/edición de catálogo que ya son responsabilidad exclusiva de ese rol, y ningún otro actor aparece en los dos diagramas ni en `user-flow.md`.

Pero **US1.2** ("Como Admin de Dealership, quiero que el editor de schema de categorías cargue valores directamente del catálogo de Facebook vigente...") atribuye esa acción a la persona equivocada. Verifiqué contra el código real, no contra el draft:

- `apps/api/src/prosell/infrastructure/api/routers/category_router.py:115-127` — `_require_platform_admin()`, con docstring explícito: _"The category taxonomy is GENERAL and platform-managed: only the ProSell platform admin can manage categories"_. Se aplica a `PATCH /{category_id}/attribute-schema` y `PATCH /{category_id}/schema` (líneas 275 y ~307), exigiendo `user.has_role("super_admin")`.
- `apps/api/tests/integration/api/test_category_schema_auth.py` — `test_tenant_admin_cannot_patch_schema()` (línea 49) y `test_tenant_admin_cannot_clone_schema()` (línea 103) prueban explícitamente que un tenant admin (= el Admin de Dealership/Organización de `personas.md`) NO puede tocar el schema de categorías.

Es decir: el editor de schema de categorías (`(seller)/categories/[id]/schema/page.tsx` + `SchemaAdminClient`) es una pantalla de **Platform Admin (super_admin)**, un rol de plataforma distinto y explícitamente bloqueado para el Admin de Dealership. `personas.md` ya lo anticipa correctamente en su propia sección de scope ("el equipo de ingeniería y los stakeholders de producto/negocio... son interesados de este trabajo, no usuarios finales") pero no extiende ese mismo razonamiento al Platform Admin, que SÍ es usuario final de una superficie que este intent toca (aunque esa superficie no tenga wireframe propio en Rough Mockups, porque US1.2 no genera una pantalla nueva — carga datos en una pantalla ya existente). La atribución de persona en el encabezado de US1.2 debería decir "Como Platform Admin" (o el nombre de rol que el equipo use para `super_admin`), no "Como Admin de Dealership" — el objetivo/beneficio de la historia (dejar de mantener dos catálogos a mano) sigue siendo válido, solo cambia quién lo experimenta.

### 2. AC1.1.2 necesita una señal visual explícita — hoy el wireframe solo tiene un indicador binario de decode

El wireframe Screen 1 muestra un único indicador a nivel de VIN completo: `(decodificado: OK)`. AC1.1.2 introduce un caso nuevo — un campo específico queda vacío porque su valor decodificado no calzó con ninguna opción del catálogo canónico — pero ni la historia ni el wireframe especifican cómo se comunica ESE vacío al usuario de forma distinguible de "el VIN simplemente no traía ese dato" o "es un campo opcional sin completar". Sin esa señal:

- El indicador binario `(decodificado: OK)` queda ambiguo: si un campo específico no pudo reconciliarse pero el resto del decode fue exitoso, ¿el badge sigue diciendo "OK"? Un "OK" genérico sobre un formulario con un campo vacío por mismatch es engañoso — el usuario puede asumir que no necesita revisar nada.
- Sin un mensaje inline en el campo mismo (ej. "no pudimos autocompletar este campo desde el VIN, verificalo" o un ícono de advertencia puntual), el usuario puede guardar el formulario sin completar ese campo pensando que es opcional, y recién se entera del problema cuando AC1.1.3 rechaza el guardado — un ciclo de error evitable si el feedback fuera visible en el momento del autocompletado, no solo en el momento de guardar.

Este es exactamente el principio de "error prevention over error messages": la señal debe aparecer cuando el campo queda vacío (AC1.1.2), no solo cuando el guardado falla (AC1.1.3). Propongo agregar un AC (o una nota de wireframe para Refined Mockups) que especifique un indicador visual/textual puntual en el campo afectado, distinto del indicador general de decode.

### 3. US2.1 no distingue "heredado del default de organización" de "override ya guardado a nivel de producto"

El wireframe Screen 2 muestra el mismo valor (`Sucursal A`) tanto en la línea de "Ubicación (default de organización)" como en el select editable — sin ningún indicador de si ese valor del select es el default heredado (AC2.1.2) o un override que el usuario ya guardó antes para ESE producto puntual (AC2.1.1/AC2.1.3). Sin esa distinción visual (ej. un badge "Heredado de la organización" vs. "Personalizado para este producto"), un admin no puede saber, con solo mirar la pantalla, si cambiar el default de la organización más adelante va a afectar a este producto o no — que es precisamente el valor que US2.1 promete ("no depender de un default genérico"). Sugiero un AC adicional o una nota de refined-mockups sobre este indicador de estado.

## Positions

- AGREE: El desglose por área de FR (US1/US2) y el mapeo de US1.1/US2.1 a los dos flujos ya bocetados es fiel a los wireframes aprobados — ambos flujos, ambos actores coinciden.
- OBJECT: US1.2 atribuye la acción al Admin de Dealership/Organización cuando el código real (`_require_platform_admin`, tests `test_tenant_admin_cannot_patch_schema`/`test_tenant_admin_cannot_clone_schema`) confirma que el editor de schema de categorías es exclusivo del Platform Admin (super_admin) — un actor distinto, no cubierto por `personas.md`.
- OBJECT: Falta un criterio de aceptación (o nota de diseño) sobre la señal visual distintiva cuando un campo queda vacío por mismatch de reconciliación (AC1.1.2) — sin ella, el indicador binario "(decodificado: OK)" del wireframe puede inducir al usuario a guardar sin notar el campo pendiente, provocando el rechazo evitable de AC1.1.3.
- OBJECT: Falta un criterio de aceptación (o nota de diseño) sobre un indicador visual que distinga "ubicación heredada del default de organización" de "ubicación con override ya guardado a nivel de producto" en Screen 2/US2.1 — sin él, el usuario no puede saber si un cambio futuro al default de organización afectará a este producto.
