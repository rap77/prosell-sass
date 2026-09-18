# Entity Model — U1 (`u1-vehicle-catalog-api`)

Basado en `components.md` (Domain Design), `requirements.md` (FR1) y `contract-summary.md`. Una sola entidad nueva — `Category` y `Product` (ya existentes) no ganan atributos ni entidades nuevas en este intent (ADR-003 de Domain Design).

```yaml
entities:
  - name: CanonicalFieldOption
    description: Un valor canónico de Facebook Marketplace para un campo de vehículo, más los tokens crudos (post-normalización NHTSA) que reconcilian a él.
    owned_by: FacebookVehicleValueCatalog
    attributes:
      - name: field_key
        type: string
        required: true
        unique: false
        allowed_values:
          [
            "make",
            "fuel_type",
            "transmission",
            "body_type",
            "drivetrain",
            "wheelbase_type",
            "bed_type",
            "cab_type",
            "electrification_level",
          ]
        constraints: >
          Vocabulario del attribute_schema/VIN-decode (los mismos nombres que usan nhtsa_normalizer.py y
          Category.attribute_schema) — NO el enum FacebookFieldKey de apps/web/src/lib/i18n/facebook-values/index.ts
          (ese vocabulario es más amplio, cubre categorías de producto no-vehículo, y sus nombres no coinciden
          carácter a carácter con éstos, ej. body_style ≠ body_type, brand ≠ make). Corrección post-revisión:
          la lista original citaba "engine_type" (clave inventada, no existe en ningún lado) y omitía
          wheelbase_type/bed_type/cab_type/electrification_level (ya confirmados reales en Domain Design).
          BR1.1 (reconciliación en el decode de VIN) y BR1.4 (endpoint de opciones) consultan el MISMO catálogo
          con este MISMO vocabulario — no hay dos namespaces distintos dentro de FacebookVehicleValueCatalog.
          La traducción entre este vocabulario y FacebookFieldKey/row.key del schema editor (category-schema-editor.tsx,
          que ya tiene su propia FACEBOOK_FIELD_KEY_MAP con aliases como body_type→body_style) es responsabilidad
          de Functional Design de U2 (frontend) — ver Open Question ya asignada ahí en contract-summary.md.
      - name: canonical_value
        type: string
        required: true
        unique: false
        constraints: "Valor exacto que Facebook Marketplace acepta para field_key — carácter a carácter, sin normalizar casing en tiempo de consulta."
      - name: accepted_raw_aliases
        type: list[string]
        required: true
        default: []
        constraints: "Tokens ya normalizados por nhtsa_normalizer.py (salida de NHTSA_TO_FACEBOOK) que reconcilian a este canonical_value. Puede tener más de un alias por valor canónico (ej. variantes de casing/idioma que hoy produce el normalizador)."
    entity_constraints:
      - "La combinación (field_key, canonical_value) es única — no puede haber dos entradas para el mismo campo con el mismo valor canónico."
      - 'Un mismo raw alias no puede aparecer en accepted_raw_aliases de más de una entrada del mismo field_key (ambigüedad de reconciliación). Mecanismo de verificación (Minor, corrección post-revisión): Code Generation DEBE incluir un test dedicado que recorra todo el catálogo sembrado y falle si encuentra un alias duplicado dentro del mismo field_key — no alcanza con confiar en que "se va a validar", mismo riesgo ya visto en CATEGORY_TRANSLATION_TABLE (hallazgo #88, catálogo estático sin test propio).'
    relationships: []
```

## Resumen

`CanonicalFieldOption` es la única entidad nueva de este Unit — vive dentro de `FacebookVehicleValueCatalog` (domain service, mismo molde que `category_translation.py`), sin persistencia en base de datos (dato estático en código, igual que `CATEGORY_TRANSLATION_TABLE`). No hay relación con `Category` ni `Product`: la reconciliación consulta esta tabla por `field_key`, pero no referencia la entidad `Category` directamente — es `Category.validate_attributes()` quien, aguas abajo y sin cambios, valida el valor ya reconciliado contra las `options` configuradas del schema.
