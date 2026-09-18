# Unit Test Instructions — U2 (`u2-vehicle-catalog-ui`)

## Framework y configuración

Vitest + Testing Library (ya configurado en `apps/web`), sin configuración nueva.

## Comando exacto (scoped a este Unit)

El developer debe confirmar los paths reales exactos de los archivos de test existentes de `SchemaFieldRenderer`/`VinDecodeField`/`category-schema-editor` con `fd`/`rg` antes de correr (no asumir convención sin verificar) — extender esos archivos reales, no crear duplicados. Comando de ejemplo (ajustar paths tras confirmarlos):

```bash
cd apps/web && pnpm vitest run --dir tests/components -t "VinDecodeField|SchemaFieldRenderer|category-schema-editor|ProductLocationFields"
```

## Cobertura esperada

- Indicador de mismatch (US1.1): 3-5 tests agregados al archivo real existente de `VinDecodeField`/`SchemaFieldRenderer`.
- Consumo del catálogo canónico en schema editor (US1.2): 3-5 tests agregados al archivo real existente de `category-schema-editor`.
- `ProductLocationFields` (US2.1): 5-8 tests (componente nuevo, Standard strategy completa).

Piso general: 40% de cobertura de línea en frontend (piso ya aceptado del proyecto, asimétrico respecto al backend), CI ejecuta la suite completa antes de merge.

## Mocking/Stubbing

- Mock de `fetch`/TanStack Query para los 2 contratos de U1 (`POST /vehicles/decode-vin`, `GET /categories/facebook-values/{field_key}`) — mismo patrón ya usado en tests existentes de estos componentes.
- `ProductLocationFields`: mock del `PATCH` de producto ya existente.

## Test Data

- Al menos un caso de `unmatched_fields` no vacío (campo con match fallido) y uno vacío (todos matchean).
- Al menos un `row.key` de vehículo (ej. `body_type`) y uno no-vehículo (ej. `platform`) para `category-schema-editor`.
- Casos de `ProductLocationFields`: override completo, par parcial (solo ciudad), par vacío con override previo.
