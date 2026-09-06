# Design System Mapping — Export de catálogo (formato cliente + ZIP)

Ningún componente nuevo del sistema de diseño — todo se resuelve reusando
componentes/patrones ya vigentes en `catalog/page.tsx` y el resto del panel.

| Elemento del flujo                  | Componente/patrón existente reusado                                                                                                       | Ubicación de referencia                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Menú "Exportar" con la nueva opción | Menú desplegable ya existente en `catalog/page.tsx` (contiene hoy la opción de export genérico)                                           | `apps/web/src/app/(seller)/catalog/page.tsx`   |
| Banner de resumen previo            | Componente de banner/alert inline ya usado en otros flujos de confirmación del panel (no modal)                                           | patrón compartido de banners del design system |
| Prompt de ruta/nombre sugerido      | `window.prompt()` nativo del navegador — mismo patrón ya usado en FR8.3 (intent `260826-prod-bugfixes-batch`)                             | precedente FR8.3                               |
| Estado de loading del botón         | Patrón de botón deshabilitado + spinner ya usado en otras acciones asíncronas del panel (ej. botones de cambio de estado en review-queue) | componente de botón compartido                 |
| Toast de éxito/error                | Componente Toast ya existente, usado en todo el panel                                                                                     | componente Toast compartido                    |

## Justificación

`team-practices.md` (Code Style) no mandata un componente nuevo para este
tipo de flujo, y el precedente de `window.prompt()` en FR8.3 ya está
aceptado como patrón vigente para pedir un valor de texto simple antes de
una descarga — reusarlo evita introducir un componente de diseño nuevo para
un caso de uso que el sistema ya resuelve. Confirmado en Q2 de la entrevista
de esta etapa.

No hay tokens de color, tipografía ni espaciado nuevos — todo hereda del
theme vigente del panel de catálogo.
