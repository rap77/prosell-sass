## Sources

- [consumes:unit-of-work] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/units-generation/unit-of-work.md`
- [consumes:unit-of-work-dependency] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/units-generation/unit-of-work-dependency.md`
- [consumes:components] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/domain-design/components.md`
- [consumes:requirements] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/requirements-analysis/requirements.md`

Un solo borde inter-unit real: U2 (`u2-vehicle-catalog-ui`) depende parcialmente de U1 (`u1-vehicle-catalog-api`) para US1.1/US1.2 (`unit-of-work-dependency.md`). Sin API pública/externa nueva — FR4 documenta un contrato ya existente (`IPublisherService`) sin exponerlo a un consumidor externo nuevo. Dos puntos de integración concretos, ambos sync REST/HTTP (mismo mecanismo ya usado en toda la plataforma, sin necesidad de mensajería/eventos):

1. **Decode de VIN reconciliado** — extensión aditiva de `POST /vehicles/decode-vin` (`VINDecodeResponse`/`DecodedVehicle`, ya existente, verificado contra `vehicle_router.py`): los valores de campo ya vienen reconciliados; se agrega `unmatched_fields: list[str]` para distinguir "NHTSA no dio valor" (campo `null`, comportamiento ya existente) de "NHTSA dio un valor pero sin match canónico" (AC1.1.2) — consumidores existentes que ignoran campos nuevos siguen funcionando sin cambios.
2. **Catálogo de opciones canónicas** — endpoint nuevo `GET /categories/facebook-values/{field_key}` que devuelve el conjunto de opciones canónicas vigentes para ese campo (US1.2/AC1.2.1), reemplazando la lista estática que `category-schema-editor.tsx` mantiene a mano hoy (`FACEBOOK_FIELD_KEY_MAP`).

No hay ambigüedad genuina en mecanismo (REST/HTTP, ya vigente en toda la plataforma) ni en ownership (U1 dueño de ambos specs, U2 consumidor) — se salta el bloque interactivo y se va directo al resumen.

## Consolidated Summary Confirmation

- Contrato 1: extensión aditiva de `POST /vehicles/decode-vin` (agrega `unmatched_fields`, sin romper consumidores existentes).
- Contrato 2: nuevo `GET /categories/facebook-values/{field_key}` (catálogo canónico por campo).
- Ambos: sync REST/HTTP, dueño U1, consumidor U2.

- Looks correct
- Request changes

[Answer]: Looks correct
