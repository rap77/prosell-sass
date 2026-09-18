# Initiative Brief — Catálogo Canónico de Vehículos para Facebook

Compilación de todos los artefactos de Ideation: `intent-statement.md`, `stakeholder-map.md`, `scope-document.md`, `intent-backlog.md`, `feasibility-assessment.md`, `constraint-register.md`, `wireframes.md`.

## Intent y Problem Statement

Las publicaciones y exports de vehículos no calzan de forma confiable con los valores canónicos de categoría/atributo de Facebook Marketplace, causando publicaciones rechazadas, mal categorizadas o de baja calidad. El mapeo al catálogo canónico está implementado de forma inconsistente en distintas partes del sistema — schemas de categoría, selects dinámicos, decodificación de VIN, import/validación y registros legacy. Esta iniciativa sienta además las bases (referencias canónicas + contratos de adapter de publisher) para una futura integración de publicación directa con Facebook, sin activar automatización en vivo todavía (`intent-statement.md`).

## Market Validation Summary

No aplica — Market Research fue salteada (iniciativa interna de plataforma, sin posicionamiento de mercado externo ni decisión build-vs-buy).

## Feasibility y Riesgos Destacados

Técnicamente viable con el equipo y stack actuales (FastAPI + SQLAlchemy + Postgres, Next.js + React + TypeScript), sin dependencias externas nuevas, sin requisito de compliance ni cambio de infraestructura (`feasibility-assessment.md`, `constraint-register.md`). Riesgos principales:

- Superficie de integración amplia (7 puntos de contacto técnicos, agrupados en 4 grupos de trabajo) — riesgo de secuenciación, no de viabilidad técnica.
- Migración legacy sin pérdida de datos.
- Normalización de VIN coherente con los valores canónicos nuevos, sin romper el comportamiento actual.

## Scope Boundary

In scope: los 4 grupos de trabajo (datos y validación de vehículos; defaults de ubicación/organización; migración legacy; contratos de adapter de publisher), todos Must Have, secuenciados dependency-first con "datos y validación" como prerequisito. Out of scope: automatización en vivo de publicación en Facebook (`scope-document.md`, `intent-backlog.md`).

## Concept Visuals

Dos pantallas bocetadas y aprobadas en Rough Mockups, reutilizando patrones ya establecidos (`CategorySelectorModal`, `GenericFormFields`/`GenericProductForm`, `OrganizationPicker`): formulario de creación/edición de vehículo con selects canónicos, y edición de default de ubicación por producto (`wireframes.md`).

## Team Plan

No aplica — Team Formation fue salteada (proyecto de un solo desarrollador; no hay equipo ni mob que planificar).

## Go/No-Go Recommendation

**GO**, sin condiciones. Conformidad confirmada con el intent, scope y riesgos identificados; compromiso de presupuesto/recursos ya confirmado en Feasibility (sin restricción); los wireframes reflejan la visión del usuario.

## Assumptions & Open Questions

None.
