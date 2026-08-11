"use client";

/**
 * CategorySchemaEditor — superadmin-gated CRUD UI for category attribute_schema.
 *
 * Rows are draggable (via @dnd-kit/sortable) for visual ordering. Groups panel
 * lets admins define named sections; each field can be assigned to a group.
 * On save, sends PATCH /api/v1/categories/{id}/schema with both attribute_schema
 * and attribute_groups. If the backend rejects with migration_warnings (422),
 * shows a modal asking the user to confirm ?force=true to apply with data migration.
 *
 * `isReadOnly` hides add/delete/drag controls and renders inputs as text —
 * used for tenant admins who can see but not modify the schema.
 */

import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePatchCategorySchema } from "@/lib/api/products";
import {
  MigrationWarningResponseSchema,
  RenderAsSchema,
  type CategorySchemaResponse,
  type AttributeField,
  type AttributeGroup,
  type RenderAs,
} from "@/lib/api/schemas/categorySchema";

interface FieldRow extends AttributeField {
  key: string;
  _id: string; // local stable id for DnD
  render_as?: RenderAs;
  vin_decode_key?: string;
}

interface GroupRow extends AttributeGroup {
  _id: string; // local stable id
  fields?: string[];
}

interface CategorySchemaEditorProps {
  categoryId: string;
  schema: CategorySchemaResponse;
  isReadOnly?: boolean;
}

/**
 * JSONB object keys are not an ordering contract. Persist the order shown in
 * the editor with each group so product forms can render it deterministically.
 */
export function buildGroupsWithFieldOrder(
  groups: ReadonlyArray<
    Pick<AttributeGroup, "key" | "label" | "order" | "fields">
  >,
  rows: ReadonlyArray<Pick<FieldRow, "key" | "group">>,
): AttributeGroup[] {
  return groups
    .filter((group) => group.key.trim() && group.label.trim())
    .map((group) => {
      const key = group.key.trim();
      const legacyFields = (group.fields ?? []).filter((fieldKey) =>
        rows.some((row) => row.key.trim() === fieldKey && !row.group?.trim()),
      );
      const orderedFields = [
        ...rows
          .filter((row) => row.group?.trim() === key && row.key.trim())
          .map((row) => row.key.trim()),
        ...legacyFields,
      ];
      return {
        key,
        label: group.label,
        order: group.order,
        fields: [...new Set(orderedFields)],
      };
    });
}

const RENDER_AS_OPTIONS: readonly RenderAs[] = RenderAsSchema.options;

function SortableRow({
  row,
  groups,
  isReadOnly,
  isExpanded,
  isDuplicate,
  onUpdate,
  onDelete,
  onToggleExpand,
}: {
  row: FieldRow;
  groups: GroupRow[];
  isReadOnly: boolean;
  isExpanded: boolean;
  isDuplicate: boolean;
  onUpdate: (id: string, patch: Partial<FieldRow>) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: row._id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const colCount = isReadOnly ? 5 : 7; // drag + field + type + req + group + expand + delete

  return (
    <>
      <tr ref={setNodeRef} style={style} className="border-b">
        {!isReadOnly && (
          <td className="w-8 px-2 py-2">
            <button
              type="button"
              aria-label="Drag to reorder"
              className="cursor-grab text-muted-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </td>
        )}
        <td className="px-2 py-2">
          {isReadOnly ? (
            <span className="font-mono text-sm">{row.key}</span>
          ) : (
            <div className="relative">
              <Input
                placeholder="field name"
                value={row.key}
                onChange={(e) => onUpdate(row._id, { key: e.target.value })}
                className={`h-7 font-mono text-sm ${isDuplicate ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {isDuplicate && (
                <span className="absolute -bottom-4 left-0 text-xs text-destructive">
                  Duplicate key
                </span>
              )}
            </div>
          )}
        </td>
        <td className="px-2 py-2">
          {isReadOnly ? (
            <span className="text-sm capitalize">{row.type}</span>
          ) : (
            <Select
              value={row.type}
              onValueChange={(v) => {
                if (isFieldType(v)) onUpdate(row._id, { type: v });
              }}
            >
              <SelectTrigger className="h-7 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPE_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </td>
        <td className="px-2 py-2 text-center">
          <Checkbox
            checked={row.required}
            disabled={isReadOnly}
            onCheckedChange={(checked) =>
              onUpdate(row._id, { required: Boolean(checked) })
            }
            aria-label={`Required: ${row.key}`}
          />
        </td>
        <td className="px-2 py-2">
          {isReadOnly ? (
            <span className="text-sm text-muted-foreground">
              {groups.find((g) => g.key === row.group)?.label ?? "—"}
            </span>
          ) : (
            <Select
              value={row.group ?? "__none__"}
              onValueChange={(v) =>
                onUpdate(row._id, { group: v === "__none__" ? undefined : v })
              }
            >
              <SelectTrigger className="h-7 w-36">
                <SelectValue placeholder="No group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No group</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.key} value={g.key}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </td>
        <td className="w-8 px-2 py-2">
          <button
            type="button"
            onClick={() => onToggleExpand(row._id)}
            aria-label={isExpanded ? "Collapse details" : "Expand details"}
            className="text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        {!isReadOnly && (
          <td className="px-2 py-2">
            <button
              type="button"
              onClick={() => onDelete(row._id)}
              aria-label={`Delete ${row.key}`}
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </td>
        )}
      </tr>
      {/* Expandable details row */}
      {isExpanded && (
        <tr className="border-b bg-muted/20">
          <td colSpan={colCount} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {/* Label */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Label
                </label>
                {isReadOnly ? (
                  <p className="text-sm">{row.label || "—"}</p>
                ) : (
                  <Input
                    placeholder="Display label"
                    value={row.label ?? ""}
                    onChange={(e) =>
                      onUpdate(row._id, { label: e.target.value || undefined })
                    }
                    className="h-8"
                  />
                )}
              </div>
              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                {isReadOnly ? (
                  <p className="text-sm">{row.description || "—"}</p>
                ) : (
                  <Input
                    placeholder="Help text"
                    value={row.description ?? ""}
                    onChange={(e) =>
                      onUpdate(row._id, {
                        description: e.target.value || undefined,
                      })
                    }
                    className="h-8"
                  />
                )}
              </div>
              {/* Render As */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Render As
                </label>
                {isReadOnly ? (
                  <p className="text-sm">{row.render_as || "auto"}</p>
                ) : (
                  <Select
                    value={row.render_as ?? "__auto__"}
                    onValueChange={(v) =>
                      onUpdate(row._id, {
                        render_as:
                          v === "__auto__" ? undefined : (v as RenderAs),
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto__">Auto</SelectItem>
                      {RENDER_AS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {/* VIN Decode Key — only when render_as = vin_decode */}
              {row.render_as === "vin_decode" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    VIN Decode Key
                  </label>
                  {isReadOnly ? (
                    <p className="text-sm font-mono">
                      {row.vin_decode_key || "—"}
                    </p>
                  ) : (
                    <Input
                      placeholder="e.g. Make, Model, Year"
                      value={row.vin_decode_key ?? ""}
                      onChange={(e) =>
                        onUpdate(row._id, {
                          vin_decode_key: e.target.value || undefined,
                        })
                      }
                      className="h-8 font-mono"
                    />
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `field-${Date.now()}-${Math.random()}`;

const FIELD_TYPES = {
  string: "string",
  number: "number",
  boolean: "boolean",
  array: "array",
  object: "object",
} as const;
type FieldType = keyof typeof FIELD_TYPES;
const FIELD_TYPE_ORDER: readonly FieldType[] = [
  "string",
  "number",
  "boolean",
  "array",
  "object",
];
function isFieldType(v: string): v is FieldType {
  return Object.prototype.hasOwnProperty.call(FIELD_TYPES, v);
}

function SortableGroupRow({
  group,
  isReadOnly,
  onUpdate,
  onDelete,
}: {
  group: GroupRow;
  isReadOnly: boolean;
  onUpdate: (id: string, patch: Partial<GroupRow>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: group._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isReadOnly) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-2">
        <span className="text-sm">{group.label}</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2"
      data-sortable-group-id={group._id}
    >
      <button
        type="button"
        aria-label="Reorder attribute group"
        className="cursor-grab text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        placeholder="group key"
        value={group.key}
        onChange={(e) => onUpdate(group._id, { key: e.target.value })}
        className="h-7 w-28 font-mono text-xs"
      />
      <Input
        placeholder="group label"
        value={group.label}
        onChange={(e) => onUpdate(group._id, { label: e.target.value })}
        className="h-7 flex-1 text-sm"
      />
      <button
        type="button"
        onClick={() => onDelete(group._id)}
        aria-label={`Delete group ${group.label || group.key}`}
        className="text-destructive hover:text-destructive/80"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function CategorySchemaEditor({
  categoryId,
  schema,
  isReadOnly = false,
}: CategorySchemaEditorProps) {
  const [rows, setRows] = useState<FieldRow[]>(() =>
    Object.entries(schema.attributes).map(([key, def]) => ({
      _id: newId(),
      key,
      ...def,
    })),
  );

  const [groups, setGroups] = useState<GroupRow[]>(() =>
    (schema.attribute_groups ?? []).map((g) => ({ ...g, _id: newId() })),
  );

  const [migrationWarnings, setMigrationWarnings] = useState<string[]>([]);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [pendingGroupDeletion, setPendingGroupDeletion] = useState<{
    _id: string;
    key: string;
    label: string;
    fieldCount: number;
  } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // ponytail: detect duplicate keys for validation
  const duplicateKeys = useMemo(() => {
    const seen = new Map<string, number>();
    for (const row of rows) {
      const k = row.key.trim().toLowerCase();
      if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    return new Set(
      [...seen.entries()].filter(([, c]) => c > 1).map(([k]) => k),
    );
  }, [rows]);

  const hasValidationErrors = useMemo(() => {
    return duplicateKeys.size > 0 || rows.some((r) => !r.key.trim());
  }, [duplicateKeys, rows]);

  // ponytail: group fields by their group key for visual sectioning
  const fieldsByGroup = useMemo(() => {
    const UNGROUPED = "__ungrouped__";
    const grouped: Record<string, FieldRow[]> = { [UNGROUPED]: [] };
    for (const g of groups) {
      if (g.key.trim()) grouped[g.key.trim()] = [];
    }
    const query = searchQuery.trim().toLowerCase();
    for (const row of rows) {
      // Filter by search query if present
      if (query) {
        const matchesKey = row.key.toLowerCase().includes(query);
        const matchesLabel = row.label?.toLowerCase().includes(query);
        if (!matchesKey && !matchesLabel) continue;
      }
      const key = row.group?.trim() || UNGROUPED;
      (grouped[key] ??= grouped[UNGROUPED]).push(row);
    }
    return grouped;
  }, [rows, groups, searchQuery]);

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const patchSchema = usePatchCategorySchema();
  const sensors = useSensors(useSensor(PointerSensor));

  const toSchemaMap = (
    fields: FieldRow[],
    validGroupKeys: ReadonlySet<string>,
  ): Record<string, AttributeField> =>
    Object.fromEntries(
      fields
        .filter((r) => r.key.trim())
        .map(
          ({
            key,
            type,
            required,
            label,
            description,
            group,
            render_as,
            vin_decode_key,
          }) => {
            const trimmedKey = key.trim();
            const normalizedGroup =
              group && validGroupKeys.has(group) ? group : undefined;
            return [
              trimmedKey,
              {
                type,
                required,
                label,
                description,
                group: normalizedGroup,
                render_as,
                vin_decode_key,
              },
            ];
          },
        ),
    );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Check if dragging a field
    const activeRow = rows.find((r) => r._id === active.id);
    const overRow = rows.find((r) => r._id === over.id);

    if (activeRow && overRow) {
      const activeGroup = activeRow.group?.trim() || "__ungrouped__";
      const overGroup = overRow.group?.trim() || "__ungrouped__";
      if (activeGroup !== overGroup) return;

      setIsDirty(true);
      setRows((prev) => {
        // Find indices within the SAME group's section for proper ordering
        const groupRows = prev.filter(
          (r) => (r.group?.trim() || "__ungrouped__") === overGroup,
        );
        const overIndexInGroup = groupRows.findIndex((r) => r._id === over.id);

        // Remove active from its position
        const withoutActive = prev.filter((r) => r._id !== active.id);

        // Find insertion point: right after the 'over' item in the full array
        const overIndexInFull = withoutActive.findIndex(
          (r) => r._id === over.id,
        );

        // Insert at the position after 'over'
        return [
          ...withoutActive.slice(0, overIndexInFull + 1),
          activeRow,
          ...withoutActive.slice(overIndexInFull + 1),
        ];
      });
      return;
    }

    // Dragging groups
    setGroups((prev) => {
      if (
        prev.some((g) => g._id === active.id) &&
        prev.some((g) => g._id === over.id)
      ) {
        const oldIndex = prev.findIndex((g) => g._id === active.id);
        const newIndex = prev.findIndex((g) => g._id === over.id);
        setIsDirty(true);
        return arrayMove(prev, oldIndex, newIndex).map((g, index) => ({
          ...g,
          order: index,
        }));
      }
      return prev;
    });
  };

  const handleAdd = () => {
    setIsDirty(true);
    setRows((prev) => [
      ...prev,
      { _id: newId(), key: "", type: "string", required: false },
    ]);
  };

  const handleUpdate = (id: string, patch: Partial<FieldRow>) => {
    setIsDirty(true);
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  };

  const handleDelete = (id: string) => {
    setIsDirty(true);
    setRows((prev) => prev.filter((r) => r._id !== id));
  };

  const handleAddGroup = () => {
    setIsDirty(true);
    setGroups((prev) => [
      ...prev,
      { _id: newId(), key: "", label: "", order: prev.length },
    ]);
  };

  const handleUpdateGroup = (id: string, patch: Partial<GroupRow>) => {
    setIsDirty(true);
    setGroups((prev) =>
      prev.map((g) => (g._id === id ? { ...g, ...patch } : g)),
    );
  };

  const handleDeleteGroup = (id: string) => {
    const group = groups.find((g) => g._id === id);
    if (!group) return;
    const trimmedKey = group.key.trim();
    const fieldCount = trimmedKey
      ? rows.filter((row) => row.group === trimmedKey).length
      : 0;
    setPendingGroupDeletion({
      _id: id,
      key: trimmedKey,
      label: group.label || trimmedKey || "this group",
      fieldCount,
    });
  };

  const confirmDeleteGroup = () => {
    if (!pendingGroupDeletion) return;
    setIsDirty(true);
    setGroups((prev) => prev.filter((g) => g._id !== pendingGroupDeletion._id));
    setPendingGroupDeletion(null);
  };

  const handleSave = async (force = false) => {
    const groupKeySet = new Set(
      groups.map((g) => g.key.trim()).filter((key) => key.length > 0),
    );
    const schemaMap = toSchemaMap(rows, groupKeySet);
    const groupList = buildGroupsWithFieldOrder(groups, rows);
    const removedGroups = groupList.filter(
      (g) =>
        !groupKeySet.has(g.key) ||
        !groups.some((local) => local.key.trim() === g.key && local._id !== ""),
    );
    const orphanedFieldCount = Array.from(rows).filter(
      (row) =>
        row.group &&
        row.group.trim().length > 0 &&
        !groupKeySet.has(row.group.trim()),
    ).length;
    try {
      const updated = await patchSchema.mutateAsync({
        categoryId,
        schema: schemaMap,
        groups: groupList,
        force: force || undefined,
        orphanedFieldCount,
        removedGroupLabel:
          removedGroups.length > 0 ? removedGroups[0].label : null,
      });
      const updatedGroupMap = new Map(
        (updated.attribute_groups ?? []).map((g) => {
          const merged: GroupRow = {
            _id: newId(),
            key: g.key.trim(),
            label: g.label,
            order: g.order ?? 0,
            ...(g.fields ? { fields: [...g.fields] } : {}),
          };
          return [merged.key, merged];
        }),
      );
      setGroups((prev) =>
        prev
          .filter((g) => updatedGroupMap.has(g.key.trim()))
          .map((g) => {
            const fresh = updatedGroupMap.get(g.key.trim());
            return fresh ? { ...g, ...fresh } : g;
          }),
      );
      setRows((prev) =>
        prev.map((r) => {
          if (!r.group) return r;
          return updatedGroupMap.has(r.group.trim())
            ? r
            : { ...r, group: undefined };
        }),
      );
      setMigrationWarnings([]);
      setShowMigrationModal(false);
      setIsDirty(false);
    } catch (err) {
      if (err instanceof Error) {
        try {
          const json = JSON.parse(err.message);
          const result = MigrationWarningResponseSchema.safeParse(json);
          if (result.success && result.data.migration_warnings.length > 0) {
            setMigrationWarnings(result.data.migration_warnings);
            setShowMigrationModal(true);
            return;
          }
        } catch {
          // Not a JSON migration warning — surface normally
        }
      }
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      {/* Groups panel */}
      <div className="rounded border p-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Grupos del formulario</span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              El orden de los grupos define las secciones del formulario de
              producto.
            </p>
          </div>
          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddGroup}
              aria-label="Add group"
            >
              <Plus className="mr-1 h-3 w-3" />
              Add group
            </Button>
          )}
        </div>
        {groups.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No groups defined. Add one to organize fields into sections.
          </p>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={groups.map((g) => g._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {groups.map((g) => (
                <SortableGroupRow
                  key={g._id}
                  group={g}
                  isReadOnly={isReadOnly}
                  onUpdate={handleUpdateGroup}
                  onDelete={handleDeleteGroup}
                />
              ))}
            </div>

            {/* Confirm group deletion */}
            <AlertDialog
              open={pendingGroupDeletion !== null}
              onOpenChange={(open) => !open && setPendingGroupDeletion(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete attribute group</AlertDialogTitle>
                  <AlertDialogDescription>
                    {pendingGroupDeletion?.fieldCount ? (
                      <>
                        The group <strong>{pendingGroupDeletion.label}</strong>{" "}
                        has {pendingGroupDeletion.fieldCount} field
                        {pendingGroupDeletion.fieldCount === 1 ? "" : "s"}{" "}
                        assigned. On save those fields will be reassigned to{" "}
                        <strong>No group</strong>. You can pick another group
                        for them from the Group column before saving.
                      </>
                    ) : (
                      <>
                        Delete the group{" "}
                        <strong>{pendingGroupDeletion?.label}</strong>? This
                        will not affect any field.
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => setPendingGroupDeletion(null)}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeleteGroup}>
                    Delete group
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SortableContext>
        </DndContext>
      </div>

      {/* Search filter */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search fields by key or label..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 max-w-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Fields by group */}
      <div className="rounded border border-dashed px-3 py-2 text-xs text-muted-foreground">
        Arrastrá campos para ordenar dentro de su grupo. Para mover un campo a
        otro grupo, usá el selector de grupo en su fila.
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-2">
          {[
            ...groups.filter((g) => g.key.trim()),
            {
              _id: "__ungrouped__",
              key: "__ungrouped__",
              label: "Sin grupo",
              order: 999,
            },
          ].map((group) => {
            const groupKey = group.key.trim() || "__ungrouped__";
            const groupFields = fieldsByGroup[groupKey] ?? [];
            const isCollapsed = collapsedGroups.has(groupKey);

            return (
              <div key={group._id} className="rounded border">
                {/* Group header — use div to allow nested buttons */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleGroupCollapse(groupKey)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleGroupCollapse(groupKey);
                    }
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 bg-muted/50 px-3 py-2 text-left text-sm font-medium hover:bg-muted/70"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span>{group.label || group.key}</span>
                  <span className="text-muted-foreground">
                    ({groupFields.length} campo
                    {groupFields.length !== 1 ? "s" : ""})
                  </span>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDirty(true);
                        setRows((prev) => [
                          ...prev,
                          {
                            _id: newId(),
                            key: "",
                            type: "string",
                            required: false,
                            group:
                              groupKey === "__ungrouped__"
                                ? undefined
                                : groupKey,
                          },
                        ]);
                      }}
                      aria-label={`Add field to ${group.label || group.key}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Group fields */}
                {!isCollapsed && groupFields.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>
                        {!isReadOnly && <th className="w-8" />}
                        <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">
                          Field
                        </th>
                        <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">
                          Type
                        </th>
                        <th className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
                          Req
                        </th>
                        <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">
                          Group
                        </th>
                        <th className="w-8" />
                        {!isReadOnly && <th className="w-8" />}
                      </tr>
                    </thead>
                    <tbody>
                      <SortableContext
                        items={groupFields.map((r) => r._id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {groupFields.map((row) => (
                          <SortableRow
                            key={row._id}
                            row={row}
                            groups={groups}
                            isReadOnly={isReadOnly}
                            isExpanded={expandedRows.has(row._id)}
                            isDuplicate={duplicateKeys.has(
                              row.key.trim().toLowerCase(),
                            )}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onToggleExpand={toggleRowExpand}
                          />
                        ))}
                      </SortableContext>
                    </tbody>
                  </table>
                )}

                {/* Empty state */}
                {!isCollapsed && groupFields.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    No fields in this group
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </DndContext>

      {!isReadOnly && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={patchSchema.isPending || hasValidationErrors}
            aria-label="Save schema"
          >
            {patchSchema.isPending ? "Saving…" : "Save"}
          </Button>
          <span className="text-sm text-muted-foreground" role="status">
            {isDirty ? "Cambios sin guardar" : "Todos los cambios guardados"}
          </span>
          {hasValidationErrors && (
            <span className="text-sm text-destructive">
              Fix duplicate or empty keys before saving
            </span>
          )}
        </div>
      )}

      {/* Migration warning modal */}
      <Dialog
        open={showMigrationModal}
        onOpenChange={(v) => !v && setShowMigrationModal(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schema migration required</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The following changes require migrating existing product data:
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {migrationWarnings.map((w, i) => (
              <li key={i} className="text-amber-700 dark:text-amber-400">
                • {w}
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMigrationModal(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleSave(true)}>
              Apply with migration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
