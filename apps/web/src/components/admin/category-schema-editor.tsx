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

import { useState } from "react";
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
import { GripVertical, Trash2, Plus } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePatchCategorySchema } from "@/lib/api/products";
import {
  MigrationWarningResponseSchema,
  type CategorySchemaResponse,
  type AttributeField,
  type AttributeGroup,
} from "@/lib/api/schemas/categorySchema";

interface FieldRow extends AttributeField {
  key: string;
  _id: string; // local stable id for DnD
}

interface GroupRow extends AttributeGroup {
  _id: string; // local stable id
}

interface CategorySchemaEditorProps {
  categoryId: string;
  schema: CategorySchemaResponse;
  isReadOnly?: boolean;
}

function SortableRow({
  row,
  groups,
  isReadOnly,
  onUpdate,
  onDelete,
}: {
  row: FieldRow;
  groups: GroupRow[];
  isReadOnly: boolean;
  onUpdate: (id: string, patch: Partial<FieldRow>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: row._id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
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
          <Input
            placeholder="field name"
            value={row.key}
            onChange={(e) => onUpdate(row._id, { key: e.target.value })}
            className="h-7 font-mono text-sm"
          />
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
              {FIELD_TYPES.map((t) => (
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
  );
}

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `field-${Date.now()}-${Math.random()}`;

const FIELD_TYPES = ["string", "number", "boolean", "array", "object"] as const;
type FieldType = (typeof FIELD_TYPES)[number];
const isFieldType = (v: string): v is FieldType =>
  (FIELD_TYPES as readonly string[]).includes(v);

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

  const patchSchema = usePatchCategorySchema();
  const sensors = useSensors(useSensor(PointerSensor));

  const toSchemaMap = (fields: FieldRow[]): Record<string, AttributeField> =>
    Object.fromEntries(
      fields
        .filter((r) => r.key.trim())
        .map(({ key, type, required, label, description, group }) => [
          key.trim(),
          { type, required, label, description, group },
        ]),
    );

  const toGroupList = (gs: GroupRow[]): AttributeGroup[] =>
    gs
      .filter((g) => g.key.trim() && g.label.trim())
      .map(({ key, label, order }) => ({ key: key.trim(), label, order }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRows((prev) => {
        const oldIndex = prev.findIndex((r) => r._id === active.id);
        const newIndex = prev.findIndex((r) => r._id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleAdd = () => {
    setRows((prev) => [
      ...prev,
      { _id: newId(), key: "", type: "string", required: false },
    ]);
  };

  const handleUpdate = (id: string, patch: Partial<FieldRow>) => {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  };

  const handleDelete = (id: string) => {
    setRows((prev) => prev.filter((r) => r._id !== id));
  };

  const handleAddGroup = () => {
    setGroups((prev) => [
      ...prev,
      { _id: newId(), key: "", label: "", order: prev.length },
    ]);
  };

  const handleUpdateGroup = (id: string, patch: Partial<GroupRow>) => {
    setGroups((prev) =>
      prev.map((g) => (g._id === id ? { ...g, ...patch } : g)),
    );
  };

  const handleDeleteGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g._id !== id));
  };

  const handleSave = async (force = false) => {
    const schemaMap = toSchemaMap(rows);
    const groupList = toGroupList(groups);
    try {
      await patchSchema.mutateAsync({
        categoryId,
        schema: schemaMap,
        groups: groupList,
        force: force || undefined,
      });
      setMigrationWarnings([]);
      setShowMigrationModal(false);
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
          <span className="text-sm font-medium">Attribute Groups</span>
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
        <div className="space-y-1">
          {groups.map((g) => (
            <div key={g._id} className="flex items-center gap-2">
              {isReadOnly ? (
                <span className="text-sm">{g.label}</span>
              ) : (
                <>
                  <Input
                    placeholder="group key"
                    value={g.key}
                    onChange={(e) =>
                      handleUpdateGroup(g._id, { key: e.target.value })
                    }
                    className="h-7 w-28 font-mono text-xs"
                  />
                  <Input
                    placeholder="group label"
                    value={g.label}
                    onChange={(e) =>
                      handleUpdateGroup(g._id, { label: e.target.value })
                    }
                    className="h-7 flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(g._id)}
                    aria-label={`Delete group ${g.label || g.key}`}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fields table */}
      <div className="rounded border">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {!isReadOnly && <th className="w-8" />}
                <th className="px-2 py-2 text-left font-medium">Field name</th>
                <th className="px-2 py-2 text-left font-medium">Type</th>
                <th className="px-2 py-2 text-center font-medium">Required</th>
                <th className="px-2 py-2 text-left font-medium">Group</th>
                {!isReadOnly && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              <SortableContext
                items={rows.map((r) => r._id)}
                strategy={verticalListSortingStrategy}
              >
                {rows.map((row) => (
                  <SortableRow
                    key={row._id}
                    row={row}
                    groups={groups}
                    isReadOnly={isReadOnly}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>

      {!isReadOnly && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            aria-label="Add field"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add field
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={patchSchema.isPending}
            aria-label="Save schema"
          >
            {patchSchema.isPending ? "Saving…" : "Save"}
          </Button>
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
