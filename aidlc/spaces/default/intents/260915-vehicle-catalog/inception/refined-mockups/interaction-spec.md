# Interaction Specification — Catálogo Canónico de Vehículos para Facebook

Formato: `.claude/knowledge/aidlc-design-agent/component-spec-template.md`. Cubre los dos componentes nuevos/extendidos que introducen `mockups.md`, sobre la base de componentes ya existentes (`GenericFormFields`, `OrganizationPicker`).

---

## Select Canónico con Fallback (extensión de `GenericFormFields`)

| Field       | Value                                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component   | CanonicalSelectField (extensión de un campo de `GenericFormFields`)                                                                                       |
| Description | Select de atributo de vehículo autocompletado por el decode de VIN, con fallback visual cuando el valor decodificado no calza con ninguna opción canónica |
| Category    | input                                                                                                                                                     |

### States

| State     | Description                                                    | Trigger                                   |
| --------- | -------------------------------------------------------------- | ----------------------------------------- |
| default   | Opción seleccionada (manual o autocompletada con match exacto) | render inicial / decode exitoso con match |
| unmatched | Vacío, con ícono de ayuda (AC1.1.2)                            | decode de VIN sin opción correspondiente  |
| loading   | Decodificando VIN                                              | submit de VIN                             |
| error     | Valor manual sin opción correspondiente (AC1.1.3)              | intento de guardar                        |
| disabled  | No aplica en este intent                                       | —                                         |

### Props / Inputs

| Prop      | Type           | Required | Default | Description                                                               |
| --------- | -------------- | -------- | ------- | ------------------------------------------------------------------------- |
| value     | string \| null | no       | null    | Valor seleccionado actual                                                 |
| options   | string[]       | yes      | —       | Opciones del catálogo canónico para este campo                            |
| unmatched | boolean        | no       | false   | true cuando el decode de VIN no encontró opción correspondiente (AC1.1.2) |
| onChange  | function       | yes      | —       | Handler de cambio de valor                                                |

### Responsive Behaviour

| Breakpoint          | Behaviour                                                              |
| ------------------- | ---------------------------------------------------------------------- |
| mobile (<768px)     | Select a ancho completo, ícono de ayuda táctil (tap para ver el texto) |
| tablet (768–1024px) | Igual que mobile                                                       |
| desktop (>1024px)   | Select con ancho fijo, ícono de ayuda con hover                        |

### Accessibility

| Requirement          | Implementation                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA role            | `combobox` (select nativo o equivalente ya usado por `GenericFormFields`)                                                                   |
| Keyboard interaction | Tab para enfocar, flechas para navegar opciones, Enter para seleccionar; el ícono de ayuda es foco-able (Tab) y se activa con Enter/Espacio |
| Label / aria-label   | Label visible del campo + `aria-describedby` apuntando al texto de ayuda cuando `unmatched=true`                                            |
| Contrast ratio       | WCAG AA (4.5:1 texto, 3:1 componentes UI) — mismo estándar ya vigente en la plataforma                                                      |
| Screen reader        | Anuncia "Combustible, no se pudo autocompletar, completar a mano" cuando `unmatched=true`                                                   |
| Focus management     | El foco no se mueve automáticamente al campo `unmatched` — el usuario lo encuentra en el flujo normal del formulario                        |

### Usage Example

```
<CanonicalSelectField
  value={fuelType}
  options={facebookValues.fuel_type}
  unmatched={!facebookValues.fuel_type.includes(decodedValue)}
  onChange={setFuelType}
/>
```

---

## Campo de Ubicación con Indicador de Herencia (mismo par ciudad/estado de `OrganizationFormFields.tsx`, aplicado a nivel de producto)

Corrección post-revisión: `location_city`/`location_state` (`apps/api/src/prosell/domain/entities/product.py`) son dos strings libres, no una opción de una lista fija — no hay componente "Sucursal" seleccionable. El par de campos de texto "Ciudad"/"Provincia o Estado" ya usado en `OrganizationFormFields.tsx` para el default de organización es el patrón real a reutilizar a nivel de producto — no `OrganizationPicker` (ese componente es un dropdown de header para ver-como-otra-organización, sin relación estructural con este campo).

| Field       | Value                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component   | ProductLocationFields                                                                                                                                   |
| Description | Par de campos de texto (ciudad, estado) a nivel de producto, con etiqueta cuando el par mostrado es heredado de la organización (sin override guardado) |
| Category    | input                                                                                                                                                   |

### States

| State      | Description                                                                                                                    | Trigger                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| inherited  | Muestra el default de organización (ambos campos) + badge "Heredado de organización"                                           | producto sin override guardado           |
| overridden | Muestra el override del producto (ambos campos), sin badge                                                                     | producto con override guardado (AC2.1.1) |
| loading    | Cargando el detalle del producto                                                                                               | page load                                |
| error      | Un solo campo completado (ciudad sin estado o viceversa) o guardado con ambos vacíos tras tener override — rechazado (AC2.1.5) | intento de guardar                       |

### Props / Inputs

| Prop        | Type           | Required | Default | Description                                                                                                |
| ----------- | -------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| city        | string \| null | no       | null    | Ciudad actual (override o heredada)                                                                        |
| state       | string \| null | no       | null    | Provincia/Estado actual (override o heredado)                                                              |
| isInherited | boolean        | yes      | —       | true cuando el par mostrado es el default de organización, no un override guardado                         |
| onChange    | function       | yes      | —       | Handler de cambio de valor (ciudad o estado)                                                               |
| onSave      | function       | yes      | —       | Handler de guardado; rechaza par parcial o inválido (AC2.1.5) — ciudad y estado se guardan como una unidad |

### Responsive Behaviour

| Breakpoint          | Behaviour                                         |
| ------------------- | ------------------------------------------------- |
| mobile (<768px)     | Ciudad, Provincia y badge apilados verticalmente  |
| tablet (768–1024px) | Igual que mobile                                  |
| desktop (>1024px)   | Ciudad y Provincia en la misma fila, badge debajo |

### Accessibility

| Requirement          | Implementation                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA role            | `textbox` (input de texto nativo, mismo patrón ya usado por `OrganizationFormFields.tsx`)                                                                                       |
| Keyboard interaction | Tab recorre Ciudad → Provincia → botones en orden lógico                                                                                                                        |
| Label / aria-label   | Labels visibles "Ciudad" y "Provincia"; el badge "Heredado de organización" es texto real leído junto a ambos campos, no solo un color/ícono                                    |
| Contrast ratio       | WCAG AA — mismo estándar ya vigente en la plataforma                                                                                                                            |
| Screen reader        | Anuncia "Ciudad, Rosario, heredado de organización" / "Provincia, Santa Fe, heredado de organización" cuando `isInherited=true`; sin la mención de herencia cuando hay override |
| Focus management     | Al guardar exitosamente, el foco permanece en el campo activo; el badge se oculta/muestra sin robar el foco                                                                     |

### Usage Example

```
<ProductLocationFields
  city={product.locationCityOverride ?? organization.defaultLocationCity}
  state={product.locationStateOverride ?? organization.defaultLocationState}
  isInherited={!product.locationCityOverride && !product.locationStateOverride}
  onChange={setLocation}
  onSave={saveLocationOverride}
/>
```

## Assumptions & Open Questions

None.
