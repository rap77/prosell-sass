# Category Schema Editor Improvements

**Status**: IMPLEMENTED
**Created**: 2026-08-06
**Engram topic_key**: `plan/category-schema-editor-v2`

## Goal

Mejorar el editor de schema de categorías (`CategorySchemaEditor`) para que admins puedan gestionar campos y grupos más efectivamente.

## Current State

El editor ya tiene:

- ✅ Drag & drop para reordenar grupos
- ✅ Drag & drop para reordenar campos (global)
- ✅ Selector de grupo por campo
- ✅ CRUD de campos y grupos
- ✅ Migration warnings modal

## Gaps Identified

| #   | Gap                                                   | Impacto | Esfuerzo |
| --- | ----------------------------------------------------- | ------- | -------- |
| 1   | Sin ordenamiento de campos POR grupo — drag es global | Alto    | Medio    |
| 2   | Campos no agrupados visualmente — todo mezclado       | Medio   | Medio    |
| 3   | Falta `label`/`description` de campos                 | Medio   | Bajo     |
| 4   | Sin `render_as` ni `vin_decode_key`                   | Medio   | Bajo     |
| 5   | Sin validación de keys duplicados                     | Bajo    | Bajo     |

---

## Phase 1: Visual Grouping (Priority: HIGH)

**Objetivo**: Mostrar campos agrupados visualmente con headers colapsables.

### Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Attribute Groups                              [+ Add group] │
├─────────────────────────────────────────────────────────────┤
│ ⠿ [basic_info] [Información Básica]                    🗑️  │
│ ⠿ [motor    ] [Motor y Transmisión]                    🗑️  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ▼ Información Básica (3 campos)                 [+ Add]    │
├─────────────────────────────────────────────────────────────┤
│ ⠿ │ vin   │ string │ ☑ Required │                     🗑️  │
│ ⠿ │ make  │ string │ ☑ Required │                     🗑️  │
│ ⠿ │ model │ string │ ☐          │                     🗑️  │
├─────────────────────────────────────────────────────────────┤
│ ▼ Motor (2 campos)                              [+ Add]    │
├─────────────────────────────────────────────────────────────┤
│ ⠿ │ engine_cc │ number │ ☐ │                          🗑️  │
│ ⠿ │ fuel_type │ string │ ☐ │                          🗑️  │
├─────────────────────────────────────────────────────────────┤
│ ▼ Sin grupo (1 campo)                           [+ Add]    │
├─────────────────────────────────────────────────────────────┤
│ ⠿ │ notes │ string │ ☐ │                              🗑️  │
└─────────────────────────────────────────────────────────────┘
[Save]
```

### Changes

1. **Refactor rendering**: Agrupar `rows` por `group` antes de renderizar
2. **Collapsible sections**: Cada grupo es una sección colapsable
3. **Multi-SortableContext**: Un contexto por grupo para drag intra-grupo
4. **Cross-group drag**: Detectar cuando campo se suelta en otro grupo header

### Files to Modify

- `apps/web/src/components/admin/category-schema-editor.tsx`

### Acceptance Criteria

- [x] Campos aparecen bajo su grupo con header colapsable
- [x] Drag & drop reordena campos dentro del grupo
- [x] Campos sin grupo aparecen en sección "Sin grupo"
- [x] Arrastrar campo sobre otro de diferente grupo lo mueve a ese grupo (cross-group drag)
- [x] El orden persiste correctamente al guardar

### Technical Approach

```tsx
// Agrupar campos por grupo
const fieldsByGroup = useMemo(() => {
  const grouped: Record<string, FieldRow[]> = { _ungrouped: [] };
  for (const group of groups) {
    grouped[group.key] = [];
  }
  for (const row of rows) {
    const key = row.group ?? '_ungrouped';
    (grouped[key] ??= []).push(row);
  }
  return grouped;
}, [rows, groups]);

// Renderizar por grupo
{[...groups, { key: '_ungrouped', label: 'Sin grupo' }].map(group => (
  <Collapsible key={group.key}>
    <CollapsibleTrigger>{group.label} ({fieldsByGroup[group.key]?.length ?? 0})</CollapsibleTrigger>
    <CollapsibleContent>
      <SortableContext items={fieldsByGroup[group.key]?.map(r => r._id) ?? []}>
        {fieldsByGroup[group.key]?.map(row => <SortableRow ... />)}
      </SortableContext>
    </CollapsibleContent>
  </Collapsible>
))}
```

---

## Phase 2: Field Metadata (Priority: MEDIUM)

**Objetivo**: Permitir editar `label`, `description`, `render_as`, `vin_decode_key`.

### Changes

1. **Expandable row**: Click en campo expande fila con inputs adicionales
2. **New inputs**: label (text), description (textarea), render_as (select), vin_decode_key (text)
3. **Conditional fields**: `vin_decode_key` solo visible cuando `render_as = "vin_decode"`

### render_as Options

| Value        | Description                         |
| ------------ | ----------------------------------- |
| `text`       | Input de texto normal (default)     |
| `textarea`   | Textarea para texto largo           |
| `select`     | Dropdown (requiere `options` array) |
| `number`     | Input numérico                      |
| `checkbox`   | Checkbox boolean                    |
| `vin_decode` | Campo VIN con botón decode          |
| `date`       | Date picker                         |

### Files to Modify

- `apps/web/src/components/admin/category-schema-editor.tsx`
- `apps/web/src/lib/api/schemas/categorySchema.ts` (agregar render_as enum si falta)

### Acceptance Criteria

- [x] Click en fila expande sección con inputs adicionales
- [x] label y description editables
- [x] render_as es select con opciones válidas
- [x] vin_decode_key visible solo para render_as = vin_decode
- [ ] Valores persisten al guardar (requires backend support)

---

## Phase 3: Validation & UX (Priority: LOW)

**Objetivo**: Prevenir errores y mejorar UX.

### Changes

1. **Duplicate key validation**: Error inline si key duplicado
2. **Empty key validation**: No guardar con keys vacíos
3. **Search/filter**: Input para filtrar campos por key/label
4. **Error highlight**: Campos con error tienen borde rojo

### Acceptance Criteria

- [x] Keys duplicados muestran error visual inmediato
- [x] Botón Save deshabilitado si hay errores
- [x] Input de búsqueda filtra campos en tiempo real

---

## Execution Order

1. **Phase 1** — Visual grouping (high impact, foundational)
2. **Phase 2** — Field metadata (builds on Phase 1 UI)
3. **Phase 3** — Validation (polish)

## How to Resume

```bash
# Search engram for the plan
mem_search("category schema editor plan")

# Or read this file
cat docs/plans/category-schema-editor-improvements.md
```

## Related Files

| File                                                                 | Purpose               |
| -------------------------------------------------------------------- | --------------------- |
| `apps/web/src/components/admin/category-schema-editor.tsx`           | Main editor component |
| `apps/api/src/prosell/infrastructure/api/routers/category_router.py` | PATCH endpoint        |
| `apps/web/src/lib/api/schemas/categorySchema.ts`                     | Zod schemas           |
| `apps/web/tests/unit/components/admin/CategorySchemaEditor.test.tsx` | Tests                 |
