# Risk and Sequencing Rationale — 260911-cross-org-export-ux

## Heurística de secuenciación de Bolts: no aplica (un solo Bolt)

Con un único Bolt candidato (`bolt-cross-org-export-ux`, bundleando U1
y U2 — ver `bolt-plan.md`), no hay nada que rankear ni secuenciar
entre Bolts. No se aplicó WSJF, risk-first, ni value-first a nivel de
Bolt — esas heurísticas comparan Bolts entre sí, y este intent no
tiene más de uno.

## Por qué un solo Bolt (decisión ya tomada en Units Generation, reconfirmada acá)

`team-practices.md` § Way of Working ya reconfirma el precedente
`260903-catalog-client-export`: ninguna de las dos Units (U1 backend,
U2 frontend) entrega valor de usuario independiente por sí sola. El
fix de mapeo de CSV + export "todas" sin el selector de UI que lo
dispare no resuelve el dolor real reportado por el usuario (seguiría
sin poder elegir "todas" desde la pantalla); el selector/filtrado de
grilla sin el backend corregido exportaría/mostraría datos igual de
incorrectos que hoy. Separar en 2 Bolts secuenciales hubiera diferido
la entrega de valor real sin ganar nada — ambas Units se construyen
en la misma pasada de Construction.

## Deviación del orden topológico de 2.7: ninguna

`unit-of-work-dependency.md` declara `U2 depends_on: [U1]` (dependencia
de INTEGRACIÓN/contrato, no de implementación secuencial —
`contract-summary.md` ya fija el contrato completo antes de Code
Generation). Con un solo Bolt bundleando ambas Units, el orden
topológico se respeta trivialmente: ambas se construyen en la misma
pasada, contra el contrato ya fijado, sin necesidad de que una espere
a que la otra termine de implementarse.

## Riesgo principal identificado (afirmado por el humano en la entrevista)

**Radio de explosión de "exportar todas las organizaciones"**: un
fallo único del chequeo de permiso (`_check_org_scope_permission()`
extendido a `all_organizations`) o de la resolución de `org_code`
por-producto expondría datos de TODA la plataforma en una sola
descarga, en vez del catálogo de una sola organización ajena (el
radio de explosión ya evaluado y aceptado para el caso puntual desde
`260910-export-cross-org`). Mitigaciones ya diseñadas (no nuevas en
esta etapa, solo referenciadas):

- Auditoría distinguible (FR6, `scope=ALL_ORGS` o equivalente).
- Confirmación de UI reforzada con conteo de organizaciones (FR5).
- Mismo chequeo de permiso ya usado para el sentinel puntual (FR4.4,
  NFR2) — sin mecanismo nuevo, reduciendo superficie de bug.

## Registro de riesgos

| Riesgo                                                                                                         | Probabilidad                                                     | Impacto                                                     | Mitigación                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Fallo del chequeo de permiso en `all_organizations`                                                            | Baja (reusa mecanismo ya probado)                                | Crítico (expone toda la plataforma)                         | Mismo chequeo ya usado para el sentinel puntual; atacado primero en la secuencia interna del Bolt (ver `bolt-plan.md`)                     |
| Resolución de `org_code` por-producto incorrecta (bug de la primera org resuelta reutilizada para todas)       | Media (patrón nuevo, aunque con precedente)                      | Alto (material de un dealer mezclado en la carpeta de otro) | Precedente de implementación ya documentado (`_resolve_org_codes()` adaptado); piso de test dedicado (punto 3 del piso mínimo)             |
| Agotamiento de memoria del ZIP en modo "todas" (NFR3, riesgo residual aceptado)                                | Baja en el corto plazo (límite global de 500)                    | Medio                                                       | `EXPORT_MAX_PRODUCTS=500` como límite global; sin mitigación adicional en este intent (riesgo residual ya aceptado en Practices Discovery) |
| Corrección de mapeo de columnas introduce una regresión silenciosa en el formato ya correcto de otras columnas | Baja (cada columna tiene test dedicado, punto 1 del piso mínimo) | Medio (dato incorrecto a un sistema externo)                | Test de regresión de valor (no solo de clave) por columna, ya afirmado en `team-practices.md`                                              |
