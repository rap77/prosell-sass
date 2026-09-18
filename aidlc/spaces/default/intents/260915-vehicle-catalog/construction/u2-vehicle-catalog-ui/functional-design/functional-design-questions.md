## Sources

- [consumes:unit-of-work] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/units-generation/unit-of-work.md`
- [consumes:unit-of-work-story-map] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/units-generation/unit-of-work-story-map.md`
- [consumes:requirements] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/requirements-analysis/requirements.md`
- [consumes:components] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/domain-design/components.md`
- [consumes:contract-summary] `aidlc/spaces/default/intents/260915-vehicle-catalog/inception/contract-design/contract-summary.md`
- Refined Mockups (aprobado): `mockups.md`, `interaction-spec.md`, `design-system-mapping.md`, `accessibility-checklist.md`

Unit: **U2 (`u2-vehicle-catalog-ui`)** — frontend, kind `ui`. Cubre US1.1 (indicador de autocompletado fallido), US1.2 (consumo del catálogo canónico en el editor de schema) y US2.1 (ubicación por producto). Refined Mockups ya fijó el diseño visual y de interacción completo (`mockups.md`/`interaction-spec.md`, ya aprobados) — este Functional Design se enfoca en la única pieza que quedó genuinamente abierta: el mecanismo exacto de FR1.4.

## Q1. Mecanismo de FR1.4 — cómo `category-schema-editor.tsx` consume el catálogo canónico del backend

Verificado contra código real: el schema de la categoría de vehículos usa exactamente el vocabulario `make`, `fuel_type`, `transmission`, `body_type`, `drivetrain`, etc. como `row.key` (`seed_categories.py`, `vin_decode_key: "make"` en la sección de vehículos) — el MISMO vocabulario que fija `FacebookVehicleValueCatalog` (U1). `FACEBOOK_FIELD_KEY_MAP` (`category-schema-editor.tsx:550`) hoy NO tiene entrada para `make` en absoluto (solo tiene `brand`, que pertenece a una categoría distinta a vehículos — real estate u otro vertical) — para vehículos, el campo `make` cae hoy al input manual de "Options" (gap preexistente, no introducido por este intent). No hay conflicto real de nombres para los campos de vehículo: coinciden carácter a carácter.

A. **Para campos de vehículo, llamar al endpoint nuevo (`GET /categories/facebook-values/{field_key}`) usando `row.key` directamente como `field_key`** — sin pasar por `FACEBOOK_FIELD_KEY_MAP` ni por el catálogo estático `facebook-values/index.ts`. No hace falta renombrar ni agregar alias: el vocabulario ya coincide. Los campos NO cubiertos por `FacebookVehicleValueCatalog` (category, item_state, platform, device, colores, brand de otros verticales, etc.) siguen usando `FACEBOOK_FIELD_KEY_MAP`/el catálogo estático `facebook-values/index.ts` sin cambios.
B. Mantener `FACEBOOK_FIELD_KEY_MAP` como está y agregar una tabla de traducción nueva (row.key → field_key del backend) solo para los campos de vehículo — indirección innecesaria dado que ambos vocabularios ya coinciden para estos campos.
X. Otro (especificar)

[Answer]: A

## Consolidated Summary Confirmation

- FR1.4: opción elegida arriba — reemplaza la fuente de `options` de campos de vehículo mapeados por una llamada al endpoint nuevo de U1, manteniendo el catálogo estático solo para campos no-vehículo.
- Resto de la UI (indicador de autocompletado fallido, campos de ubicación) ya especificado en Refined Mockups — sin cambios de diseño acá, solo implementación.
- **Confirmación explícita de AC2.1.5** (asunción marcada en `stories.md` como pendiente de confirmar en esta etapa): se confirma el comportamiento ya asumido — rechazar con error un par ciudad/provincia parcial (uno completado, el otro vacío), y revertir al default de organización cuando ambos quedan vacíos habiendo tenido antes un override, sin persistir un override parcial o vacío. Ver `functional-spec.md` § Workflow 3 paso 4 y `frontend-components.md` § 2.

- Looks correct
- Request changes

[Answer]: Looks correct
