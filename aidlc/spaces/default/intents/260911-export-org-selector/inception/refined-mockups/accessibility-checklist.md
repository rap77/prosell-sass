# Accessibility Checklist — 260911-export-org-selector

WCAG 2.1 AA (`accessibility-wcag.md`). Alcance acotado: un badge de texto
nuevo dentro de un banner ya existente, sin componentes interactivos
nuevos.

## Perceivable

- [ ] Estado skeleton/loading del badge (mientras `useOrganizations()`
      resuelve el nombre cross-org) se anuncia como `aria-busy="true"` en
      el contenedor del badge, para que el screen reader no lea contenido
      vacío como si fuera el nombre final de la organización.
- [ ] Contraste de texto del badge ≥ 4.5:1 contra su fondo (texto normal).
- [ ] Si el badge usa un fondo de color distinto al del banner, ese fondo
      cumple ≥ 3:1 contra el fondo del banner (contraste de componente UI).
- [ ] El ícono (si se usa) es decorativo — el significado NO depende del
      ícono solo; el texto ("Exportando catálogo de: {organización}") ya
      transmite la información completa sin necesidad del ícono.
- [ ] Si el ícono es puramente decorativo, se marca `aria-hidden="true"` (o
      equivalente) para que el screen reader no lo anuncie por separado.

## Operable

- [ ] El badge no es interactivo — no requiere manejo de foco, teclado, ni
      atajo alguno (no es un botón, link, ni control).
- [ ] No introduce ningún nuevo target táctil — no aplica el mínimo de
      44×44px porque no hay elemento clickeable nuevo.
- [ ] El orden de tab del banner (`ExportSummaryBanner`) no cambia —
      "Cancelar"/"Continuar" siguen siendo los únicos elementos
      focuseables, en el mismo orden que hoy.

## Understandable

- [ ] El texto usa lenguaje claro, sin jerga técnica ("Exportando catálogo
      de: {organización}", no "organization_id: {uuid}").
- [ ] El mensaje de catálogo vacío cross-org (US2, AC2.1.1) es específico y
      accionable, no un código de error genérico — sigue el patrón ya
      vigente de `ux-guide.md` § Error Handling.
- [ ] No hay cambio de contexto inesperado al mostrar el badge (aparece
      como parte del render inicial del banner, no como una actualización
      dinámica sorpresiva tras una interacción del usuario).

## Robust

- [ ] Markup válido — el badge no rompe la jerarquía de encabezados ni
      landmarks existentes del banner.
- [ ] Si se usa un `role` ARIA (`status`, ver `interaction-spec.md`), se
      aplica correctamente y no se duplica con un rol nativo ya presente.

## Casos límite (per `wireframing-guide.md` § Screen State Design)

- [ ] Nombre de organización muy largo — el badge debe truncar o hacer
      wrap sin romper el layout del banner (Functional Design/Code
      Generation deben decidir truncamiento vs. wrap).
- [ ] Nombre de organización con caracteres especiales — el texto se
      renderiza tal cual, sin escaping visible al usuario.
- [ ] Zoom 200%/400% — el badge no se corta ni se superpone con el resto
      del contenido del banner a esos niveles de zoom.

## Fuera de alcance de este checklist

- `OrganizationPicker` (header): ya tiene su propio checklist de
  accesibilidad implícito en su implementación existente y testeada — no
  se re-audita acá porque este intent no lo modifica.
