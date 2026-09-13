# NFR Design Questions — u2-cross-org-export-ui

## Nota: bloque interactivo omitido

`nfr-requirements` de este Unit ya estableció que U2 no tiene
responsabilidad de seguridad propia (todo cubierto por
`u1-cross-org-export-api`) y que sus targets de performance son de
responsividad de UI pura. Sin ambigüedad genuina — esta etapa documenta
las técnicas de implementación (ya estándar en React) que cumplen esos
4 targets, extendiendo sin cambio el precedente de `u2-catalog-export-ui`
(`260903-catalog-client-export`).

## Plan propuesto

- **performance-design.md**: técnicas de UI ya estándar (React Compiler,
  actualización de estado local, filtrado client-side con `Array.filter`)
  para cumplir NFR-PERF-UI-1/2/3/4.
- **security-design.md**: sin diseño nuevo — documenta por qué (mismo
  motivo que `security-requirements.md`: sin superficie propia; se
  agrega una nota sobre el no-op de permiso del sentinel `"ALL_ORGS"`
  en `organizationStore.ts`, ya existente).
- **logical-components.md**: los componentes de `frontend-components.md`
  (Functional Design), extendidos con el nuevo sentinel del picker y el
  filtrado real de la grilla — sin componente desplegable nuevo.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

A. Looks correct
B. Request changes

[Answer]: Looks correct
