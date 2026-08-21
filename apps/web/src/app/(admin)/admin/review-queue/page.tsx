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
import type { Product } from "@/types/product";

// ponytail: the review queue is now a 3-tab surface so that approved
// and rejected products stay visible after the user moves them out of
// the pending state. Each tab issues its own list query against the
// backend `useInfiniteProducts({ status })` so the cache stays scoped
// per tab.

type QueueTab = "pending" | "published" | "rejected";

const TABS: { id: QueueTab; label: string }[] = [
  { id: "pending", label: "Pendientes" },
  { id: "published", label: "Aprobados" },
  { id: "rejected", label: "Rechazados" },
];

// ponytail: only the "Pendientes" tab exposes batch approve/reject
// actions. The other tabs are read-only history views. The
// ProductStatus.can_approve() / can_reject() predicates already
// enforce this server-side; the tab structure mirrors that contract
// so the UI never offers an action that the backend will reject.
const ACTIONABLE_TABS: ReadonlySet<QueueTab> = new Set<QueueTab>(["pending"]);

export default function ReviewQueuePage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<QueueTab>("pending");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [lastResults, setLastResults] = useState<BatchReviewResponse | null>(
    null,
  );

  // ponytail: the filter follows the active tab; selectedIds is reset
  // when the user changes tabs so a checkbox from the prior tab does not
  // silently ship into a new batch operation.
  const { data, isLoading } = useInfiniteProducts({ status: activeTab }, 100);

  // ponytail: one cheap count-only query per tab (limit: 1, backend
  // still returns the real `total`) so every tab label can show its
  // count without loading full pages for tabs the admin isn't viewing.
  const pendingCount = useInfiniteProducts({ status: "pending" }, 1);
  const publishedCount = useInfiniteProducts({ status: "published" }, 1);
  const rejectedCount = useInfiniteProducts({ status: "rejected" }, 1);
  const tabCounts: Record<QueueTab, number> = {
    pending: pendingCount.data?.pages[0]?.total ?? 0,
    published: publishedCount.data?.pages[0]?.total ?? 0,
    rejected: rejectedCount.data?.pages[0]?.total ?? 0,
  };

  const approveMutation = useBatchApproveProducts();
  const rejectMutation = useBatchRejectProducts();

  const isActionable = ACTIONABLE_TABS.has(activeTab);

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
    if (!isActionable) return;
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
    if (!isActionable) return;
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

  const handleTabChange = (tab: QueueTab) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
    setLastResults(null);
  };

  // Extract products from infinite query
  const products: Product[] = data?.pages.flatMap((page) => page.items) ?? [];

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

        {/* ponytail: status tabs. Pending is actionable; Published and
            Rejected are read-only history so the admin can see what
            happened to each product after it left the queue. */}
        <div
          role="tablist"
          aria-label="Estado de revisión"
          className="mb-4 flex gap-2 border-b border-ps-border-default"
        >
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`tab-panel-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                className={
                  isActive
                    ? "border-b-2 border-ps-cyan px-4 py-2 text-sm font-semibold text-ps-text-primary"
                    : "border-b-2 border-transparent px-4 py-2 text-sm font-medium text-ps-text-secondary hover:text-ps-text-primary"
                }
              >
                {count > 0 ? `${tab.label} (${count})` : tab.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`tab-panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {products.length === 0 ? (
            <div className="rounded-lg border border-ps-border-default bg-ps-surface p-8 text-center">
              <p className="text-ps-text-secondary">
                {activeTab === "pending"
                  ? "No hay productos pendientes de revisión."
                  : activeTab === "published"
                    ? "No hay productos aprobados."
                    : "No hay productos rechazados."}
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
      </div>

      {/* ponytail: the BatchActionBar is only rendered for actionable
          tabs so the admin never sees Approve/Reject buttons next to
          products in published/rejected state. The handler also
          early-returns as a defense-in-depth check. */}
      {isActionable && selectedIds.size > 0 && (
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
