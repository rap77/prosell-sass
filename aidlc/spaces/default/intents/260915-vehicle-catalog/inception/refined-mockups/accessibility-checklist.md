# Accessibility Checklist — Catálogo Canónico de Vehículos para Facebook

Sin requisito de accesibilidad nuevo respecto al resto de la plataforma (confirmado en Rough Mockups Q5) — este checklist verifica que las dos pantallas cumplan el mismo estándar WCAG AA ya vigente.

## Screen 1: Crear/Editar Vehículo

| Ítem                      | Estándar                                                                                | Cumplimiento                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Estructura de encabezados | `h2` para el título de la pantalla, jerarquía sin saltos                                | OK — heading `h2` (ver `mockups.md`)                                          |
| Landmark                  | `main` envolviendo el formulario                                                        | OK                                                                            |
| Labels de campo           | Cada select/input tiene label visible asociado                                          | OK — mismo patrón ya vigente en `GenericFormFields`                           |
| Navegación por teclado    | Tab recorre todos los campos y botones en orden lógico; ícono de ayuda (i) es foco-able | OK — ver `interaction-spec.md`, tabla Accessibility de `CanonicalSelectField` |
| Texto de ayuda accesible  | `aria-describedby` conecta el campo con el texto de ayuda cuando `unmatched=true`       | OK — ver AC1.1.2                                                              |
| Errores inline            | Error de validación (AC1.1.3) anunciado por lector de pantalla, no solo color           | OK — mismo patrón de error ya vigente en la plataforma                        |
| Contraste de color        | 4.5:1 texto, 3:1 componentes UI (WCAG AA)                                               | OK — mismos tokens de color ya vigentes, sin color nuevo introducido          |
| Foco visible              | Indicador de foco visible en todos los campos interactivos                              | OK — mismo estilo de foco ya vigente en la plataforma                         |

## Screen 2: Editar Default de Ubicación por Producto

| Ítem                             | Estándar                                                                                                       | Cumplimiento                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Estructura de encabezados        | `h3` dentro de la vista de detalle de producto (jerarquía correcta bajo el `h1`/`h2` de la página contenedora) | OK — ver `mockups.md`                                        |
| Labels de campo                  | Dos campos de texto con label visible cada uno: "Ciudad" y "Provincia"                                         | OK — mismo patrón ya vigente en `OrganizationFormFields.tsx` |
| Badge "Heredado de organización" | Texto real leído por lector de pantalla junto a ambos campos, no solo color/ícono                              | OK — ver AC2.1.2, `interaction-spec.md`                      |
| Navegación por teclado           | Tab recorre Ciudad → Provincia → botones en orden lógico                                                       | OK                                                           |
| Errores inline                   | Rechazo de par parcial o inválido (AC2.1.5) anunciado por lector de pantalla                                   | OK                                                           |
| Contraste de color               | 4.5:1 texto, 3:1 componentes UI (WCAG AA)                                                                      | OK — mismos tokens ya vigentes                               |
| Foco visible                     | Indicador de foco visible en ambos campos y botones                                                            | OK                                                           |
| Gestión de foco post-guardado    | El foco permanece en el campo tras guardar exitosamente, sin robo de foco por el badge que aparece/desaparece  | OK — ver `interaction-spec.md`                               |

## Resumen

Ambas pantallas cumplen el mismo estándar WCAG AA ya vigente en la plataforma, sin requisito nuevo. Los dos elementos genuinamente nuevos (ícono de ayuda con tooltip, badge de herencia) fueron diseñados desde el inicio para ser accesibles por teclado y lector de pantalla (ver `interaction-spec.md`), no como agregado posterior.

## Assumptions & Open Questions

None.
