# Interaction Specification — Export de catálogo (formato cliente + ZIP)

Formato por componente según `.claude/knowledge/aidlc-design-agent/component-spec-template.md`.
Trazabilidad a `stories.md`: US1.1, US1.2, US1.3.

---

## Opción de menú: "Exportar catálogo (formato cliente)"

| Field       | Value                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Component   | `ExportClientFormatMenuItem`                                                                                                   |
| Description | Segunda opción dentro del menú desplegable "Exportar" ya existente en `catalog/page.tsx`, junto a la opción de export genérico |
| Category    | navigation (menu item)                                                                                                         |

### States

| State    | Description                                                         | Trigger                  |
| -------- | ------------------------------------------------------------------- | ------------------------ |
| default  | Ítem de menú habilitado                                             | menú "Exportar" abierto  |
| disabled | Export en curso (cualquier otro export, genérico o formato cliente) | request de export activo |

### Props / Inputs

| Prop       | Type     | Required | Default | Description                                                 |
| ---------- | -------- | -------- | ------- | ----------------------------------------------------------- |
| `disabled` | boolean  | no       | `false` | true mientras hay un export (de cualquier formato) en curso |
| `onSelect` | function | yes      | —       | dispara el flujo de resumen (Paso 1)                        |

### Responsive Behaviour

| Breakpoint          | Behaviour                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mobile (<768px)     | Menú "Exportar" colapsa a icono; el ítem se lista igual dentro del dropdown abierto — hereda el patrón responsive ya vigente del menú existente (Q4: A, sin cambio) |
| tablet (768–1024px) | Igual que desktop                                                                                                                                                   |
| desktop (>1024px)   | Layout por defecto, sin cambios                                                                                                                                     |

### Accessibility

| Requirement          | Implementation                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| ARIA role            | `menuitem` (hereda del componente de menú ya existente)                                                   |
| Keyboard interaction | Arrow keys para navegar el menú, Enter para seleccionar — hereda el patrón del menú "Exportar" ya vigente |
| Label / aria-label   | Texto visible "Exportar catálogo (formato cliente)"                                                       |
| Contrast ratio       | WCAG AA (4.5:1) — hereda el theme del design system, sin override                                         |
| Screen reader        | Anuncia el texto del ítem al enfocarlo, igual que el resto de ítems del menú                              |
| Focus management     | Al seleccionar, el foco pasa al banner de resumen (ver abajo)                                             |

---

## Banner de resumen previo (AC — Q3: B)

| Field       | Value                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Component   | `ExportSummaryBanner`                                                                                                   |
| Description | Banner inline (no modal bloqueante) que muestra la cantidad de productos `published` a exportar, con Continuar/Cancelar |
| Category    | feedback                                                                                                                |

### States

| State                   | Description                                                              | Trigger                    |
| ----------------------- | ------------------------------------------------------------------------ | -------------------------- |
| default (con productos) | Muestra "Se van a exportar N productos publicados."                      | `count(published) > 0`     |
| vacío (AC1.1.5)         | Muestra "No hay productos publicados para exportar." sin botón Continuar | `count(published) == 0`    |
| loading (conteo)        | Spinner breve mientras se resuelve el conteo                             | request de conteo en curso |

### Props / Inputs

| Prop         | Type     | Required                      | Default | Description                                          |
| ------------ | -------- | ----------------------------- | ------- | ---------------------------------------------------- |
| `count`      | number   | yes                           | —       | cantidad de productos `published` de la organización |
| `onContinue` | function | no (ausente si `count === 0`) | —       | avanza al Paso 2 (prompt de ruta)                    |
| `onCancel`   | function | yes                           | —       | cierra el banner sin acción                          |

### Responsive Behaviour

| Breakpoint          | Behaviour                                                      |
| ------------------- | -------------------------------------------------------------- |
| mobile (<768px)     | Banner ocupa el ancho completo, botones apilados verticalmente |
| tablet (768–1024px) | Banner ocupa el ancho del contenedor de catálogo               |
| desktop (>1024px)   | Banner inline sobre la tabla/grilla de productos               |

### Accessibility

| Requirement          | Implementation                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA role            | `status` (no `alert` — es informativo, no un error crítico) para el caso con productos; `alert` para el caso vacío (AC1.1.5, requiere atención inmediata) |
| Keyboard interaction | Tab a Continuar/Cancelar, Enter/Space para activar                                                                                                        |
| Label / aria-label   | El texto del conteo es el contenido accesible del banner (`aria-live="polite"` para que el screen reader lo anuncie al aparecer)                          |
| Contrast ratio       | WCAG AA (4.5:1 texto, 3:1 componentes)                                                                                                                    |
| Screen reader        | Anuncia el conteo automáticamente al aparecer (`aria-live="polite"`); el caso vacío usa `aria-live="assertive"` por ser bloqueante para el flujo          |
| Focus management     | Al aparecer, el foco no se roba automáticamente (no es un modal) — el usuario navega a Continuar/Cancelar con Tab                                         |

---

## Botón de export (estado loading — AC1.1.10)

| Field       | Value                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Component   | `ExportClientFormatButton` (el mismo ítem de menú, ahora en su variante de botón de acción tras confirmar el prompt) |
| Description | Refleja el progreso del armado del ZIP en el servidor                                                                |
| Category    | feedback                                                                                                             |

### States

| State   | Description                                                       | Trigger                                        |
| ------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| default | Sin export en curso                                               | estado inicial                                 |
| loading | Armando el ZIP en el servidor                                     | request de export enviado, respuesta pendiente |
| success | ZIP armado y descarga disparada                                   | response 200 recibida                          |
| error   | Catálogo excede el límite (NFR3/AC1.3.1) u otro error de servidor | response de error recibida                     |

### Props / Inputs

| Prop          | Type    | Required | Default | Description                             |
| ------------- | ------- | -------- | ------- | --------------------------------------- |
| `isExporting` | boolean | yes      | `false` | controla el estado `loading`/`disabled` |

### Responsive Behaviour

| Breakpoint                | Behaviour                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| mobile / tablet / desktop | Sin cambios — el estado loading es el mismo spinner+texto en todos los tamaños, hereda el patrón ya vigente de otros botones de acción del panel |

### Accessibility

| Requirement          | Implementation                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ARIA role            | `button` nativo, `aria-busy="true"` mientras `isExporting`                                                                 |
| Keyboard interaction | Enter/Space para activar; deshabilitado (no focuseable de forma activable) mientras `isExporting`                          |
| Label / aria-label   | Texto cambia de "Exportar catálogo (formato cliente)" a "Generando export..." durante loading                              |
| Contrast ratio       | WCAG AA                                                                                                                    |
| Screen reader        | `aria-live="polite"` en el texto de estado para anunciar el cambio a "Generando export..." y luego al toast de éxito/error |
| Focus management     | El foco permanece en el botón durante todo el ciclo; no se mueve automáticamente                                           |

---

## Toasts de resultado (éxito / error)

| Field       | Value                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Component   | Toast del sistema de diseño ya existente (mismo componente que usan otros flujos del catálogo)             |
| Description | Confirmación de éxito (descarga disparada) o mensaje de error específico (límite excedido, catálogo vacío) |
| Category    | feedback                                                                                                   |

### States

| State        | Description                                                             | Trigger                                                                  |
| ------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| success      | "Export descargado: `<nombre>.zip`"                                     | AC1.1.1 completado                                                       |
| error-vacío  | "No hay productos publicados para exportar."                            | AC1.1.5 (se muestra en el banner de resumen, no como toast — ver arriba) |
| error-límite | "Tu catálogo supera el límite soportado para exportar de una sola vez." | AC1.3.1                                                                  |

### Accessibility

| Requirement   | Implementation                                                              |
| ------------- | --------------------------------------------------------------------------- |
| ARIA role     | `status` (éxito) / `alert` (error) — hereda del componente Toast ya vigente |
| Screen reader | `aria-live` ya configurado en el componente Toast existente, sin cambios    |

---

## Nota sobre AC1.1.6 (imagen no disponible)

No hay componente de UI dedicado: por decisión de producto (`stories.md` AC1.1.6), una imagen faltante no aborta el export ni genera un estado de error visible — el toast final sigue siendo de éxito. El registro queda solo en logs de aplicación (backend), consistente con "no abortar por completo".
