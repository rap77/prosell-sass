"use client";

import { useState, useMemo } from "react";
import {
  Check,
  X,
  Ban,
  AlertCircle,
  Search,
  Shield,
  Clock,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  useMarketplaceAccessGrants,
  useApproveMarketplaceAccess,
  useRejectMarketplaceAccess,
  useRevokeMarketplaceAccess,
} from "@/lib/api/marketplace-access";
import { useOrganizations } from "@/lib/api/organizations";
import type { MarketplaceAccessGrant } from "@/lib/api/schemas/marketplace-access";

// Status tabs configuration
const STATUS_TABS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "active", label: "Activos" },
  { value: "rejected", label: "Rechazados" },
  { value: "revoked", label: "Revocados" },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]["value"];

// Status badge with enhanced styling
function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      text: "text-yellow-700 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-800",
      icon: Clock,
    },
    active: {
      bg: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-400",
      border: "border-green-200 dark:border-green-800",
      icon: Check,
    },
    rejected: {
      bg: "bg-red-50 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-400",
      border: "border-red-200 dark:border-red-800",
      icon: X,
    },
    revoked: {
      bg: "bg-gray-50 dark:bg-gray-900/20",
      text: "text-gray-700 dark:text-gray-400",
      border: "border-gray-200 dark:border-gray-800",
      icon: Ban,
    },
  } as const;

  const style = config[status as keyof typeof config] || config.revoked;
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

// Loading skeleton for cards
function GrantCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ search }: { search: string }) {
  return (
    <div className="text-center py-12">
      <Shield className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
        {search ? "No se encontraron grants" : "No hay grants registrados"}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {search
          ? "Intenta con otro término de búsqueda"
          : "Las solicitudes de acceso aparecerán aquí"}
      </p>
    </div>
  );
}

// Grant card component
function GrantCard({
  grant,
  getOrgName,
  onApprove,
  onReject,
  onRevoke,
  approvePending,
}: {
  grant: MarketplaceAccessGrant;
  getOrgName: (id: string) => string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRevoke: (id: string) => void;
  approvePending: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {getOrgName(grant.inventory_owner_organization_id)}
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            → {getOrgName(grant.operator_organization_id)}
          </p>
        </div>
        <StatusBadge status={grant.status} />
      </div>

      {/* Permissions */}
      <div className="flex gap-2 mb-4">
        {grant.can_publish_marketplace && (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            Publicar Marketplace
          </span>
        )}
        {grant.can_manage_inventory && (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
            Gestionar Inventario
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-2 border-t border-gray-100 dark:border-gray-700 pt-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="h-3 w-3" />
          <span>
            Solicitado:{" "}
            {new Date(grant.requested_at).toLocaleDateString("es-ES")}
          </span>
        </div>
        {grant.approved_at && (
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <Check className="h-3 w-3" />
            <span>
              Aprobado:{" "}
              {new Date(grant.approved_at).toLocaleDateString("es-ES")}
            </span>
          </div>
        )}
        {grant.rejected_at && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <X className="h-3 w-3" />
            <span>
              Rechazado:{" "}
              {new Date(grant.rejected_at).toLocaleDateString("es-ES")}
            </span>
            {grant.rejection_reason && (
              <span className="italic">- {grant.rejection_reason}</span>
            )}
          </div>
        )}
        {grant.revoked_at && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Ban className="h-3 w-3" />
            <span>
              Revocado: {new Date(grant.revoked_at).toLocaleDateString("es-ES")}
            </span>
            {grant.revocation_reason && (
              <span className="italic">- {grant.revocation_reason}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {(grant.status === "pending" || grant.status === "active") && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          {grant.status === "pending" && (
            <>
              <Button
                size="sm"
                onClick={() => onApprove(grant.id)}
                disabled={approvePending}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(grant.id)}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
            </>
          )}
          {grant.status === "active" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRevoke(grant.id)}
              className="flex-1"
            >
              <Ban className="h-4 w-4 mr-1" />
              Revocar Acceso
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Professional admin component for managing marketplace access grants.
 * Features: status filters, search, card layout, audit trail, loading states.
 */
export function MarketplaceAccessManager() {
  const { data: grants = [], isLoading, error } = useMarketplaceAccessGrants();
  const { data: organizations = [] } = useOrganizations();
  const approveMutation = useApproveMarketplaceAccess();
  const rejectMutation = useRejectMarketplaceAccess();
  const revokeMutation = useRevokeMarketplaceAccess();

  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    grantId: string | null;
    reason: string;
  }>({ open: false, grantId: null, reason: "" });
  const [revokeDialog, setRevokeDialog] = useState<{
    open: boolean;
    grantId: string | null;
    reason: string;
  }>({ open: false, grantId: null, reason: "" });

  // Organization name lookup
  const getOrgName = (id: string) =>
    organizations.find((o) => o.id === id)?.name || id.slice(0, 8);

  // Filtered grants
  const filteredGrants = useMemo(() => {
    let result = grants;

    // Status filter
    if (activeTab !== "all") {
      result = result.filter((g) => g.status === activeTab);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          getOrgName(g.inventory_owner_organization_id)
            .toLowerCase()
            .includes(query) ||
          getOrgName(g.operator_organization_id).toLowerCase().includes(query),
      );
    }

    return result;
  }, [grants, activeTab, searchQuery, organizations]);

  const handleApprove = (grantId: string) => {
    approveMutation.mutate(grantId);
  };

  const handleReject = () => {
    if (!rejectDialog.grantId || !rejectDialog.reason.trim()) return;
    rejectMutation.mutate(
      { grantId: rejectDialog.grantId, reason: rejectDialog.reason },
      {
        onSuccess: () => {
          setRejectDialog({ open: false, grantId: null, reason: "" });
        },
      },
    );
  };

  const handleRevoke = () => {
    if (!revokeDialog.grantId || !revokeDialog.reason.trim()) return;
    revokeMutation.mutate(
      { grantId: revokeDialog.grantId, reason: revokeDialog.reason },
      {
        onSuccess: () => {
          setRevokeDialog({ open: false, grantId: null, reason: "" });
        },
      },
    );
  };

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">Error al cargar grants</p>
        </div>
        <p className="mt-1 text-sm text-red-600 dark:text-red-500">
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Marketplace Access
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gestiona autorizaciones cross-organization para publicar inventario
          externo
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.value
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar organizaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Grant cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <GrantCardSkeleton />
            <GrantCardSkeleton />
            <GrantCardSkeleton />
          </>
        ) : filteredGrants.length === 0 ? (
          <div className="col-span-full">
            <EmptyState search={searchQuery} />
          </div>
        ) : (
          filteredGrants.map((grant) => (
            <GrantCard
              key={grant.id}
              grant={grant}
              getOrgName={getOrgName}
              onApprove={handleApprove}
              onReject={(id) =>
                setRejectDialog({ open: true, grantId: id, reason: "" })
              }
              onRevoke={(id) =>
                setRevokeDialog({ open: true, grantId: id, reason: "" })
              }
              approvePending={approveMutation.isPending}
            />
          ))
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) =>
          setRejectDialog({ open, grantId: null, reason: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
            <DialogDescription>
              Proporciona una razón clara para rechazar esta solicitud de
              acceso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Razón del rechazo</Label>
              <Textarea
                id="reject-reason"
                value={rejectDialog.reason}
                onChange={(e) =>
                  setRejectDialog({ ...rejectDialog, reason: e.target.value })
                }
                placeholder="Ej: No cumple con los requisitos de verificación..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRejectDialog({ open: false, grantId: null, reason: "" })
              }
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectDialog.reason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rechazando..." : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog
        open={revokeDialog.open}
        onOpenChange={(open) =>
          setRevokeDialog({ open, grantId: null, reason: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revocar Acceso</DialogTitle>
            <DialogDescription>
              Esta acción revocará el acceso activo. Proporciona una razón.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="revoke-reason">Razón de la revocación</Label>
              <Textarea
                id="revoke-reason"
                value={revokeDialog.reason}
                onChange={(e) =>
                  setRevokeDialog({ ...revokeDialog, reason: e.target.value })
                }
                placeholder="Ej: Violación de términos de servicio..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRevokeDialog({ open: false, grantId: null, reason: "" })
              }
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRevoke}
              disabled={!revokeDialog.reason.trim() || revokeMutation.isPending}
              variant="destructive"
            >
              {revokeMutation.isPending ? "Revocando..." : "Revocar Acceso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
