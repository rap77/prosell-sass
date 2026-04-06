# Session 2026-04-04: VehicleForm SELECT & DB Migration

## DB Migration - RESUELTO

**Problema**: Tablas `vehicles`, `products`, `categories`, `sessions`, `oauth_accounts`, `facebook_accounts`, `facebook_pages`, `product_images` faltaban en la DB. Alembic tenía 2 ramas merge pendientes (`b1c2d3e4f5a6` y `094a57cf7b48`).

**Solución aplicada**:
1. Creación directa de tablas e índices vía SQL en PostgreSQL
2. Alembic stamp a ambas ramas como current
3. Merge migration creada: `20260404_1810-504440751584_merge_vehicle_products_with_user_dealers.py`
4. Endpoint `/api/v1/vehicles` funcionando correctamente

**Tables created**: categories, products, product_images, vehicles, sessions, oauth_accounts, facebook_accounts, facebook_pages (+ all indexes)

## VehicleForm Select Bug - PENDING

**Sintoma**: VIN decode retorna datos correctos del backend, pero los Select fields no muestran el valor seleccionado visualmente.

**Root cause identificado**: Dynamic `key` props en Selects (`key={\`make-${field.value}\`}`) forzaban remounts → Radix Select perdia estado interno → "controlled↔uncontrolled" warnings.

**Fixes aplicados** (bug persiste):
- Removidos todos los dynamic `key` props de Selects
- Unificado patrón: `value={field.value || ""}` + `onValueChange={(val) => field.onChange(val || undefined)}`
- Year Select: `Number(val)` en vez de `parseInt(val, 10)` (arreglaba NaN)
- Default values para Selects: `undefined` en vez de `""`
- Form state se actualiza correctamente (logs confirman), pero visualmente no se refleja

**Hipotesis actual**: React 19 + @radix-ui/react-select v2.2.6 incompatibility con `useControllableState`. El Select no re-renderiza visualmente cuando el valor externo cambia via RHF Controller.

**Archivos modificados** (NO commiteados):
- `apps/web/src/components/forms/VehicleForm.tsx`
- `apps/api/alembic/versions/20260404_1810-...merge_vehicle_products_with_user_dealers.py` (nuevo)
- `apps/api/alembic/versions/20260324_2102-17d9ed732cf9_complete_publications_table.py` (reverted)
- `apps/web/package.json`, `apps/web/src/app/layout.tsx`
- `tests/e2e/specs/vehicles.spec.ts` (+73 lines)

**Proxima sesion**:
1. Investigar issue conocido React 19 + Radix Select
2. Test minimo reproducible
3. Aplicar workaround o wrapper custom si no hay fix directo