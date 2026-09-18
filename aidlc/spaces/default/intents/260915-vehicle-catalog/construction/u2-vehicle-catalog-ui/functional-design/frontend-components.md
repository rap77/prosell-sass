# Frontend Components — U2 (Unit `u2-vehicle-catalog-ui`)

Component-level detail para las 3 superficies de UI ya especificadas en Refined Mockups (`interaction-spec.md`). Este archivo agrega jerarquía, estado, e integración de API — no redefine estados/accesibilidad, ya fijados ahí.

## 1. Indicador de mismatch en el bloque `select` de `SchemaFieldRenderer.tsx` (corrección post-revisión — no un componente nuevo `CanonicalSelectField` sobre `GenericFormFields`, que no existe/no está wireado)

**Jerarquía real** (verificada contra código): `SchemaFormSection.tsx` → `SchemaFieldRenderer.tsx` (una instancia por campo del schema, dispatch por `entry.render_as`/`entry.type`) → bloque `render_as: "vin_decode"` renderiza `VinDecodeField`; bloque `type: "select"` renderiza `SelectControlled`. `GenericFormFields`/`GenericFormFieldsV2`/`GenericProductForm` NO se usan — no tienen importadores reales, no son parte de este flujo.

**Mecanismo de propagación de `unmatched_fields`** (corrección post-revisión, camino de datos completo):

1. `DecodeVinResponseSchema` (`apps/web/src/lib/api/schemas/decodeVin.ts`) se extiende con `unmatched_fields: z.array(z.string()).default([])` — hoy el schema Zod solo declara `{ vin, vehicle }` y descarta el campo nuevo del backend silenciosamente al parsear.
2. `useDecodeVin()` (`apps/web/src/lib/api/vehicles.ts`) se extiende para devolver también `unmatchedFields` (hoy retorna `{ vin, ...data.vehicle }`, sin pasar nada fuera de `vehicle`).
3. `VinDecodeFieldProps.onDecode` cambia de `(decoded: DecodedVehicle) => void` a `(decoded: DecodedVehicle, unmatchedFields: string[]) => void`.
4. `mapDecodedToForm(decoded, schema, setValue)` (`VinDecodeField.tsx`) se extiende a `mapDecodedToForm(decoded, schema, setValue, unmatchedFields)`: además de su lógica actual (que YA deja el campo sin tocar cuando `value` es `null` — AC1.1.2 "queda vacío" ya funciona hoy sin cambios), agrega `setValue("_unmatchedFields", unmatchedFields)` — un campo RHF virtual (prefijo `_`, no forma parte del schema, se excluye del payload de guardado) que actúa como canal compartido entre el bloque `vin_decode` y los bloques `select` del mismo formulario, sin necesidad de lift-state a un componente padre nuevo.
5. En el bloque `type: "select"` de `SchemaFieldRenderer`, un `useWatch({ control, name: "_unmatchedFields" })` lee ese canal y deriva `const unmatched = (watchedUnmatched ?? []).includes(fieldKey)`.
6. El JSX del bloque `select` envuelve `<SelectControlled .../>` (sin modificar ese componente) con el ícono de ayuda "(i)" + texto "No se pudo autocompletar — completar a mano" cuando `unmatched` es `true` — mismo patrón visual ya aprobado en `interaction-spec.md`/`mockups.md`.

**Integración de API**: `POST /vehicles/decode-vin` (Contrato 1, extendido) — vía los cambios de (1)-(2) arriba.

**Validación de formulario**: al submit, un valor manual se valida contra `Category.validate_attributes()` en el backend (sin validación duplicada en frontend más allá de "requerido" si el campo lo es) — el error se muestra inline usando el mecanismo de error centralizado ya vigente en el frontend (mandate Q6 de `team-practices.md`).

## 2. `ProductLocationFields` (extensión del par ciudad/estado de `OrganizationFormFields.tsx`)

**Jerarquía**: Vista de detalle de producto → `ProductLocationFields` (dos inputs: Ciudad, Provincia + badge condicional).

**Props/State**: ver `interaction-spec.md` (`city`, `state`, `isInherited`, `onChange`, `onSave`). Estado local: `hasOverride: boolean` derivado de `city !== null || state !== null` a nivel de producto (no de organización).

**Integración de API**: `GET`/`PATCH` del producto (endpoints ya existentes, sin cambios de contrato — `location_city`/`location_state` ya expuestos). `onSave` llama al PATCH existente de producto con ambos campos como una unidad — nunca uno solo.

**Validación de formulario**: rechazo de par parcial (uno completado, el otro vacío) ANTES de llamar al backend (validación de UI, ahorra un roundtrip) — mensaje inline "Completá ambos campos o dejalos vacíos para heredar el default de organización" (AC2.1.5). Si ambos quedan vacíos habiendo tenido override: se interpreta como "volver a heredar", no como error.

## 3. `category-schema-editor.tsx` — consumo del catálogo canónico (extensión, no componente nuevo)

**Jerarquía**: sin cambio de jerarquía — el componente ya existe; cambia únicamente la fuente de datos de `options` para los `row.key` de vehículo.

**Estado nuevo**: por cada `row` del schema cuyo `row.key` esté en el vocabulario de vehículo (`make`, `fuel_type`, `transmission`, `body_type`, `drivetrain`, `wheelbase_type`, `bed_type`, `cab_type`, `electrification_level`), un hook de datos (`useCanonicalFieldOptions(row.key)`, patrón TanStack Query ya vigente en el proyecto) reemplaza la lectura estática de `facebook-values/index.ts` vía `FACEBOOK_FIELD_KEY_MAP`.

**Integración de API**: `GET /categories/facebook-values/{row.key}` (Contrato 2, solo `CurrentUser`, sin gate adicional de Platform Admin en el endpoint — la UI que lo llama ya está gateada). Si 404: fallback al input manual de "Options" (mismo comportamiento ya existente para un `field_key` sin `FacebookFieldKey` mapeado).

**Sin cambio** para `row.key` fuera del vocabulario de vehículo — siguen usando `FACEBOOK_FIELD_KEY_MAP`/`facebook-values/index.ts` tal cual.

## Puntos de integración de API (resumen)

| Componente                                        | Endpoint                                      | Contrato               |
| ------------------------------------------------- | --------------------------------------------- | ---------------------- |
| `VinDecodeField` (vía `SchemaFieldRenderer.tsx`)  | `POST /vehicles/decode-vin`                   | Contrato 1 (extendido) |
| `category-schema-editor.tsx` (campos de vehículo) | `GET /categories/facebook-values/{field_key}` | Contrato 2 (nuevo)     |
| `ProductLocationFields`                           | `PATCH` de producto (ya existente)            | Sin cambio de contrato |
