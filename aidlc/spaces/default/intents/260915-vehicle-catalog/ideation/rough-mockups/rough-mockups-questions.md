## Sources

- [desc] Initial description: "Implement canonical Facebook vehicle catalog references across category schemas, dynamic selects, VIN decode normalization, vehicle import/create/update validation, organization-location defaults editable per product, legacy migration, and publisher adapter contracts; keep live Facebook automation out of scope."
- [scope] Workflow-selected scope: `feature`.
- [consumes:intent-statement] `aidlc/spaces/default/intents/260915-vehicle-catalog/ideation/intent-capture/intent-statement.md`
- [consumes:scope-document] `aidlc/spaces/default/intents/260915-vehicle-catalog/ideation/scope-definition/scope-document.md`
- [consumes:intent-backlog] `aidlc/spaces/default/intents/260915-vehicle-catalog/ideation/scope-definition/intent-backlog.md`

## Q1. De los 4 grupos de trabajo del backlog, ¿cuáles tienen una superficie de UI real que valga la pena bocetar en esta etapa? (elegí todas las que apliquen)

A. Grupo 1 (datos y validación) — los selects dinámicos de categoría/atributo en el formulario de creación/edición de vehículos, donde el usuario elige valores que ahora deben ser canónicos de Facebook.
B. Grupo 2 (defaults de ubicación/organización) — una interfaz donde el usuario edita el default de ubicación por producto.
C. Grupo 3 (migración legacy) y Grupo 4 (contratos de adapter) — sin superficie de UI nueva, son trabajo de backend/datos.
D. Ninguno tiene UI nueva relevante — toda la iniciativa es backend/API.
X. Otro (especificar)

[Answer]: A, B, C

## Q2. ¿Cuál es el flujo principal (happy path) que querés que boceten los wireframes?

A. Un usuario crea o edita un vehículo, elige categoría/atributos desde los selects dinámicos ya canónicos, y el sistema valida/guarda sin errores de mapeo.
B. Un usuario administrador edita el default de ubicación de un producto específico, y ese default queda reflejado la próxima vez que se exporta/publica ese producto.
C. Ambos flujos (A y B) son igualmente relevantes para esta etapa.
D. Otro flujo (especificar en "Otro").
X. Otro (especificar)

[Answer]: C

## Q3. ¿Hay guías de marca, design system o patrones de UI existentes a seguir?

A. Sí — reutilizar los patrones ya establecidos en el proyecto (CategorySelectorModal, GenericFormFields/GenericProductForm, OrganizationPicker) en vez de proponer un patrón visual nuevo.
B. No, se puede proponer un patrón nuevo si tiene sentido para este caso.
C. No identificado — falta confirmar.
X. Otro (especificar)

[Answer]: A

## Q4. ¿Qué dispositivos/form factors hay que soportar para estas pantallas?

A. Los mismos que ya soporta el resto de la plataforma (desktop + responsive mobile vía Tailwind) — sin requisito nuevo.
B. Un form factor específico nuevo (especificar en "Otro").
C. No identificado — falta confirmar.
X. Otro (especificar)

[Answer]: A

## Q5. ¿Hay requisitos de accesibilidad conocidos (nivel WCAG, lector de pantalla, navegación por teclado) más allá de lo que ya cumple la plataforma?

A. No, los mismos estándares que ya aplica el resto de la plataforma — sin requisito nuevo.
B. Sí hay un requisito de accesibilidad nuevo o reforzado (especificar en "Otro").
C. No identificado — falta confirmar.
X. Otro (especificar)

[Answer]: A

## Consolidated Summary Confirmation

- Q1 (Superficie UI): A, B, C — selects de categoría/atributo y defaults de ubicación tienen UI real; migración/adapters no.
- Q2 (Flujo): C — ambos flujos (crear/editar vehículo y editar default de ubicación).
- Q3 (Design system): A — reutilizar patrones existentes (CategorySelectorModal, GenericFormFields, OrganizationPicker).
- Q4 (Form factors): A — los mismos de la plataforma.
- Q5 (Accesibilidad): A — sin requisito nuevo.

- Looks correct
- Request changes

[Answer]: Looks correct
