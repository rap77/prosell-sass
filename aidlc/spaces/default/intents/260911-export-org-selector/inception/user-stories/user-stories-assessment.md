# User Stories Assessment — 260911-export-org-selector

## Decision: Execute

## Rationale

Aunque la implementación resultante de Requirements Analysis terminó siendo
muy chica (no se agrega ningún componente de UI nuevo — se reutiliza
`organizationStore.viewingOrgId`/`OrganizationPicker` ya existente), el
cambio SÍ es user-facing: modifica el comportamiento observable de un flujo
real (exportar catálogo) para un tipo de usuario específico (admin con
`ORG_ADMIN_VIEW_ALL`), con reglas de negocio testeables (qué organización se
exporta, qué mensaje se muestra si está vacía, qué NO debe cambiar para
usuarios sin el permiso). No encaja en ninguna de las categorías de skip
(no es refactor puro, no es un bugfix aislado sin comportamiento nuevo, no
es infra/tooling).

## Factors Considered

- **Project type**: Brownfield, cambio full-stack minúsculo pero real desde
  la perspectiva del usuario final (admin).
- **User-facing scope**: Sí — cambia qué datos exporta un botón ya
  existente, según el estado de un selector ya visible en la app.
- **Complejidad de negocio**: Baja pero real — hay una regla condicional
  (permiso) y un caso de error distinto al actual (mensaje específico de
  catálogo vacío cross-org).
- **Personas involucradas**: Dos roles con comportamiento explícitamente
  distinto y contrastante (admin con permiso vs. usuario sin permiso) — el
  pedido original del usuario distingue ambos casos explícitamente.

## Áreas donde las historias aportan más valor

- Capturar el comportamiento observable desde la perspectiva del admin
  (qué ve, qué elige, qué descarga) sin filtrar la decisión de
  implementación ya resuelta (reutilizar el store global) — las historias
  se centran en el QUÉ, no en el CÓMO.
- Dejar explícito, como criterio de aceptación testeable, que un usuario
  sin permiso no ve NINGÚN cambio — esto es exactamente el piso mínimo de
  test ya afirmado en Practices Discovery (regresión negativa de gating).
