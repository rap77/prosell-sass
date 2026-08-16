"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCreateMarketplaceAccessAsAdmin } from "@/lib/api/marketplace-access";
import { useOrganizations } from "@/lib/api/organizations";

interface CreateMarketplaceAccessDialogProps {
  operatorOrganizationId: string;
}

export function CreateMarketplaceAccessDialog({
  operatorOrganizationId,
}: CreateMarketplaceAccessDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: organizations, isLoading: loadingOrgs } = useOrganizations();
  const createMutation = useCreateMarketplaceAccessAsAdmin();

  // Form state
  const [inventoryOwnerId, setInventoryOwnerId] = useState<string>("");
  const [canPublish, setCanPublish] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [initialStatus, setInitialStatus] = useState<"pending" | "active">(
    "pending",
  );
  const [error, setError] = useState<string>("");

  // Filter out operator organization from inventory owner select
  const inventoryOwnerOrgs =
    organizations?.filter((org) => org.id !== operatorOrganizationId) ?? [];

  // ponytail: debug log - remove after fixing
  console.log("DEBUG - Organizations:", {
    total: organizations?.length ?? 0,
    filtered: inventoryOwnerOrgs.length,
    operatorId: operatorOrganizationId,
    loadingOrgs,
  });
  console.log("DEBUG - Form state:", {
    inventoryOwnerId,
    initialStatus,
    open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!inventoryOwnerId) {
      setError("Seleccioná una organización");
      return;
    }

    try {
      await createMutation.mutateAsync({
        inventory_owner_organization_id: inventoryOwnerId,
        operator_organization_id: operatorOrganizationId,
        can_publish_marketplace: canPublish,
        can_manage_inventory: canManage,
        initial_status: initialStatus,
      });

      // Reset form
      setInventoryOwnerId("");
      setCanPublish(true);
      setCanManage(false);
      setInitialStatus("pending");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear grant");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Access
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Marketplace Access</DialogTitle>
          <DialogDescription>
            Crear grant de acceso para que ProSell pueda publicar inventario de
            otra organización.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Inventory Owner Organization */}
          <div className="space-y-2">
            <Label htmlFor="inventory-owner">
              Organización (Inventory Owner)
            </Label>
            <Select
              value={inventoryOwnerId}
              onValueChange={(value) => {
                console.log("DEBUG - Inventory Owner selected:", value);
                setInventoryOwnerId(value);
              }}
            >
              <SelectTrigger id="inventory-owner">
                <SelectValue placeholder="Seleccionar organización..." />
              </SelectTrigger>
              <SelectContent>
                {loadingOrgs && (
                  <SelectItem value="_loading" disabled>
                    Cargando organizaciones...
                  </SelectItem>
                )}
                {!loadingOrgs && inventoryOwnerOrgs.length === 0 && (
                  <SelectItem value="_empty" disabled>
                    No hay organizaciones disponibles
                  </SelectItem>
                )}
                {inventoryOwnerOrgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Organización dueña del inventario que se va a publicar.
            </p>
          </div>

          {/* Initial Status */}
          <div className="space-y-2">
            <Label htmlFor="initial-status">Estado Inicial</Label>
            <Select
              value={initialStatus}
              onValueChange={(v) => {
                if (v === "pending" || v === "active") {
                  setInitialStatus(v);
                }
              }}
            >
              <SelectTrigger id="initial-status">
                <SelectValue placeholder="Seleccionar estado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  Pending (requiere aprobación)
                </SelectItem>
                <SelectItem value="active">
                  Active (aprobado directamente)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pending requiere aprobación posterior. Active está listo para
              publicar.
            </p>
          </div>

          {/* Permissions */}
          <div className="space-y-4">
            <Label>Permisos</Label>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="can-publish"
                checked={canPublish}
                onCheckedChange={(checked) => setCanPublish(checked === true)}
              />
              <div className="space-y-1 leading-none">
                <Label
                  htmlFor="can-publish"
                  className="font-normal cursor-pointer"
                >
                  Puede publicar en Marketplace
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Permite publicar productos en Facebook Marketplace
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="can-manage"
                checked={canManage}
                onCheckedChange={(checked) => setCanManage(checked === true)}
              />
              <div className="space-y-1 leading-none">
                <Label
                  htmlFor="can-manage"
                  className="font-normal cursor-pointer"
                >
                  Puede gestionar inventario
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Permite crear, editar y eliminar productos
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creando..." : "Crear Grant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
