# Scope Document — Catálogo Canónico de Vehículos para Facebook

Basado en `intent-statement.md` (Intent Capture), `feasibility-assessment.md` y `constraint-register.md` (Feasibility & Constraints).

## In Scope

Los 7 puntos de contacto técnicos de la descripción inicial, agrupados en 4 grupos de trabajo, todos Must Have:

1. **Datos y validación de vehículos** — schemas de categoría, selects dinámicos, decodificación de VIN, validación de import/create/update.
2. **Defaults de ubicación/organización** editables por producto.
3. **Migración de registros legacy** al catálogo canónico.
4. **Contratos de adapter de publisher** — preparación para una futura integración de publicación directa, sin automatización en vivo.

## Out of Scope

- Automatización en vivo de publicación en Facebook (activar el publisher real) — explícitamente fuera de alcance en la descripción inicial del intent.

## Minimum Viable Scope

El alcance mínimo que entrega valor real para este intent es el conjunto completo de los 4 grupos — no se recorta ninguno para un release inicial más chico dentro de este mismo intent.

## Dependency Boundary

El grupo "Datos y validación de vehículos" es prerequisito de los otros tres grupos: el catálogo canónico tiene que estar funcionando en schemas de categoría, selects, VIN decode y validación antes de que defaults de ubicación, migración legacy o contratos de adapter tengan sentido. La secuencia preferida es dependency-first.

## Assumptions & Open Questions

None.
