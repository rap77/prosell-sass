# Domain Design — Questions

Contexto: `team-practices.md` ya afirmó (sin objeción de las 3 revisiones
ciegas) que este feature "es una adición de código dentro de un Unit
existente (backend `product` + frontend catálogo), sin necesidad de rama ni
convención distinta". `architecture.md`/`component-inventory.md` (codekb)
confirman que el dominio Product ya existe con Clean Architecture completa.

## Q1: ¿Nuevo componente, o extensión del componente Product existente?

¿La lógica de export (armar CSV + ZIP, leer imágenes, nombrar carpetas) es
un componente nuevo y separado, o vive dentro del componente `Product`
(dominio) ya existente?

A. Extensión del componente `Product` existente — no hay componente nuevo, la lógica de export es una responsabilidad más de `Product` (igual que ya lo es el import CSV)
B. Componente nuevo separado (ej. `CatalogExport`), con su propia responsabilidad y límites, aunque dependa de `Product`
X. Other (please specify)

[Answer]: A. Extensión del componente Product existente

## Q2: ¿Alguna entidad nueva?

El export no persiste nada nuevo — lee `Product` (con sus atributos y
`image_urls`) y `Organization.code`, y genera un archivo de salida
efímero (no se guarda en DB). ¿Hace falta alguna entidad nueva (ej. un
registro de "export solicitado" para auditoría/historial), o el export es
puramente transaccional-síncrono sin rastro persistente?

A. Sin entidad nueva — el export es una operación efímera, sin persistencia propia
B. Sí hace falta una entidad nueva para registrar/auditar exports (especificar qué necesita guardar)
X. Other (please specify)

[Answer]: A. Sin entidad nueva

## Consolidated Summary Confirmation

- Componente único: `Product` (dominio ya existente) se extiende con la responsabilidad de export en formato cliente — no se crea ningún componente nuevo.
- Sin entidades nuevas — el export lee `Product`/`Organization` ya existentes y genera un archivo efímero, sin persistencia propia.
- Decomposición única y evidente (confirmada sin objeción en Practices Discovery) — no aplica el bloque de opciones de Step 5, se documenta la razón en `decisions.md` (ADR-001).
- `components.md` va a describir `Product` con su catálogo YAML completo (responsabilidades existentes + la nueva de export), diagrama de componentes, y las entidades ya existentes que el export lee (`Product`, `Organization`) sin owner nuevo.
- `traceability.json` mapea las 3 historias (US1.1, US1.2, US1.3) al componente `Product`.

Does this all look correct before I generate the requirements artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
