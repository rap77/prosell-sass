# Tech Stack Decisions — u2-cross-org-export-ui

`technology-stack.md` (codekb, scan enfocado `260911-cross-org-export-ux`)
confirma que no se requiere ninguna dependencia nueva para este Unit —
todo se resuelve con componentes/patrones ya vigentes en el frontend,
extendiendo sin cambio la selección ya afirmada en `u2-catalog-export-ui`
(`260903-catalog-client-export`).

## Selecciones

| Categoría                     | Tecnología                                                                         | Ya instalada                                       | Justificación                                                                                                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cliente API                   | Extensión de `apps/web/src/lib/api/products.ts` (`exportCatalogClientFormat`)      | Sí (módulo existente)                              | Sigue el patrón ya vigente del resto de `lib/api/` — sin cliente nuevo.                                                                                                                      |
| Estado de organización activa | `organizationStore.ts` (Zustand `^5.0.11`), extendido con el sentinel `"ALL_ORGS"` | Sí (store existente)                               | Mismo store ya usado para `viewingOrgId` — sin store nuevo, solo un valor de tipo unión adicional.                                                                                           |
| Data fetching de productos    | `useInfiniteProducts()` (TanStack Query `^5.0.0`)                                  | Sí (hook existente)                                | Ya soporta `organization_id` como filtro — sin hook nuevo, solo wiring del parámetro (FR3.1).                                                                                                |
| Prompts de valores            | `window.prompt()` nativo del navegador (3 instancias: archivo, carpeta, grupos FB) | Sí (API nativa, sin librería)                      | Mismo patrón ya usado para el nombre de archivo (confirmado en Refined Mockups), extendido a los 2 popups nuevos sin librería de diálogos nueva (Constraint explícito de `requirements.md`). |
| Notificaciones                | `sonner` (Toast ya existente)                                                      | Sí (`^2.0.7`)                                      | Componente Toast ya usado en todo el panel — sin variante nueva.                                                                                                                             |
| Manejo de descarga de blob    | `response.blob()` del navegador (Fetch API nativa)                                 | Sí (nativo)                                        | Mismo patrón ya vigente en el proxy BFF de `products`.                                                                                                                                       |
| Manejo de errores             | `extractErrorMessage()` ya existente                                               | Sí (`apps/web/src/lib/api/extractErrorMessage.ts`) | Reuso del precedente confirmado en `260903-catalog-client-export`, incluyendo el nuevo caso 403 de `all_organizations` sin parser ad-hoc.                                                    |

## Sin dependencias nuevas

Ningún componente de UI nuevo del sistema de diseño — el ícono nuevo
(`Layers`, per `functional-design-questions.md` Q1 de `refined-mockups`)
ya viene de `lucide-react` (`^0.400.0`), ya instalado. Sin librería de
diálogos de terceros para los 2 popups nuevos (constraint explícito de
`requirements.md`).
