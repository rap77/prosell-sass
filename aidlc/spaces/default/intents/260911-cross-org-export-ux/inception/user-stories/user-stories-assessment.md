# User Stories — Assessment (260911-cross-org-export-ux)

**Decision**: Execute.

**Rationale**: El intent tiene funcionalidad user-facing real para al
menos dos actores distintos (Super Admin/plataforma para el modo
"todas las organizaciones" y el filtrado real de grilla; cualquier
vendedor/dealer que exporte su propio catálogo para las columnas
corregidas del CSV y los dos popups nuevos), con reglas de negocio
condicionales testeables (comportamiento por defecto vs. sentinel
"todas"; popup con/sin cancelación; filtro de organizaciones con
productos). No encaja en ninguna categoría de skip del stage file
(refactor puro, bugfix aislado, infra/tooling) — mismo criterio ya
aplicado en el intent hermano `260911-export-org-selector`.

**Factores considerados**:

- Superficie user-facing nueva: selector con tercer estado, filtrado
  real de grilla, banner de confirmación reforzado, dos popups nuevos.
- Múltiples personas: Super Admin (exporta cross-org/todas) vs.
  vendedor/dealer (exporta su propio catálogo, afectado solo por el fix
  de columnas y los popups).
- Lógica de negocio condicional: comportamiento por defecto vs.
  sentinel; permiso `ORG_ADMIN_VIEW_ALL` gatea la disponibilidad de la
  opción "todas" tanto en UI como en el use case.

**Áreas donde las historias aportan más valor**: separar claramente lo
que ve/hace un Super Admin (nuevo, requiere permiso) de lo que ve/hace
cualquier vendedor exportando su propio catálogo (corrección de datos
existente, sin permiso nuevo) — evita que Build and Test mezcle los dos
niveles de permiso en un mismo caso de prueba.
