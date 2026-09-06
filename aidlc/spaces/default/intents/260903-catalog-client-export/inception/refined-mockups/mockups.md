# Mockups (texto) — Export de catálogo (formato cliente + ZIP)

Fidelidad media, en texto (sin herramienta de diseño visual conectada a este
intent). Cubre las tres historias de `stories.md` (US1.1, US1.2, US1.3).

## Pantalla base: `catalog/page.tsx` (existente, sin cambios de layout)

```
┌─────────────────────────────────────────────────────────┐
│  Catálogo                                    [Exportar ▾]│
│                                                            │
│  ┌──────────────────────────────────────┐                │
│  │ Exportar catálogo (CSV genérico)      │  ← ya existe   │
│  │ Exportar catálogo (formato cliente)   │  ← NUEVO       │
│  └──────────────────────────────────────┘                │
│                                                            │
│  [ ... tabla/grilla de productos existente sin cambios ...]
└─────────────────────────────────────────────────────────┘
```

El botón nuevo cuelga del mismo menú desplegable "Exportar" ya existente,
como segunda opción — no se agrega un botón suelto nuevo en la barra de
acciones (Q1: A).

## Flujo: "Exportar catálogo (formato cliente)"

### Paso 1 — Resumen previo (Q3: B)

```
[Alert/Toast o banner inline, no bloqueante]
"Se van a exportar 42 productos publicados."
[Continuar]  [Cancelar]
```

- Si `count(published) == 0`: no se llega a este paso — ver Estado de error
  "catálogo vacío" más abajo (AC1.1.5).

### Paso 2 — Pedido de ruta/nombre sugerido (Q2: A, `window.prompt()`)

```
window.prompt(
  "Ruta/nombre sugerido para el archivo (podés editarlo):",
  "catalogo_MF_2026-09-05"   // valor sugerido por defecto, editable
)
```

- Si el usuario cancela el prompt (`null`): no se dispara ningún request, el
  flujo termina sin cambios visibles (comportamiento estándar de
  `window.prompt` cancelado, ya usado en FR8.3).

### Paso 3 — Loading (AC1.1.10)

```
[Botón "Exportar catálogo (formato cliente)" → deshabilitado, con spinner]
"Generando export..."
```

- Un segundo clic mientras está en curso no dispara un segundo request (el
  botón ya está `disabled`).

### Paso 4a — Éxito

```
[Toast de confirmación]
"Export descargado: catalogo_MF_2026-09-05.zip"
```

- El navegador dispara la descarga estándar del ZIP; el toast es la única
  confirmación adicional en pantalla (sin redirección, sin cambio de
  pantalla).

### Paso 4b — Error: catálogo vacío (AC1.1.5)

```
[Toast/alert de error, no bloqueante]
"No hay productos publicados para exportar."
```

Se muestra en el Paso 1 (nunca se llega al prompt de ruta) — ver `## Estados` abajo.

### Paso 4c — Error: catálogo excede el límite (US1.3, AC1.3.1)

```
[Toast/alert de error, no bloqueante]
"Tu catálogo supera el límite soportado para exportar de una sola vez.
Contactá soporte si necesitás exportar un catálogo de este tamaño."
```

## Estados del botón/flujo (ver `interaction-spec.md` para la spec formal)

| Estado               | Cuándo                                          | Qué ve Valeria                                                                                               |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| default              | Sin export en curso                             | Botón habilitado dentro del menú "Exportar"                                                                  |
| resumen              | Justo después de hacer clic, antes de confirmar | Banner "Se van a exportar N productos" con Continuar/Cancelar                                                |
| vacío                | `count(published) == 0` al pedir el resumen     | Toast de error, no llega al prompt                                                                           |
| prompt               | Usuario confirmó el resumen                     | `window.prompt()` nativo con valor sugerido                                                                  |
| loading              | Confirmó el prompt (no canceló)                 | Botón deshabilitado + spinner + texto "Generando export..."                                                  |
| éxito                | Response 200, ZIP armado                        | Toast de confirmación + descarga del navegador                                                               |
| error-límite         | Response de error por cap de recursos (NFR3)    | Toast de error específico                                                                                    |
| error-imagen-parcial | AC1.1.6 (imagen faltante, no aborta)            | Sin señal visible distinta de éxito — el log queda solo en backend, consistente con AC1.1.6 ("no se aborta") |

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-05T02:11:40Z
**Iteration:** 1

### Findings

| #   | Severity | Location                                                         | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Recommendation                                                                                                                                                                                                                                                                                                                                |
| --- | -------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Major    | `mockups.md` Paso 1–2 / `stories.md` AC1.1.1                     | AC1.1.1 (ya `READY`, no reabrible) dice literalmente "se descarga un único archivo ZIP (no dos descargas separadas, **no requiere ninguna acción adicional**)". El flujo diseñado acá agrega DOS pasos de confirmación explícitos que no existían al redactar esa AC: el banner de resumen (Continuar/Cancelar, decisión de Q3 de esta etapa) y luego el `window.prompt()` de ruta/nombre (Q2). Contado literal: clic en ítem de menú → clic en "Continuar" del banner → confirmar el prompt → recién ahí arranca el export. Ninguno de los 4 artefactos de esta etapa reconcilia explícitamente por qué esto no viola la letra de AC1.1.1 — la lectura más defendible es que la AC habla del formato de entrega (un ZIP, no dos descargas) y no del conteo de clics, pero esa lectura nunca queda escrita. Un QA que tome AC1.1.1 al pie de la letra ("no requiere ninguna acción adicional") puede razonablemente marcar el flujo como fallido apenas ve 2 pasos de confirmación nuevos. | Agregar una nota explícita (en `mockups.md` o `interaction-spec.md`) que reconcilie la lectura de AC1.1.1 contra los pasos de resumen/prompt agregados — aclarando que la AC se refiere a la unicidad del archivo entregado, no a cero interacción de confirmación — para que QA no tenga que adivinar la interpretación al escribir el test. |
| 2   | Minor    | `mockups.md` Paso 2 / `interaction-spec.md` (prompt de ruta)     | El texto del `window.prompt()` usa la palabra "Ruta" ("Ruta/nombre sugerido para el archivo") pese a que FR3.2 y AC1.2.3 (`stories.md`) son explícitos en que el campo es puramente de nomenclatura — no hay selección de carpeta ni escritura directa al filesystem. Usar "ruta" en la copy visible puede sugerirle a Valeria que puede elegir dónde se guarda el archivo, exactamente la confusión que AC1.2.3 se preocupa por descartar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Cambiar la copy del prompt a algo que hable solo de "nombre" (ej. "Nombre sugerido para el archivo: podés editarlo"), evitando la palabra "ruta"/"path" en el texto visible al usuario.                                                                                                                                                       |
| 3   | Minor    | `interaction-spec.md` — Banner de resumen previo                 | El prop `count` (cantidad de productos `published`) no dice de dónde sale: si se computa client-side a partir de la lista de productos ya cargada en `catalog/page.tsx`, o si requiere un nuevo request/endpoint de conteo antes de mostrar el banner. `requirements.md` no menciona ningún endpoint de conteo — esta ambigüedad queda sin marcar como pregunta abierta para Functional Design, a diferencia de otras decisiones diferidas que sí se documentaron explícitamente (ej. cap de NFR3).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Agregar una línea aclarando la fuente del conteo (dato ya disponible en el catálogo cargado vs. nuevo endpoint), o dejarlo como nota explícita para Functional Design.                                                                                                                                                                        |
| 4   | Minor    | `mockups.md` Paso 4a (Éxito) / AC1.2.2                           | El ejemplo de toast de éxito ("Export descargado: `catalogo_MF_2026-09-05.zip`") solo muestra el caso donde el usuario NO editó el nombre sugerido — no hay un ejemplo que muestre que, si Valeria edita el valor del prompt (AC1.2.2), ese nombre editado es el que efectivamente aparece en el archivo descargado. La cobertura de AC1.2.2 queda implícita, no demostrada.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Agregar un segundo ejemplo de toast con un nombre editado por el usuario, para dejar AC1.2.2 visualmente trazable.                                                                                                                                                                                                                            |
| 5   | Minor    | `mockups.md` vs `interaction-spec.md` — estado de error genérico | `interaction-spec.md` incluye un estado `error` para "Catálogo excede el límite (NFR3/AC1.3.1) **u otro error de servidor**" en `ExportClientFormatButton`, pero `mockups.md` solo dibuja dos casos de error (catálogo vacío, límite excedido) — no hay un mockup/copy de ejemplo para un error de servidor genérico (ej. fallo al leer imágenes que sí aborta, error 500 inesperado). Inconsistencia de nivel de detalle entre los dos artefactos para el mismo estado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Agregar en `mockups.md` un ejemplo de toast para el caso de error genérico de servidor, con copy de fallback razonable.                                                                                                                                                                                                                       |

### Aspectos positivos verificados

- Cobertura de AC visibles en UI completa: AC1.1.1, AC1.1.5, AC1.1.6 (explícitamente documentado como "sin UI"), AC1.1.10, AC1.2.1, AC1.2.3 (implícita — ningún botón de carpeta existe) y AC1.3.1 tienen representación clara en `mockups.md`/`interaction-spec.md`. Las AC puramente de backend/datos (AC1.1.2-4, AC1.1.7-9, AC1.1.11, AC1.3.2) correctamente no tienen representación visual — no es un gap, es la naturaleza de esas AC.
- La decisión de `window.prompt()` (Q2) es consistente con FR3.2/AC1.2.3 en el fondo (sin escritura a filesystem, sin selector de disco) — el hallazgo #2 es sobre la copy visible, no sobre el mecanismo elegido.
- `accessibility-checklist.md` está verificado contra los componentes reales de `interaction-spec.md` (banner con `aria-live` polite/assertive, botón con `aria-busy`, menú con `role="menuitem"`) — no es un checklist genérico copiado sin adaptar.

### Summary

Ningún hallazgo Critical y un solo Major (con solución acotada: una nota de reconciliación textual, no un rediseño). El flujo cubre razonablemente las tres historias y reutiliza componentes existentes sin inflar el sistema de diseño, pero la tensión entre AC1.1.1 ("no requiere ninguna acción adicional") y los dos pasos de confirmación agregados en esta etapa debería quedar explícitamente reconciliada por escrito antes de que Functional Design tome el flujo como dado.
