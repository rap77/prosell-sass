"use client";

/**
 * SchemaAdminClient — client island for /admin/categories/[id]/schema.
 *
 * Composes the CategorySchemaEditor (T6) with platform-role gating via
 * useAuth(). Superadmins see edit controls + Actions panel (download
 * template, clone from source) + history. Tenant admins see read-only
 * editor + amber notice.
 */

import { useState } from "react";
import { CategorySchemaEditor } from "@/components/admin/category-schema-editor";
import { Button } from "@/components/ui/button";
import {
  useCategorySchema,
  useCategorySchemaHistory,
  useCloneCategorySchema,
  downloadSchemaTemplate,
} from "@/lib/api/products";
import { useAuth } from "@/hooks/useAuth";

interface SchemaAdminClientProps {
  categoryId: string;
}

export function SchemaAdminClient({ categoryId }: SchemaAdminClientProps) {
  const { data: schema, isLoading, isError } = useCategorySchema(categoryId);
  const { data: history } = useCategorySchemaHistory(categoryId);
  const cloneSchema = useCloneCategorySchema();
  const [cloneSourceId, setCloneSourceId] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const { isSuperAdmin } = useAuth();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading schema…</p>;
  }

  if (isError || !schema) {
    return <p className="text-sm text-destructive">Failed to load schema</p>;
  }

  return (
    <div className="space-y-6">
      {!isSuperAdmin && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Schema editing is restricted to platform administrators. Contact your
          ProSell account manager to request schema changes.
        </div>
      )}

      <CategorySchemaEditor
        categoryId={categoryId}
        schema={schema}
        isReadOnly={!isSuperAdmin}
      />

      {isSuperAdmin && (
        <div className="space-y-3 rounded border p-4">
          <h3 className="text-sm font-medium">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSchemaTemplate(categoryId)}
            >
              Download CSV template
            </Button>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Source category ID"
                value={cloneSourceId}
                onChange={(e) => setCloneSourceId(e.target.value)}
                className="h-8 rounded border px-2 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!cloneSourceId || cloneSchema.isPending}
                onClick={() =>
                  cloneSchema.mutate({
                    targetId: categoryId,
                    sourceId: cloneSourceId,
                  })
                }
              >
                Clone from source
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schema change history — native <details> avoids adding a Collapsible primitive */}
      <details
        open={historyOpen}
        onToggle={(e) => setHistoryOpen(e.currentTarget.open)}
        className="rounded border p-4"
      >
        <summary className="cursor-pointer text-sm font-medium">
          Schema history ({history?.length ?? 0})
        </summary>
        <div className="mt-3 space-y-2">
          {history?.map((entry) => (
            <div key={entry.id} className="rounded border px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {entry.change_summary || "No changes"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.changed_at).toLocaleString()}
                </span>
              </div>
              {entry.migration_applied && (
                <span className="text-xs text-amber-600">
                  ⚠ Migration applied
                </span>
              )}
            </div>
          ))}
          {!history?.length && (
            <p className="text-sm text-muted-foreground">
              No schema changes recorded yet.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
