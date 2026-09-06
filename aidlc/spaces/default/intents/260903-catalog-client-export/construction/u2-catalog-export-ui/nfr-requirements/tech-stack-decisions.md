# Tech Stack Decisions — u2-catalog-export-ui

`technology-stack.md` (codekb, scan enfocado `260903-catalog-client-export`)
confirma que no se requiere ninguna dependencia nueva para este Unit —
todo se resuelve con componentes/patrones ya vigentes en el frontend.

## Selecciones

| Categoría                  | Tecnología                                                           | Ya instalada                  | Justificación                                                                                           |
| -------------------------- | -------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cliente API                | Extensión de `apps/web/src/lib/api/products.ts` (`exportCatalogCsv`) | Sí (módulo existente)         | Sigue el patrón ya vigente del resto de `lib/api/` — sin cliente nuevo.                                 |
| Prompt de nombre sugerido  | `window.prompt()` nativo del navegador                               | Sí (API nativa, sin librería) | Mismo patrón ya usado en FR8.3 (`design-system-mapping.md`), decisión ya confirmada en Refined Mockups. |
| Notificaciones             | `sonner` (Toast ya existente)                                        | Sí (`^2.0.7`)                 | Componente Toast ya usado en todo el panel — sin variante nueva.                                        |
| Manejo de descarga de blob | `response.blob()` del navegador (Fetch API nativa)                   | Sí (nativo)                   | Mismo patrón ya vigente en el proxy BFF de `products` (`architecture.md`).                              |

## Sin dependencias nuevas

Ningún componente de UI nuevo del sistema de diseño (`design-system-mapping.md`
de Refined Mockups ya lo confirmó) — sin librería de terceros nueva para
este Unit.
