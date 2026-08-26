# Spec — Drag para reordenar grupos (panel Attribute Groups)

## Contexto

`CategoryAdminClient` ya permite editar el `attribute_schema` y los `attribute_groups` de una categoría con un editor drag-and-drop (`apps/web/src/components/admin/category-schema-editor.tsx`). El editor actual reordena **filas** dentro de la tabla, pero **no permite**:

1. Reordenar el orden de los `attribute_groups` (sections que se renderizan como `<details>` en `SchemaFormSection.tsx`).
2. Reordenar los campos **dentro** de cada grupo.

Esto obliga a editar el JSON a mano o a confiar en el orden de keys del `attribute_schema` (que es indefinido en JSON). El form de producto (`UnifiedProductForm.tsx`) renderiza los grupos en el orden que devuelve `category.attribute_groups` y los agrupa por `entry.group`, así que cualquier reorden ya se reflejaría automáticamente.

## Estado actual

### Backend (ya existe, no se toca)

- `PATCH /api/v1/categories/{id}/schema` acepta `{attribute_schema, attribute_groups}` y devuelve `migration_warnings` cuando un cambio rompe productos existentes.
- Endpoint ya testeado en `apps/api/tests/unit/components/admin/CategorySchemaEditor.test.tsx` (lado cliente vía mock).
- Aplica permisos de superadmin (`Permission.ORG_ADMIN_VIEW_ALL` o el equivalente en código).

### Frontend

- `apps/web/src/components/admin/category-schema-editor.tsx` (extender, no romper).
- `@dnd-kit/sortable` ya está en uso (mismo archivo).
- Estilos: Tailwind 4, sin `var()` en `className` (regla GGA).
- Resolutor de atributos: `apps/web/src/components/forms/schema/SchemaFieldRenderer.tsx` usa `entry.options` (no `group_order`).

## Historia

> Como superadmin, quiero reordenar los grupos del schema de una categoría con drag-and-drop en el panel Attribute Groups, para controlar el orden visual de las secciones del formulario sin tocar código.

## Alcance (MVP, reducido)

1. **Drag en panel Attribute Groups** (hoy los grupos se reordenan solo cambiando el input `order` manualmente): drag vertical de cada fila de grupo para fijar el orden; la posición se persiste en `attribute_groups[*].order` (o en el orden del array) y se refleja en el PATCH.
2. (Sigue funcionando) **Reordenar campos dentro del schema**: el editor ya permite drag de filas (inputs/selects/checkboxes) y persiste en el orden de keys.
3. (Sigue funcionando) **Alertas de migración**: cuando el backend devuelve 422 con `migration_warnings`, el modal sigue apareciendo.
4. (Sigue funcionando) **Permisos**: el guard existente bloquea usuarios sin permiso.

Fuera de alcance (lo dejamos para otro PR):

- Vista agrupada/secciones collapsibles en la tabla (más invasivo: refactor de <table> a <details>).
- Editar visualmente `options` de cada `select`.
- Multi-categoría batch.

## Diseño TDD-first

### Tests primero (en este orden; cada uno debe fallar antes del fix)

#### Cliente (`apps/web/tests/unit/components/admin/CategorySchemaEditor.test.tsx`, extender)

Los tests existentes mockean `DndContext`/`SortableContext`/`useSortable` de dnd-kit core/sortable para tests no-visuales. Vamos a usar el mismo patrón.

- **A1 — Drag de grupos persiste**: cuando el admin reordena el panel "Attribute Groups" vía drag (simulando el evento de dnd-kit con `arrayMove` sobre los `_id` de los grupos), y luego aprieta Save, el `mutateAsync` recibe `groups` con el array en el nuevo orden.
- **A2 — Cada grupo del panel es draggable**: el botón grip (drag handle) aparece al lado de cada fila de grupo (no solo en campos) cuando `isReadOnly=false`.
- **A3 — Cancel del modal de migration NO llama al PATCH con force**: reusar cobertura existente; debe seguir verde.

#### Backend (`apps/api/tests/integration/api/test_category_schema_endpoint.py`, extender)

- **API1 — PATCH reordena groups**: el backend persiste el orden de `attribute_groups` y al hacer `GET` lo devuelve igual al enviado.
- **API2 — (sigue igual)**: `PATCH` con `attribute_schema` reordena keys y el `GET` las devuelve en el mismo orden.

### Contrato API (sin cambios de wire shape)

El backend ya guarda el array de `attribute_groups`. La **garantía nueva** a documentar: el orden de elementos es significativo y se preserva en round-trip.

### Componentes a modificar (sin nuevos)

```
apps/web/src/components/admin/category-schema-editor.tsx
  - Reutilizar el mismo patrón de <SortableContext> + <SortableRow> que ya usa la tabla
  - Hacer un <SortableGroupRow> con grip + sortable listeners
  - Envolver el bloque del panel "Attribute Groups" con <DndContext> y <SortableContext>
  - handleDragEnd para groups reordena setGroups con arrayMove
  - handleSave ya pasa groups[]; el orden lo dicta el state
apps/api/tests/integration/api/test_category_schema_endpoint.py
  - Añadir test API1
```

### Contrato API (sin cambios)

```
PATCH /api/v1/categories/{id}/schema
Body: { attribute_schema: Record<string, AttributeSchemaEntry>,
        attribute_groups: AttributeGroup[] }
200 OK → { category: CategoryNode, warnings?: [] }
422 → { detail: "schema_change_breaks_products", warnings: [{product_id, field, ...}] }
```

Garantía nueva a documentar en el contrato:

- El **orden de keys** en `attribute_schema` y el **orden de elementos** en `attribute_groups` son significativos.
- El backend los guarda en ese orden y los devuelve idénticos al leer.

### Componentes a crear / modificar

```
apps/web/src/components/admin/
  category-schema-editor.tsx       ← MOD: panel de grupos + drag en filas
  reorderable-group-list.tsx       ← NEW: lista draggable de grupos
  reorderable-field-list.tsx       ← NEW: rows arrastrables dentro de un grupo
apps/api/src/prosell/application/dto/category/
  schema.py                       ← MOD: anotar orden de keys (OrderedDict / list)
apps/api/tests/integration/api/
  test_category_schema_endpoint.py ← EXTENDER con API1/API2/API3
```

### Comportamiento de UI (mobile-first)

- Drag handle visible solo en hover/focus en desktop; siempre visible en mobile.
- Cambios se persisten al soltar (`onDragEnd`), no al armar (`onDragStart`).
- Feedback visual: ring de 2px en el ítem activo (estilo shadcn/ui `Ring` via `outline`).
- Sin re-build de la página: solo el componente del editor se rerenderiza.

## Riesgos y mitigaciones

| Riesgo                                         | Mitigación                                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Reordenar rompe reglas de validación de Zod    | Tests API1/API2/API3 con productos reales en setUp                                        |
| Mobile drag-and-drop no responde en iOS Safari | `@dnd-kit/sortable` ya validado en otros lugares; usar `PointerSensor` (no `MouseSensor`) |
| Cambios masivos disparan muchas requests PATCH | Debounce 500ms antes de enviar; un solo PATCH con el delta final                          |
| Canciones de orden crean duplicados visuales   | Usar `key={group.key}` (estable) en lugar de índice                                       |

## Métricas de éxito

- El editor cumple los 6 tests de UI sin flakear.
- El backend cumple los 3 tests de API.
- Suite `apps/web` pasa al 100% (137 archivos o el conteo actual +1).
- Suite `apps/api` pasa sin nuevos warnings.
- GGA, pyright, ESLint, Ruff: verdes.
- Smoke test manual en staging: reordenar grupos en una categoría real, abrir el form de producto, verificar que el orden coincide.

## Orden de implementación

1. Spec review (este doc) ✅.
2. Tests rojos (`pnpm test --watch` para `category-schema-editor.test.tsx`, `pytest test_category_schema_endpoint.py`).
3. Implementar `reorderable-group-list` y `reorderable-field-list`.
4. Hookear a `category-schema-editor.tsx`.
5. Backend: anotaciones de orden en DTO si hace falta.
6. Tests verdes.
7. Typecheck, lint, GGA, pre-commit.
8. Commit con conventional commit: `feat(admin): reorder groups and fields in category schema editor`.
9. PR + CI verde.
10. Deploy a staging, después a prod (vía `promote-prod.yml` con `confirm=deploy`).
