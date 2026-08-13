"use client";

import { useState } from "react";
import { useInfiniteProducts } from "@/lib/api/products";
import {
  useBatchApproveProducts,
  useBatchRejectProducts,
  type BatchReviewResponse,
} from "@/lib/api/products";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/auth/permissions";
import { BatchActionBar } from "@/components/review/BatchActionBar";
import { ApproveConfirmDialog } from "@/components/review/ApproveConfirmDialog";
import { RejectConfirmDialog } from "@/components/review/RejectConfirmDialog";
import { BatchResultsPanel } from "@/components/review/BatchResultsPanel";
import { ReviewQueueTable } from "@/components/review/ReviewQueueTable";

export default function ReviewQueuePage() {
  const { hasPermission } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [lastResults, setLastResults] = useState<BatchReviewResponse | null>(
    null,
  );

  const { data, isLoading } = useInfiniteProducts({ status: "pending" }, 100);
  const approveMutation = useBatchApproveProducts();
  const rejectMutation = useBatchRejectProducts();

  // Permission gate
  if (!hasPermission(Permission.MARKETPLACE_PUBLISH)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ps-text-primary">
            Acceso denegado
          </h1>
          <p className="mt-2 text-ps-text-secondary">
            No tenés permisos para revisar productos.
          </p>
        </div>
      </div>
    );
  }

  const handleBatchApprove = async () => {
    const ids = Array.from(selectedIds);
    const result = await approveMutation.mutateAsync(ids);
    setLastResults(result);

    // Keep failed IDs selected
    const failedIds = result.results
      .filter((r) => r.status === "failed")
      .map((r) => r.product_id);
    setSelectedIds(new Set(failedIds));
    setShowApproveDialog(false);
  };

  const handleBatchReject = async (reason: string) => {
    const ids = Array.from(selectedIds);
    const result = await rejectMutation.mutateAsync({
      productIds: ids,
      reason,
    });
    setLastResults(result);

    // Keep failed IDs selected
    const failedIds = result.results
      .filter((r) => r.status === "failed")
      .map((r) => r.product_id);
    setSelectedIds(new Set(failedIds));
    setShowRejectDialog(false);
  };

  // Extract products from infinite query
  // ponytail: filter out products without submission date (shouldn't be in review queue)
  const products =
    data?.pages
      .flatMap((page) => page.items)
      .filter((p) => p.submitted_for_approval_at) ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-ps-text-secondary">Cargando productos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ps-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-ps-text-primary">
          Cola de revisión
        </h1>

        {products.length === 0 ? (
          <div className="rounded-lg border border-ps-border-default bg-ps-surface p-8 text-center">
            <p className="text-ps-text-secondary">
              No hay productos pendientes de revisión.
            </p>
          </div>
        ) : (
          <ReviewQueueTable
            products={products}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}
      </div>

      {selectedIds.size > 0 && (
        <BatchActionBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onApprove={() => setShowApproveDialog(true)}
          onReject={() => setShowRejectDialog(true)}
          isLoading={approveMutation.isPending || rejectMutation.isPending}
        />
      )}

      <ApproveConfirmDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        selectedCount={selectedIds.size}
        onConfirm={handleBatchApprove}
        isLoading={approveMutation.isPending}
      />

      <RejectConfirmDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        selectedCount={selectedIds.size}
        onConfirm={handleBatchReject}
        isLoading={rejectMutation.isPending}
      />

      {lastResults && (
        <BatchResultsPanel
          results={lastResults}
          onDismiss={() => setLastResults(null)}
        />
      )}
    </div>
  );
}
