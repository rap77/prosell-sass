# Code Summary — U2 (`u2-vehicle-catalog-ui`)

Plan ya aprobado (`code-generation-plan.md`, Testing Contract fingerprint `sha256:0e8b9d1fea01ce975b308ef600453d447b5a81330082324fb97ef4b7f222b1c0`). Este documento resume la implementación de los Steps 2-8.

## Qué se implementó

### 1. Propagación de `unmatched_fields` (US1.1, AC1.1.1/AC1.1.2)

Mecanismo completo per `frontend-components.md` § 1:

- `apps/web/src/lib/api/schemas/decodeVin.ts`: `DecodeVinResponseSchema` ahora declara `unmatched_fields: z.array(z.string()).default([])` — antes esa clave se descartaba silenciosamente al parsear.
- `apps/web/src/lib/api/vehicles.ts`: `useDecodeVin()` devuelve `DecodeVinResult = DecodedVehicle & { unmatchedFields: string[] }` (nuevo tipo exportado). `unmatchedFields` vive como propiedad hermana, no dentro de `DecodedVehicle`, para que ningún consumidor existente de `DecodedVehicle` deje de compilar.
- `apps/web/src/components/forms/schema/VinDecodeField.tsx`: `VinDecodeFieldProps.onDecode` cambia a `(decoded: DecodedVehicle, unmatchedFields: string[]) => void`; `handleDecode` desestructura `{ unmatchedFields, ...decoded }` del resultado de la mutation. `mapDecodedToForm()` gana un 4º parámetro obligatorio `unmatchedFields: string[]` y ahora abre con `setValue("_unmatchedFields", unmatchedFields)` — el canal RHF virtual (prefijo `_`, fuera de todo schema Zod de categoría) que el bloque `select` lee de vuelta.
- `apps/web/src/components/forms/schema/SchemaFieldRenderer.tsx`: el bloque `render_as: "vin_decode"` pasa `unmatchedFields` a `mapDecodedToForm`. El bloque `type: "select"` agrega `useWatch({control, name: "_unmatchedFields"})` (llamado incondicionalmente al tope del componente, antes de cualquier `return` temprano — rules-of-hooks) y deriva `unmatched = watchedUnmatched.includes(fieldKey)`. Cuando `true`: un `<button>` focoable con ícono `Info` (lucide-react) + `title`/`aria-label`, y un `<p>` con el texto visible "No se pudo autocompletar — completar a mano" (AC1.1.2).

**Nota de accesibilidad**: `interaction-spec.md` pide `aria-describedby` conectando el trigger del select con el texto de ayuda, pero `frontend-components.md` § 1 prohíbe explícitamente modificar `SelectControlled` ("sin modificar ese componente"), y ese componente no expone ningún prop de passthrough (`aria-describedby` no está en su interfaz). Se implementó el indicador como un `<button>`+ícono adyacente y un `<p>` de texto real en el orden normal del DOM junto al select — satisface el requisito literal de `accessibility-checklist.md` ("el texto de ayuda... es texto real leído junto al campo") sin tocar el componente compartido. Detalle en `construction/code-generation/memory.md` § Deviations.

### 2. Consumo del catálogo canónico en `category-schema-editor.tsx` (US1.2, AC1.2.1)

- `apps/web/src/lib/api/schemas/categorySchema.ts`: nuevo `FacebookValueOptionsResponseSchema` (`{field_key: string, options: string[]}`), wire shape de `GET /categories/facebook-values/{field_key}`.
- `apps/web/src/lib/api/categories.ts`: nuevo hook `useCanonicalFieldOptions(fieldKey)` (patrón TanStack Query ya vigente — `useQuery` con `queryKey: ["canonical-field-options", fieldKey]`, `enabled: Boolean(fieldKey)`). Devuelve `string[] | undefined` — `undefined` en 404 (field_key sin catálogo), para que el caller pueda distinguir "todavía no cargó" de "no hay catálogo para esta clave".
- `apps/web/src/components/admin/category-schema-editor.tsx`: nueva constante `VEHICLE_FIELD_KEYS` (los 9 `row.key` del vocabulario de vehículo: `make`, `fuel_type`, `transmission`, `body_type`, `drivetrain`, `wheelbase_type`, `bed_type`, `cab_type`, `electrification_level`). `SortableRow` llama `useCanonicalFieldOptions(isVehicleField ? row.key : undefined)` incondicionalmente (rules-of-hooks). Para un `row.key` de vehículo: botón "Load from vehicle catalog" (visible solo si `canonicalOptions.data` tiene contenido) que aplica el array exacto devuelto por el endpoint a `row.options` — reemplaza el botón estático "Load from Facebook catalog"/`FACEBOOK_FIELD_KEY_MAP` SOLO para estas 9 claves. Para cualquier otro `row.key`: comportamiento sin cambios (`FACEBOOK_FIELD_KEY_MAP`/`FACEBOOK_VALUES` estático, tal como hoy).

**Decisión de diseño (no especificada explícitamente por `frontend-components.md`/`functional-spec.md`)**: se implementó como botón de carga manual (mismo patrón UX que el botón estático que reemplaza), no como sobreescritura automática de `row.options` en cada render — auto-sobreescribir un campo editable mientras un admin lo está editando sería una UX destructiva y sorpresiva. Detalle en `memory.md` § Deviations.

### 3. `ProductLocationFields` (US2.1, AC2.1.1/AC2.1.2/AC2.1.4/AC2.1.5)

Nuevo componente `apps/web/src/components/product/ProductLocationFields.tsx` — par de inputs de texto (Ciudad, Provincia) + badge condicional, siguiendo el patrón ya usado por `OrganizationFormFields.tsx` a nivel de organización, aplicado acá a nivel de producto. Totalmente controlado (props `city`, `state`, `isInherited`, `onChange`, `onSave`, `disabled?` — exactamente el contrato de `interaction-spec.md`); el único estado interno es el error de validación.

- `handleSave()`: par parcial (uno completado, el otro vacío) → error inline (`"Completá ambos campos o dejalos vacíos para heredar el default de organización"`), `onSave` NUNCA se llama (AC2.1.5, validación de UI antes del roundtrip). Par completo → `onSave(city, state)`. Par vacío (habiendo tenido override) → `onSave(null, null)`, interpretado como "volver a heredar" — NO es un error, resolución explícita ya confirmada en `frontend-components.md` § 2 (functional-spec.md review, hallazgo #4).
- Badge "Heredado de organización" (`role="status"`, texto real) visible solo cuando `isInherited=true` (AC2.1.2).

**Sin cambio de contrato de backend** — usa el `PATCH` de producto ya existente (`location_city`/`location_state` ya expuestos), tal como especifica `frontend-components.md` § 2. Ningún endpoint nuevo.

## Tests

Todos los archivos de test REALES fueron confirmados con `fd`/`rg` antes de escribir (ver `construction/code-generation/memory.md` § Interpretations para el detalle completo, incluyendo un segundo archivo de test full-render de `CategorySchemaEditor` descubierto solo vía `pnpm vitest run` sin filtro).

| Archivo de test                                                               | Extendido / nuevo         | Tests agregados                                                                                                                                                                                 |
| ----------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/forms/schema/VinDecodeField.test.tsx`                | extendido                 | +2 (canal `_unmatchedFields`, AC1.1.1/AC1.1.2) — los 3 tests existentes de `mapDecodedToForm` se actualizaron para pasar el nuevo 4º argumento obligatorio                                      |
| `apps/web/src/components/forms/schema/SchemaFieldRenderer.test.tsx`           | extendido                 | +3 (ícono de ayuda mostrado/oculto, AC1.1.1/AC1.1.2)                                                                                                                                            |
| `apps/web/tests/unit/lib/api/vin-decode.test.ts`                              | extendido                 | +2 (`unmatchedFields` expuesto por `useDecodeVin()`) — 1 test existente actualizado (`toEqual` ahora incluye `unmatchedFields: []`)                                                             |
| `apps/web/tests/unit/api/vehicles.test.tsx`                                   | extendido                 | 1 test existente actualizado (mismo motivo)                                                                                                                                                     |
| `apps/web/src/components/admin/category-schema-editor.tsx` (tests co-locados) | extendido                 | +3 (AC1.2.1: opciones exactas del endpoint, fallback 404, campo no-vehículo sin cambios)                                                                                                        |
| `apps/web/tests/unit/components/admin/CategorySchemaEditor.test.tsx`          | extendido (mock agregado) | 0 nuevos — se agregó `vi.mock("@/lib/api/categories", ...)` para que los 18 tests full-render existentes sigan pasando (`SortableRow` ahora llama un hook de TanStack Query incondicionalmente) |
| `apps/web/tests/components/product/ProductLocationFields.test.tsx`            | nuevo                     | 8 (AC2.1.1/AC2.1.2/AC2.1.4/AC2.1.5 — override completo, badge visible/oculto, par parcial x2, reversión a default, limpieza de error, disabled)                                                 |

**Comando ejecutado** (equivalente al Step 1 del plan, con los paths reales confirmados):

```bash
cd apps/web && pnpm vitest run \
  src/components/forms/schema/VinDecodeField.test.tsx \
  src/components/forms/schema/SchemaFieldRenderer.test.tsx \
  src/components/admin/category-schema-editor.test.tsx \
  tests/unit/components/admin/CategorySchemaEditor.test.tsx \
  tests/unit/lib/api/vin-decode.test.ts \
  tests/unit/api/vehicles.test.tsx \
  tests/components/product/ProductLocationFields.test.tsx \
  src/components/forms/UnifiedProductForm.test.tsx
```

Resultado: **8 archivos, 68 tests, 0 fallas.**

También se corrió la suite COMPLETA del proyecto (`pnpm vitest run`, sin filtro) para descartar regresiones fuera del set tocado: **169 archivos, 1355 tests, 0 fallas.**

`pnpm tsc --noEmit`: sin errores. `pnpm eslint` sobre cada archivo tocado/creado: sin warnings (`--max-warnings=0` ya vigente en CI).

## Decisiones clave

1. **`mapDecodedToForm`'s 4º parámetro es obligatorio, no opcional** — fuerza a cada call site a ser explícito sobre el canal en vez de asumir un default silencioso `[]`. Único call site de producción (`SchemaFieldRenderer.tsx`) actualizado; los 3 tests preexistentes de la función se actualizaron para pasar el argumento explícitamente.
2. **`useCanonicalFieldOptions` vive en `apps/web/src/lib/api/categories.ts`** (no en `products.ts`, donde vive `usePatchCategorySchema`) — sigue la organización ya existente del proyecto (`categories.ts` para todo lo de `/api/v1/categories/*` que no sea CRUD de producto).
3. **Botón manual "Load from vehicle catalog" en vez de auto-población** — ver Deviations en `memory.md`.
4. **Indicador de mismatch sin `aria-describedby`** — ver Deviations en `memory.md` (restricción explícita de no modificar `SelectControlled`).

## Issues / Concerns

- **Pendiente, fuera del alcance aprobado de este dispatch**: `ProductLocationFields` está completo y probado como componente standalone, pero NO está wireado a ninguna vista real de producto — `code-generation-plan.md` no tiene un Step de integración a página, y `UnifiedProductForm.tsx` (el único formulario real de creación/edición de producto) no tiene hoy ningún campo de `location_city`/`location_state` ni un flujo de guardado por-campo compatible con el prop `onSave` de este componente (persiste todo el formulario vía un único `handleSubmit`). AC2.1.1/AC2.1.4 ("Given el detalle de un producto existente/estoy creando un producto...") describen un flujo de guardado real que un usuario puede disparar — sin el wiring, ese flujo no es accionable todavía en producción, aunque el contrato de comportamiento del componente (validación, badge, reversión a default) está completamente implementado y probado. Se documenta acá en vez de expandir el alcance de este Unit sin aprobación explícita (consistente con el patrón ya establecido en este proyecto de no ampliar alcance sin volver a preguntar). Ver detalle completo en `construction/code-generation/memory.md` § Open questions.
- **Corrección post-revisión (2026-09-18)**: `traceability.json` marcaba `status: "OK"` para AC2.1.1/AC2.1.2/AC2.1.4/AC2.1.5, contradiciendo el propio párrafo de arriba. Corregido a `status: "Deferred"` para las 4 — el componente está construido y probado per el alcance exacto del plan aprobado, pero la integración a una vista real de producto queda pendiente de un Unit/dispatch de seguimiento; ver `traceability.json` para el detalle completo por AC.
- Ninguno otro.

## Next Steps

- Un dispatch/Unit de seguimiento debe decidir e implementar el punto de integración de `ProductLocationFields` (extender `UnifiedProductForm.tsx` con un guardado inmediato por-campo, o una sección nueva de "detalle de producto" separada del formulario de creación/edición) y de dónde sale el default de organización para calcular `isInherited`.
- Build and Test (próxima etapa): confirmar el Cross-Unit Final Coverage Gate contra `traceability.json` de este Unit y de `u1-vehicle-catalog-api`.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-18T00:00:00Z
**Iteration:** 2

### Findings

| #   | Severity     | Location                            | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Recommendation                                                    |
| --- | ------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | — (resuelto) | `traceability.json`                 | El hallazgo Critical de la iteración 1 (AC2.1.1/AC2.1.2/AC2.1.4/AC2.1.5 marcadas `"OK"` pese a que `ProductLocationFields` no tiene ningún importador real fuera de sus propios tests) queda resuelto: las 4 entradas ahora usan `status: "Deferred"` — un valor válido de `verification.md` (`OK`, `GAP`, `ORPHAN`, `Deferred`, `N/A`) que exige justificación no vacía, y el texto de `target` la provee en detalle por AC (componente construido y probado a nivel unitario per el plan aprobado, sin ningún Step de integración a página en `code-generation-plan.md`, flujo no accionable por un usuario real hoy). No hay sobreestimación: el texto es explícito sobre lo que falta y no reclama cobertura funcional que no existe. | Ninguna — corrección aceptada tal cual.                           |
| 2   | Minor        | `code-summary.md` § Issues/Concerns | La línea agregada ("Corrección post-revisión (2026-09-18)") es consistente con `traceability.json` y con el resto del documento (§3 y § Next Steps ya describían el mismo gap de wiring en prosa) — no hay contradicción. Único matiz cosmético: el resto del documento no versiona sus decisiones con fecha, así que esta única línea fechada desentona levemente con el estilo del archivo.                                                                                                                                                                                                                                                                                                                                             | No bloqueante; opcional homogeneizar estilo en una futura pasada. |

### Validation Tool Results

| Tool                                                               | Result                                                                                                                             | Interpretación                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rg -n '"status"' traceability.json`                               | 10 matches: 6× `"OK"` (AC1.1.1, AC1.1.2, AC1.1.3, AC1.1.4, AC1.2.1, AC2.1.3), 4× `"Deferred"` (AC2.1.1, AC2.1.2, AC2.1.4, AC2.1.5) | Confirma exactamente las 4 ACs señaladas en la iteración 1 y ninguna otra — las 6 ACs de US1.1/US1.2 (verificadas sólidas en iteración 1, sin drift esperado) quedaron intactas en `"OK"`.                                                                                                                                                                                                                                                               |
| Lectura de `.claude/knowledge/aidlc-shared/verification.md`        | `Deferred` es un status válido y exige target/justificación no vacía                                                               | Ambos requisitos se cumplen en las 4 entradas corregidas.                                                                                                                                                                                                                                                                                                                                                                                                |
| Lectura de `construction/code-generation/memory.md` (§ Deviations) | Bloqueada por el hook de scope del reviewer (`aidlc-reviewer-scope.ts`), que trata ese path como archivo de otra unit              | No pude confirmar directamente la entrada de `## Deviations` solicitada en el brief. Evidencia indirecta suficiente: la línea de `code-summary.md` § Issues/Concerns documenta la misma corrección con la misma fecha (2026-09-18) y el mismo alcance (4 ACs, `OK`→`Deferred`), y el propio `code-summary.md` cita `memory.md` como el lugar del detalle completo — no encontré ninguna señal de inconsistencia entre ambos artefactos que sí pude leer. |

### Summary

La corrección dirigida resuelve el hallazgo Critical de la iteración 1 sin introducir problemas nuevos: `Deferred` es el status correcto para un componente construido y probado exactamente según el plan aprobado pero sin wiring a una vista real (no es un `GAP` de esta unit — el plan aprobado nunca incluyó un Step de integración — ni un `OK` engañoso), la justificación es honesta y no infla lo que está hecho, y el resto del set de ACs (US1.1/US1.2) permanece sin tocar. No se re-verificó desde cero esa porción, conforme a la instrucción del dispatch.
