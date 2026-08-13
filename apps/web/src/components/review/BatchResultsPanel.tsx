import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BatchReviewResponse } from "@/lib/api/products";

interface BatchResultsPanelProps {
  results: BatchReviewResponse;
  onDismiss: () => void;
}

export function BatchResultsPanel({
  results,
  onDismiss,
}: BatchResultsPanelProps) {
  const hasFailures = results.failed_count > 0;
  const successCount = results.approved_count + results.rejected_count;

  return (
    <div className="fixed bottom-20 right-4 w-96 rounded-lg border border-ps-border-default bg-ps-surface p-4 shadow-lg">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-ps-text-primary">
            Resultado de la operación
          </h3>
          <p className="text-sm text-ps-text-secondary">
            {successCount} exitosos, {results.failed_count} fallaron
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {hasFailures && (
        <div className="max-h-64 overflow-y-auto">
          <h4 className="mb-2 text-sm font-medium text-ps-text-primary">
            Productos con error:
          </h4>
          {results.results
            .filter((r) => r.status === "failed")
            .map((r) => (
              <div
                key={r.product_id}
                className="mb-2 rounded bg-red-50 p-2 text-sm dark:bg-red-950/30"
              >
                <p className="font-mono text-xs text-ps-text-tertiary">
                  {r.product_id}
                </p>
                <p className="text-red-600 dark:text-red-400">{r.message}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
