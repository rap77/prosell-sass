# Functional Design — Preguntas (u1-cross-org-export-api)

La mayoría de las decisiones de diseño de U1 ya están fijadas por
`requirements.md`, `stories.md`, `team-practices.md` (precedentes de
implementación: resolución batch de `org_code`, separación
resolución/mapeo de categorías) y `contract-summary.md` (contrato de
API ya formalizado). Quedan 3 preguntas genuinas.

## Q1 — Productos fuera de la vertical de vehículos en el export formato cliente

`docs/data39.csv` (la fuente de verdad del formato cliente) es
específico de vehículos — sus columnas (`year`, `make`, `model`, `VIN`,
etc.) no tienen sentido para un producto de otra vertical (ej. Bienes
Raíces, Artículos, per la taxonomía de 3 verticales documentada en
`business-overview.md`). La tabla de traducción de categorías
(FR7.5) solo tiene un ejemplo confirmado, de la vertical vehículos.

```question
prompt: "¿Qué debe pasar si un producto de una organización exportada NO pertenece a la vertical de vehículos (ej. Bienes Raíces, Artículos)? El formato cliente (data39.csv) es específico de vehículos."
header: "Productos no-vehículo"
multiSelect: false
options:
  - label: "A. Excluir del export (Recommended)"
    description: "Solo se incluyen productos de la vertical vehículos en el CSV/ZIP formato cliente — el resto se omite silenciosamente, ya que el formato no tiene columnas para ellos"
  - label: "B. Incluir con columnas vacías"
    description: "El producto aparece en el CSV con category/type genéricos y el resto de columnas específicas de vehículo vacías"
  - label: "X. Other (please specify)"
    description: "Otro comportamiento"
```

[Answer]: A. Excluir del export

## Q2 — Nombre de archivo para `all_organizations=true`

`contract-summary.md` § Open Questions dejó esto diferido a esta
etapa. El nombre actual para un export puntual es
`catalogo_{org_segment}_{fecha}.zip`.

```question
prompt: "¿Qué nombre de archivo usamos para el export de \"todas las organizaciones\"?"
header: "Nombre de archivo"
multiSelect: false
options:
  - label: "A. catalogo_TODAS_{fecha}.zip (Recommended)"
    description: "Mismo patrón que el caso puntual, con \"TODAS\" en vez de un código de organización — coherente y fácil de reconocer"
  - label: "X. Other (please specify)"
    description: "Otro patrón de nombre"
```

[Answer]: A. catalogo_TODAS_{fecha}.zip

## Q3 — Valor exacto del campo de auditoría distinguible

`contract-summary.md` § Open Questions también diferido acá.

```question
prompt: "¿Qué valor exacto usamos en el log de auditoría para distinguir un export \"todas las organizaciones\" de uno de una organización ajena puntual?"
header: "Campo de auditoría"
multiSelect: false
options:
  - label: "A. scope=ALL_ORGS (Recommended)"
    description: "Campo nuevo explícito, grepeable, sin ambigüedad con el mensaje existente de export puntual"
  - label: "X. Other (please specify)"
    description: "Otro valor/formato"
```

[Answer]: A. scope=ALL_ORGS

## Consolidated Summary Confirmation

- Productos fuera de la vertical vehículos se excluyen del export formato cliente (Q1).
- Nombre de archivo para "todas": `catalogo_TODAS_{fecha}.zip` (Q2).
- Campo de auditoría: `scope=ALL_ORGS` (Q3).
- El resto de decisiones (mapeo de columnas, resolución batch de org_code, límite global, permiso, popups) ya están fijadas por etapas previas — sin preguntas adicionales.

Does this all look correct before I generate the functional design artifacts for u1-cross-org-export-api?

```question
prompt: "Does this all look correct before I generate the functional design artifacts for u1-cross-org-export-api?"
header: "Confirmación"
multiSelect: false
options:
  - label: "Looks correct"
    description: "Todo bien, generá los artefactos"
  - label: "Request changes"
    description: "Algo hay que ajustar antes de generar"
```

[Answer]: Looks correct
