"use client";

/**
 * CategorySchemaEditor — superadmin-gated CRUD UI for category attribute_schema.
 *
 * Rows are draggable (via @dnd-kit/sortable) for visual ordering. On save,
 * sends PATCH /api/v1/categories/{id}/schema. If the backend rejects with
 * migration_warnings (422), shows a modal asking the user to confirm
 * ?force=true to apply with data migration.
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
} from "@/lib/api/schemas/categorySchema";

interface FieldRow extends AttributeField {
  key: string;
  _id: string; // local stable id for DnD
}

interface CategorySchemaEditorProps {
  categoryId: string;
  schema: CategorySchemaResponse;
  isReadOnly?: boolean;
}

function SortableRow({
  row,
  isReadOnly,
  onUpdate,
  onDelete,
}: {
  row: FieldRow;
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

  const [migrationWarnings, setMigrationWarnings] = useState<string[]>([]);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  const patchSchema = usePatchCategorySchema();
  const sensors = useSensors(useSensor(PointerSensor));

  const toSchemaMap = (fields: FieldRow[]): Record<string, AttributeField> =>
    Object.fromEntries(
      fields
        .filter((r) => r.key.trim())
        .map(({ key, type, required, label, description }) => [
          key.trim(),
          { type, required, label, description },
        ]),
    );

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

  const handleSave = async (force = false) => {
    const schemaMap = toSchemaMap(rows);
    try {
      await patchSchema.mutateAsync({
        categoryId,
        schema: schemaMap,
        force: force || undefined,
      });
      setMigrationWarnings([]);
      setShowMigrationModal(false);
    } catch (err) {
      if (err instanceof Error) {
        // The hook throws an Error whose .message is the JSON-stringified 422 body.
        // Validate it via Zod to guard against backend shape drift.
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
    <div className="space-y-4">
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
