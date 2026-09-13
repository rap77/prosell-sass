# Design System Mapping — 260911-cross-org-export-ux

Mapea cada elemento nuevo/extendido de `mockups.md`/`interaction-spec.md`
a componentes y tokens ya existentes en el design system del proyecto
(TailwindCSS 3.4.17 + componentes propios) — sin introducir una
librería de componentes ni tokens nuevos, per `requirements.md` §
Constraints.

## Componentes reutilizados

| Elemento nuevo                                            | Componente/patrón existente reutilizado                                                                                                                                   | Ubicación                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Separador antes de "Todas las organizaciones" (Q1)        | Mismo patrón de separador (`<hr>`/`border-t`) ya usado en otros menús desplegables de la app                                                                              | `apps/web/src/components/ui/`                          |
| Ícono de "Todas las organizaciones"                       | Ícono de la librería de íconos ya instalada (confirmar cuál en Functional Design — ej. `Layers`/`Grid` de la misma librería que ya provee el ícono `Building2` usado hoy) | `apps/web/src/components/icons/`                       |
| Badge de organización en el picker (`product_count`)      | Mismo componente de badge ya usado hoy para el badge cross-org de `ExportSummaryBanner`                                                                                   | `apps/web/src/components/admin/OrganizationPicker.tsx` |
| Skeleton de carga del picker                              | Mismo componente skeleton ya usado en el resto de la app                                                                                                                  | `apps/web/src/components/ui/`                          |
| Toast de error genérico                                   | Mandate Q6 — manejo de errores centralizado ya existente (`sonner` u homólogo)                                                                                            | ya wireado en el proyecto                              |
| Banner de advertencia "todas" (AC5.1.1)                   | Mismo componente `ExportSummaryBanner` ya existente, variante nueva                                                                                                       | `apps/web/src/app/(seller)/catalog/page.tsx`           |
| Spinner + texto de carga distinguible (Q2)                | Mismo primitivo de spinner ya usado en el botón de export existente, con texto condicional nuevo                                                                          | mismo archivo                                          |
| `window.prompt()` para carpeta base y grupos FB (US8/US9) | Mismo mecanismo nativo ya usado 2 veces hoy en `catalog/page.tsx` (carpeta destino, nombre de archivo)                                                                    | mismo archivo                                          |

## Tokens de diseño

Sin tokens nuevos — todos los colores, espaciados y tipografía
reutilizan la escala ya existente de `tailwind.config.ts` (confirmada
vigente en Reverse Engineering: escala de spacing extendida con
`4.5`/`8.5`/`9.5`, sin necesidad de valores nuevos para este intent).

| Uso                                   | Token existente                                                   |
| ------------------------------------- | ----------------------------------------------------------------- |
| Color de advertencia (banner "todas") | Mismo token de warning/alerta ya usado en otros banners de la app |
| Espaciado del separador               | `border-t` + spacing ya en la escala (`4`, `8`, etc.)             |
| Contraste de texto                    | Tokens de color ya verificados AA en el resto de la app           |

## Conformidad con el design system

- Ningún componente nuevo desde cero — todo lo que aparece en
  `mockups.md` es una variante/extensión de un componente ya en
  producción.
- Sin dependencia nueva de UI (ningún ícono/librería de componentes
  nueva) — Functional Design confirma el ícono exacto disponible en la
  librería ya instalada.
