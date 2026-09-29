"use client";

import { useState } from "react";
import { Building2, Layers } from "lucide-react";
import { useInfiniteProducts } from "@/lib/api/products";
import { useProductImageUrlsBatch } from "@/lib/api/productImageUrlsBatch";
import {
  useBatchApproveProducts,
  useBatchRejectProducts,
  useSubmitProductsForApproval,
  type BatchReviewResponse,
} from "@/lib/api/products";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/auth/permissions";
import { useCurrentOrganizationProfile } from "@/lib/api/userApi";
import { useOrganizations } from "@/lib/api/organizations";
import { useOrganizationStore } from "@/stores/organizationStore";
import { BatchActionBar } from "@/components/review/BatchActionBar";
import { ResubmitActionBar } from "@/components/review/ResubmitActionBar";
import { ApproveConfirmDialog } from "@/components/review/ApproveConfirmDialog";
import { RejectConfirmDialog } from "@/components/review/RejectConfirmDialog";
import { BatchResultsPanel } from "@/components/review/BatchResultsPanel";
import { ReviewQueueTable } from "@/components/review/ReviewQueueTable";
import type { Product } from "@/types/product";

// ponytail: the review queue is now a 3-tab surface so that approved
// and rejected products stay visible after the user moves them out of
// the pending state. Each tab issues its own list query against the
// backend `useInfiniteProducts({ status, organization_id })` so the
// cache stays scoped per tab. The `organization_id` mirrors the
// global "Ver como" state from the header `OrganizationPicker`
// (Subsystem D, gated by ORG_ADMIN_VIEW_ALL) so admin screens stay
// consistent across admin catalog, review queue, etc. — no second
// parallel state mechanism.

// ponytail: `ALL_ORGS` cross-org sentinel from the store, exported as
// a typed alias so the helper signature and the store type line up.
type ViewingOrgId = string | "ALL_ORGS" | null;

// ponytail: returns the value the API expects in
// `organization_id` for the three "view as" states. Returns
// `undefined` (= omit the param) for "ALL_ORGS" — that's the backend's
// signal for "every organization" on `list_products` (gated by
// ORG_ADMIN_VIEW_ALL). When no "view as" is active, falls back to the
// admin's own tenant id so the query never silently inherits the
// cross-org default just by not having clicked OrganizationPicker yet.
function resolveOrganizationFilter(
  viewingOrgId: ViewingOrgId,
  ownOrganizationId: string | null | undefined,
): string | undefined {
  if (viewingOrgId === "ALL_ORGS") return undefined;
  if (viewingOrgId) return viewingOrgId;
  return ownOrganizationId ?? undefined;
}

type QueueTab = "pending" | "published" | "rejected";

const TABS: { id: QueueTab; label: string }[] = [
  { id: "pending", label: "Pendientes" },
  { id: "published", label: "Aprobados" },
  { id: "rejected", label: "Rechazados" },
];

const EMPTY_MESSAGES: Record<QueueTab, string> = {
  pending: "No hay productos pendientes de revisión.",
  published: "No hay productos aprobados.",
  rejected: "No hay productos rechazados.",
};

// ponytail: "Pendientes" exposes batch approve/reject and "Rechazados"
// exposes batch resubmit-to-review (ProductStatus.can_submit_for_approval()
// allows REJECTED -> PENDING). "Aprobados" stays read-only history — the
// backend has no bulk action defined from PUBLISHED in this queue's flow.
const ACTIONABLE_TABS: ReadonlySet<QueueTab> = new Set<QueueTab>([
  "pending",
  "rejected",
]);

export default function ReviewQueuePage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<QueueTab>("pending");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [lastResults, setLastResults] = useState<BatchReviewResponse | null>(
    null,
  );

  // ponytail: the global "Ver como" state from the header
  // `OrganizationPicker` (admin-only, gated by ORG_ADMIN_VIEW_ALL on
  // the store setter). Reading it here keeps the review queue aligned
  // with the admin catalog and any other "view as" surface.
  const viewingOrgId = useOrganizationStore((state) => state.viewingOrgId);
  // ponytail: the admin's own tenant id, used as the implicit
  // filter when no "view as" is active (see resolveOrganizationFilter).
  const { data: orgProfile } = useCurrentOrganizationProfile();
  const ownOrganizationId = orgProfile?.id ?? null;
  // ponytail: reuses the SAME cached list OrganizationPicker already
  // fires (TanStack Query dedupes by queryKey) — used to label the
  // active filter so the admin always knows which organization's
  // queue they're looking at.
  const { data: organizations = [] } = useOrganizations();

  const organizationFilter = resolveOrganizationFilter(
    viewingOrgId,
    ownOrganizationId,
  );

  // ponytail: when the admin switches organization, clear the
  // selection and the last batch results so neither survives the
  // context switch (an id selected for one org is meaningless for
  // another; a results panel about one org would silently lie about
  // the other). Tab change already does the same reset in
  // handleTabChange — this "reset on prop change" pattern keeps both
  // surfaces consistent.
  //
  // Implementation note (you-might-not-need-an-effect): React's
  // canonical pattern for "reset state when a prop changes" is to
  // compare the previous value during render and call setState in
  // that branch — React throws away the rendered JSX and re-renders
  // with the new state, and the user only sees the final frame. A
  // useEffect-based reset triggers an extra cascading render and is
  // flagged by react-hooks/set-state-in-effect.
  const [prevViewingOrgId, setPrevViewingOrgId] =
    useState<ViewingOrgId>(viewingOrgId);
  if (prevViewingOrgId !== viewingOrgId) {
    setPrevViewingOrgId(viewingOrgId);
    setSelectedIds(new Set());
    setLastResults(null);
  }

  // ponytail: the filter follows the active tab; selectedIds is reset
  // when the user changes tabs so a checkbox from the prior tab does not
  // silently ship into a new batch operation.
  const { data, isLoading } = useInfiniteProducts(
    { status: activeTab, organization_id: organizationFilter },
    100,
  );

  // ponytail: one cheap count-only query per tab (limit: 1, backend
  // still returns the real `total`) so every tab label can show its
  // count without loading full pages for tabs the admin isn't viewing.
  // All three reuse the SAME organizationFilter as the active query so
  // the badges and the table can never disagree about scope.
  const pendingCount = useInfiniteProducts(
    { status: "pending", organization_id: organizationFilter },
    1,
  );
  const publishedCount = useInfiniteProducts(
    { status: "published", organization_id: organizationFilter },
    1,
  );
  const rejectedCount = useInfiniteProducts(
    { status: "rejected", organization_id: organizationFilter },
    1,
  );
  const tabCounts: Record<QueueTab, number> = {
    pending: pendingCount.data?.pages[0]?.total ?? 0,
    published: publishedCount.data?.pages[0]?.total ?? 0,
    rejected: rejectedCount.data?.pages[0]?.total ?? 0,
  };

  const approveMutation = useBatchApproveProducts();
  const rejectMutation = useBatchRejectProducts();
  const resubmitMutation = useSubmitProductsForApproval();

  // Extract products from infinite query
  const products: Product[] = data?.pages.flatMap((page) => page.items) ?? [];

  // Signed cover-image URLs for the visible tab's products (same batch
  // endpoint the catalog grid uses) — never build a raw storage URL
  // client-side, the bucket is private. Called unconditionally (rules of
  // hooks), ahead of the permission gate below.
  const { urls: productImageUrls } = useProductImageUrlsBatch(
    products.map((p) => p.id),
  );

  const isActionable = ACTIONABLE_TABS.has(activeTab);

  // ponytail: mirrors the OrganizationPicker label so the page
  // reflects the same scope as the header. Falls back gracefully
  // when the cached list hasn't resolved yet (e.g. first paint with
  // a specific org selected) so the admin never sees a stale label.
  const activeOrganizationLabel = (() => {
    if (viewingOrgId === "ALL_ORGS") return "Todas las organizaciones";
    if (viewingOrgId) {
      const match = organizations.find((o) => o.id === viewingOrgId);
      return match?.name ?? "Organización seleccionada";
    }
    if (ownOrganizationId) {
      const match = organizations.find((o) => o.id === ownOrganizationId);
      return match?.name ?? "Mi organización";
    }
    return "Mi organización";
  })();

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
    if (activeTab !== "pending") return;
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
    if (activeTab !== "pending") return;
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

  const handleBulkResubmit = () => {
    if (activeTab !== "rejected") return;
    const ids = Array.from(selectedIds);
    resubmitMutation.mutate(ids);
    setSelectedIds(new Set());
  };

  const handleTabChange = (tab: QueueTab) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
    setLastResults(null);
  };

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
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-ps-text-primary">
            Cola de revisión
          </h1>
          {/* ponytail: small status badge mirroring OrganizationPicker so
              the admin always knows which organization's queue they're
              looking at. icon swaps between Layers (cross-org) and
              Building2 (single org) to give the same at-a-glance cue
              the header dropdown uses. */}
          <div
            data-testid="review-queue-active-org"
            role="status"
            aria-label={`Revisando productos de ${activeOrganizationLabel}`}
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ps-elevated px-2.5 py-1 text-[12px] font-medium text-ps-text-secondary"
          >
            {viewingOrgId === "ALL_ORGS" ? (
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Revisando: {activeOrganizationLabel}</span>
          </div>
        </div>

        {/* ponytail: status tabs. Pending and Rejected are actionable
            (approve/reject, resubmit); Published stays read-only history
            so the admin can see what happened after a product left the
            queue. */}
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
                id={`tab-${tab.id}`}
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
                {EMPTY_MESSAGES[activeTab]}
              </p>
            </div>
          ) : (
            <ReviewQueueTable
              products={products}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              selectable={isActionable}
              imageUrls={productImageUrls}
            />
          )}
        </div>
      </div>

      {/* ponytail: each actionable tab gets its own action bar so the
          admin never sees an action next to a product it doesn't apply
          to. The handlers also early-return per tab as a defense-in-depth
          check. */}
      {activeTab === "pending" && selectedIds.size > 0 && (
        <BatchActionBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onApprove={() => setShowApproveDialog(true)}
          onReject={() => setShowRejectDialog(true)}
          isLoading={approveMutation.isPending || rejectMutation.isPending}
        />
      )}

      {activeTab === "rejected" && selectedIds.size > 0 && (
        <ResubmitActionBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onResubmit={handleBulkResubmit}
          isLoading={resubmitMutation.isPending}
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
