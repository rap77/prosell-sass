# Frontend Components — u2-catalog-export-ui

Consolida `interaction-spec.md` (Refined Mockups, READY) al formato de
Functional Design, sin componentes nuevos del sistema de diseño
(`design-system-mapping.md`: "todo se resuelve reusando componentes/
patrones ya vigentes en `catalog/page.tsx`").

## Jerarquía de componentes

```
catalog/page.tsx (existente)
└── Menú "Exportar" (existente)
    └── ExportClientFormatMenuItem (NUEVO — segunda opción del menú)
        └── ExportSummaryBanner (NUEVO — banner inline, no modal)
            └── window.prompt() nativo (Paso 2 — sin componente propio)
                └── ExportClientFormatButton (NUEVO — estado loading/success/error)
                    └── Toast (reusado — resultado final)
```

## Componentes

### ExportClientFormatMenuItem

| Field       | Value                                                         |
| ----------- | ------------------------------------------------------------- |
| Props       | `disabled: boolean` (default `false`), `onSelect: () => void` |
| Estado      | default / disabled (mientras cualquier export está en curso)  |
| Interacción | Click/Enter dispara el flujo (Paso 1 — `ExportSummaryBanner`) |
| A11y        | `role="menuitem"` heredado del menú existente                 |

### ExportSummaryBanner

| Field       | Value                                                                                                                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Props       | `count: number` (computado client-side desde la lista de productos ya cargada en `catalog/page.tsx` — sin request nuevo, `contract-summary.md` no define ningún endpoint de conteo), `onContinue?: () => void` (ausente si `count === 0`), `onCancel: () => void` |
| Estado      | default (con productos) / vacío (AC1.1.5) / loading (conteo — cubre el caso de que `catalog/page.tsx` aún no haya terminado de cargar el catálogo, no un request propio de este flujo)                                                                            |
| Interacción | "Continuar" avanza al prompt nativo; "Cancelar" cierra sin acción                                                                                                                                                                                                 |
| A11y        | `aria-live="polite"` (con productos) / `aria-live="assertive"` (vacío, bloqueante)                                                                                                                                                                                |

### ExportClientFormatButton

| Field       | Value                                                                    |
| ----------- | ------------------------------------------------------------------------ |
| Props       | `isExporting: boolean` (default `false`)                                 |
| Estado      | default / loading / success / error                                      |
| Interacción | Deshabilitado durante `loading` — guard de doble-clic nativo (AC1.1.10)  |
| A11y        | `aria-busy="true"` durante loading, texto cambia a "Generando export..." |

### Toast (reusado, sin cambios de componente)

| Field     | Value                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| Uso       | Confirmación de éxito o mensaje de error específico (catálogo vacío se muestra en el banner, no como toast) |
| Variantes | success (AC1.1.1 completado), error-límite (AC1.3.1)                                                        |

## Punto de integración API

`GET /api/v1/products/export-client-format.zip` (contrato de
`contract-summary.md`, formalizado con U1). `ExportClientFormatButton`
dispara el request tras confirmar el `window.prompt()`; consume la
respuesta vía el cliente API existente (`exportCatalogCsv` en
`apps/web/src/lib/api/products.ts`, a extender), a través del proxy BFF
de `products` (`apps/web/src/app/api/v1/products/[...path]/route.ts`,
ya soporta `response.blob()` + `Content-Disposition`).

Contrato de error consumido: `ProductErrorResponse` (`contract-summary.md`)
— `404 EMPTY_CATALOG` se muestra en `ExportSummaryBanner` (antes de
llegar al botón); `413 EXPORT_LIMIT_EXCEEDED` se muestra como toast de
error tras el intento de export. El código `413` (provisional en
`contract-summary.md`) fue confirmado por decisión humana explícita en
el Functional Design de `u1-catalog-export-api`.

Este Unit no lee ni transforma ningún atributo de `Product` (`components.md`,
Domain Design) directamente — solo dispara el request HTTP y renderiza la
respuesta/error; la lectura del componente `Product` es responsabilidad
exclusiva de `u1-catalog-export-api`.

## Validación de formulario

No aplica — el único input de usuario es el valor editable del
`window.prompt()` nativo (FR3.1/FR3.2, AC1.2.1-1.2.3), sin reglas de
validación propias (cualquier texto es válido como nombre sugerido).
