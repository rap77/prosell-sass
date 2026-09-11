# Requirements Analysis — Preguntas

Depth: Standard. Reverse Engineering (focused scan) y Practices Discovery ya
resolvieron la mayor parte del contexto técnico — backend estable, componente
`OrganizationPicker`/`organizationStore.viewingOrgId` ya existente pero
dormido, endpoint de listado de organizaciones ya identificado. Las preguntas
se acotan a las decisiones genuinamente abiertas de producto/UX.

## Q1 — Mecanismo del selector de organización

El scan encontró que ya existe un mecanismo global en toda la app para "ver
como otra organización" (`OrganizationPicker`, visible en el header, gateado
por permiso, pero hoy nadie lo consume para filtrar datos). Hay dos caminos
para el selector de export:

```question
prompt: "¿Qué mecanismo usamos para elegir la organización a exportar?"
header: "Selector"
multiSelect: false
options:
  - label: "A. Reutilizar el selector global existente"
    description: "El export usa la organización que ya esté elegida en el selector del header (OrganizationPicker) — sería su primer consumidor real. Un solo lugar en toda la app para 'ver como otra organización'."
  - label: "B. Selector local, propio del flujo de export"
    description: "Un selector nuevo, independiente, que aparece solo dentro del flujo de exportar catálogo — no toca el selector global del header."
  - label: "C. Depende de una tercera opción"
    description: "Otra combinación (ej. el export ofrece un selector propio PERO se pre-completa con la organización ya elegida en el header)"
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. Reutilizar el selector global existente

## Q2 — Ubicación del selector en el flujo de export

El flujo actual es: click en "Exportar catálogo (formato cliente)" → banner
inline de confirmación (`ExportSummaryBanner`) → prompt de nombre de archivo
→ descarga.

```question
prompt: "¿Dónde debería aparecer el selector de organización dentro de ese flujo?"
header: "Ubicación UI"
multiSelect: false
options:
  - label: "A. Dentro del banner de confirmación (ExportSummaryBanner)"
    description: "El selector aparece junto al resto de la confirmación, antes de continuar con el export."
  - label: "B. Antes de abrir el banner, en el propio menú de exportar"
    description: "Elegir la organización es el primer paso, antes de ver el resumen de confirmación."
  - label: "C. No aplica"
    description: "Si en Q1 elegiste (A) reutilizar el selector global, no hace falta agregar nada nuevo en este flujo — el selector ya vive en el header."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: C. No aplica

## Q3 — Catálogo vacío de la organización elegida

Hoy, exportar sin parámetro y sin productos publicados devuelve 404. Si un
usuario con permiso elige exportar una organización ajena que no tiene
catálogo publicado:

```question
prompt: "¿Qué debería pasar si la organización elegida no tiene catálogo publicado para exportar?"
header: "Catálogo vacío"
multiSelect: false
options:
  - label: "A. Mismo comportamiento que hoy (404 genérico)"
    description: "No agregar ningún mensaje especial — el error 404 ya existente cubre el caso."
  - label: "B. Mensaje específico mencionando la organización elegida"
    description: "Ej. 'La organización X no tiene catálogo publicado para exportar' — más claro cuando el usuario eligió a propósito otra organización."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: B. Mensaje específico mencionando la organización elegida

## Q4 — Persistencia de la elección

```question
prompt: "Si el usuario exporta la organización A y después vuelve a abrir el flujo de export, ¿debería seguir preseleccionada A, o volver siempre a su propia organización por defecto?"
header: "Persistencia"
multiSelect: false
options:
  - label: "A. Siempre vuelve a la organización propia por defecto"
    description: "Cada vez que se abre el flujo de export, arranca en la organización propia del usuario — más seguro contra exports accidentales cross-org."
  - label: "B. Recuerda la última organización elegida"
    description: "Mientras dure la sesión/página, mantiene la organización elegida la vez anterior."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. Siempre vuelve a la organización propia por defecto

**NOTA — respuesta superada por Q5 (contradicción detectada y resuelta):** ver
Q5 abajo. Al reutilizar el selector GLOBAL (Q1), no aplica un reset propio
del export — el valor efectivo es el que ya esté elegido en el header.

## Q5 — Contradicción detectada: reset vs. selector global compartido

Q1 (reutilizar el selector global `organizationStore.viewingOrgId`, el mismo
que usa el header) contradice a Q4 (el export siempre debe volver a la
organización propia por defecto): al ser el MISMO store, resetearlo al abrir
el export también resetearía lo que ve el usuario en el header, y viceversa.

```question
prompt: "¿Cómo resolvemos la contradicción entre Q1 y Q4?"
header: "Contradicción"
multiSelect: false
options:
  - label: "A. El export sigue lo que ya esté elegido en el header"
    description: "Sin reset especial: el export usa el valor actual del selector global, igual que cualquier otra pantalla que ya lo consuma. Coherente con Q1; se abandona el reset de Q4 específicamente para el export."
  - label: "B. El export tiene su propio selector local, prellenado con el valor global"
    description: "Cambia la respuesta de Q1: selector independiente que arranca con el valor del header pero se puede resetear sin afectarlo."
  - label: "C. El export SIEMPRE resetea el store global al abrir"
    description: "Mantiene Q4 tal cual — esto también cambiaría lo que ve el usuario en el header, como efecto secundario explícito y aceptado."
  - label: "X. Other (please specify)"
    description: "Otra respuesta"
```

[Answer]: A. El export sigue lo que ya esté elegido en el header

## Consolidated Summary Confirmation

- El selector de organización para el export reutiliza el mecanismo GLOBAL
  ya existente (`organizationStore.viewingOrgId` / `OrganizationPicker` del
  header) — no se agrega ningún selector local nuevo en el flujo de export.
- Como consecuencia, no hace falta ningún cambio de UI dentro del flujo de
  export (`ExportSummaryBanner` ni el menú de exportar) para elegir
  organización — el punto de elección ya existe y vive en el header.
- Si la organización elegida (vía el header) no tiene catálogo publicado
  para exportar, se muestra un mensaje específico mencionando esa
  organización (en vez del 404 genérico actual).
- El export usa el valor ACTUAL del selector global tal cual esté en ese
  momento — sin resetear a la organización propia al abrir el flujo (se
  descarta el reset propuesto inicialmente en Q4, para no interferir con
  el estado que el usuario ya haya elegido en el header).

Does this all look correct before I generate the requirements artifact?

```question
prompt: "Does this all look correct before I generate the requirements artifact?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, generá requirements.md"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de generar el artefacto"
```

[Answer]: Looks correct
