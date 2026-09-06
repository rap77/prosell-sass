# Functional Spec — u2-catalog-export-ui

Unit UI-only — sin `entities.md`/`rules.md` (`produces_kinds` los excluye
para `kind: ui`). Este archivo es autocontenido: especifica el workflow
de interacción y las transiciones de estado directamente desde
`unit-of-work.md` y `requirements.md`, sin dependencia de entidad/regla
de negocio propia. Consolida `mockups.md` e `interaction-spec.md`
(Refined Mockups, ambos READY) al formato de esta etapa, conectados con
`contract-summary.md` (el contrato del endpoint que U1 expone) y
`unit-of-work-story-map.md` (las historias asignadas a este Unit). Este
Unit no toca ninguna entidad de `components.md` (Domain Design) — el
único componente de dominio relevante para el intent (`Product`) queda
enteramente dentro de `u1-catalog-export-api`; U2 solo dispara el request
y renderiza la respuesta, sin leer ni transformar atributos de `Product`
directamente.

## Workflow — Exportar catálogo (formato cliente), lado cliente

1. **Ítem de menú**: usuario hace clic en "Exportar catálogo (formato
   cliente)" dentro del menú "Exportar" ya existente en `catalog/page.tsx`.
2. **Resumen previo**: se muestra `ExportSummaryBanner` con la cantidad
   de productos `published`. `count` se computa **client-side**, a partir
   de la lista de productos ya cargada en `catalog/page.tsx` (el catálogo
   completo de la organización ya está en memoria del lado del cliente
   para renderizar la tabla/grilla existente) — no dispara ningún request
   nuevo. `contract-summary.md` no define ningún endpoint de conteo; el
   estado `loading (conteo)` heredado de `interaction-spec.md` cubre el
   caso (poco probable, pero posible) de que el catálogo aún no haya
   terminado de cargar en `catalog/page.tsx` cuando el usuario abre el
   menú, no un request de red propio de este flujo. Si `count === 0`, se
   muestra el mensaje de catálogo vacío (AC1.1.5) y el flujo termina ahí
   — nunca se llega al prompt.
3. **Prompt de nombre sugerido**: si el usuario confirma el resumen
   (`onContinue`), se abre `window.prompt()` con un valor sugerido por
   defecto editable (FR3.1, AC1.2.1). Si el usuario cancela el prompt
   (`null`), el flujo termina sin disparar ningún request.
4. **Loading**: al confirmar el prompt, `ExportClientFormatButton` pasa a
   `isExporting=true` — deshabilitado, con spinner y texto "Generando
   export..." (AC1.1.10). Un segundo clic no dispara un segundo request
   (guard de doble-clic vía `disabled`).
5. **Request**: `GET /api/v1/products/export-client-format.zip` (contrato
   de U1, `contract-summary.md`) — sin body, sin query params (el
   tenant_id se resuelve del lado del servidor, U2 no participa en esa
   resolución).
6. **Respuesta**:
   - `200`: el navegador dispara la descarga estándar del ZIP; toast de
     éxito con el nombre del archivo (AC1.1.1 — la parte end-to-end de
     esta AC: **la unicidad se refiere al archivo entregado** — un único
     ZIP, nunca dos descargas separadas — no al conteo de interacciones
     del usuario; el flujo real requiere DOS confirmaciones explícitas
     (Paso 2 "Continuar" del banner + Paso 3 confirmar el `window.prompt()`)
     antes de llegar acá. Complementa la precondición backend de U1
     (`traceability.json` de ese Unit, misma aclaración).
   - `404` (`EMPTY_CATALOG`): no debería ocurrir en este punto del flujo
     (ya se filtró en el Paso 2), pero si ocurre (condición de carrera),
     se muestra igual el mensaje de catálogo vacío.
   - `413` (`EXPORT_LIMIT_EXCEEDED`): toast de error específico (AC1.3.1
     — la parte de renderizado; el enforcement real es responsabilidad de
     U1). El código `413` fue confirmado por decisión humana explícita en
     el Functional Design de `u1-catalog-export-api` (Q2 de
     `functional-design-questions.md` de ese Unit) — ya NO es el valor
     provisional que `contract-summary.md` dejaba abierto.
   - Nombre editado por el usuario en el prompt (AC1.2.2): se usa como
     base del nombre del archivo ZIP descargado.

## Máquina de estados de UI

Sin entidad persistida ni transición de dominio — es una máquina de
estados puramente de interfaz:

```mermaid
stateDiagram-v2
    [*] --> default
    default --> resumen: click ítem de menú
    resumen --> vacío: count == 0
    resumen --> prompt: onContinue (count > 0)
    resumen --> default: onCancel
    prompt --> default: usuario cancela window.prompt()
    prompt --> loading: usuario confirma window.prompt()
    loading --> éxito: response 200
    loading --> error_límite: response 413
    loading --> vacío: response 404 (condición de carrera)
    éxito --> default
    error_límite --> default
    vacío --> default
```

## Resumen de componentes (derivado de `frontend-components.md`)

4 componentes: `ExportClientFormatMenuItem` (trigger), `ExportSummaryBanner`
(resumen/vacío), `ExportClientFormatButton` (loading/success/error),
Toast reusado (resultado final). Ver `frontend-components.md` para el
detalle completo de props/estados/a11y.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-05T15:30:13Z
**Iteration:** 1

### Findings

| #   | Severity          | Location                                                                                     | Finding                                                                                                                                                                                                                                                          | Recommendation                                                                                                                                                                                              |
| --- | ----------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Major (corregido) | `functional-spec.md` § Workflow Paso 6 (AC1.1.1) / `traceability.json`                       | El texto describía la parte end-to-end de AC1.1.1 como "un único clic", cuando el Workflow real requiere DOS confirmaciones explícitas (banner + prompt).                                                                                                        | **Corregido**: reescrito para aclarar que la unicidad se refiere al archivo entregado (un solo ZIP), no al conteo de interacciones — reconciliación explícita ya pedida por el reviewer de Refined Mockups. |
| 2   | Major (corregido) | `functional-spec.md` / `frontend-components.md`                                              | `components.md` (declarado en `consumes:`) nunca se citaba por nombre de archivo.                                                                                                                                                                                | **Corregido**: se agregó una cita explícita aclarando que U2 no toca ninguna entidad de `components.md` directamente — esa responsabilidad es exclusiva de U1.                                              |
| 3   | Major (corregido) | `frontend-components.md` § ExportSummaryBanner / `functional-spec.md` § Workflow Paso 2      | La fuente de `count` no estaba especificada — no hay endpoint de conteo en `contract-summary.md`.                                                                                                                                                                | **Corregido**: aclarado que `count` se computa client-side desde la lista de productos ya cargada en `catalog/page.tsx`, sin request nuevo.                                                                 |
| 4   | Major (corregido) | `frontend-components.md` § Punto de integración API / `functional-spec.md` § Workflow Paso 6 | `413` se fijaba como definitivo sin citar que ya había sido confirmado por decisión humana explícita (el reviewer no tenía visibilidad de esa decisión, tomada en el Functional Design de `u1-catalog-export-api`, fuera del scope de lectura de esta revisión). | **Corregido**: se agregó la cita explícita a esa decisión en ambos artefactos — `413` no es provisional, fue confirmado explícitamente en Q2 de `u1-catalog-export-api/functional-design-questions.md`.     |

### Summary

Los 4 hallazgos Major eran corregibles sin reabrir ninguna decisión de diseño: dos eran citas de fuente ausentes/desactualizadas (una porque el reviewer no tenía visibilidad de la decisión ya tomada en `u1-catalog-export-api`, fuera de su scope de lectura), uno era una aclaración de fuente de dato (`count`, client-side, sin endpoint nuevo) y uno era una reconciliación de redacción ya señalada por un reviewer anterior (Refined Mockups). La fidelidad general a `interaction-spec.md`/`mockups.md` es buena y la máquina de estados de UI es consistente con el workflow — ningún hallazgo afectaba la implementabilidad del diseño.
