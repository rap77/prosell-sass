## Sources

- [consumes:unit-of-work] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/units-generation/unit-of-work.md`
- [consumes:unit-of-work-story-map] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/units-generation/unit-of-work-story-map.md`
- [consumes:requirements] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/requirements-analysis/requirements.md`
- [consumes:components] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/domain-design/components.md`
- [consumes:contract-summary] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/contract-design/contract-summary.md`

Unit: **U1 (`u1-vehicle-catalog-api`)** — backend. Cubre FR1 (reconciliación, porción backend de US1.1/US1.2), FR3 (migración legacy), FR4 (documentación de publisher), FR5 (sanitización CSV). El resto de las FR/reglas ya está fijado con precisión suficiente en `requirements.md`/`components.md`/`contract-summary.md` — queda una sola pregunta genuinamente abierta, ya señalada como tal en `contract-summary.md` § Open Questions.

## Q1. Manejo cuando `FacebookVehicleValueCatalog` no tiene entrada para un campo esperado

`contract-summary.md` dejó esto abierto explícitamente para esta etapa. Un campo sin entrada en el catálogo puede ser (a) un campo genuinamente sin catálogo de Facebook (ej. un campo de vehículo que Facebook no pide), o (b) un bug de configuración (el catálogo debería tener esa entrada y no la tiene). ¿Cómo distinguir y manejar cada caso?

A. **404 para el endpoint de opciones canónicas + log de warning server-side para cualquier `field_key` no reconocido** — el llamador (schema editor) ve un error claro, y queda registro para investigar si era un bug de configuración. Para el decode de VIN, un campo sin catálogo simplemente no se intenta reconciliar (queda con el valor normalizado tal cual, sin agregarlo a `unmatched_fields` — ese campo no es "no matcheado", es "sin catálogo aplicable").
B. Tratar "sin catálogo" igual que "sin match" en ambos casos (decode de VIN Y endpoint de opciones) — más simple, pero mezcla dos causas raíz distintas bajo la misma señal.
X. Otro (especificar)

[Answer]: A

## Consolidated Summary Confirmation

- `FacebookVehicleValueCatalog`: reconcile(field_key, raw_value) → canonical_value | None; get_options(field_key) → list[str] | None (None = campo sin catálogo, distinto de "sin match").
- Reglas de negocio nuevas: BR1.1 (matching de reconciliación), BR1.2 (campo sin match → null + unmatched_fields), BR1.4 (endpoint de opciones, 404 si field_key desconocido), BR3.1 (migración legacy con guardas triples), BR5.1 (sanitización de fórmulas CSV).
- FR4 (documentación de publisher) no genera regla de negocio nueva — se cubre como documentación en `functional-spec.md`, sin comportamiento nuevo que testear.

- Looks correct
- Request changes

[Answer]: Looks correct
