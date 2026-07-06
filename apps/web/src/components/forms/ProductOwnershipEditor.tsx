"use client";

/**
 * ProductOwnershipEditor — Edit product ownership (multi-owner support).
 *
 * Allows setting multiple owners (organizations/dealers) with percentage shares.
 * Percentages must sum to 100%.
 */

import { useState, useMemo } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDealers } from "@/lib/api/dealers";
import {
  useProductOwnership,
  useSetProductOwnership,
} from "@/lib/api/products";

interface OwnerEntry {
  owner_id: string;
  percentage: string;
}

interface ProductOwnershipEditorProps {
  productId: string;
}

export function ProductOwnershipEditor({
  productId,
}: ProductOwnershipEditorProps) {
  const { data: dealers = [], isLoading: isLoadingDealers } = useDealers();
  const { data: ownership, isLoading: isLoadingOwnership } =
    useProductOwnership(productId);
  const setOwnership = useSetProductOwnership();

  // Derive initial state from server data
  const serverOwners = useMemo(
    () =>
      ownership?.owners.map((o) => ({
        owner_id: o.owner_id,
        percentage: o.percentage,
      })) ?? [],
    [ownership],
  );

  const [localOwners, setLocalOwners] = useState<OwnerEntry[] | null>(null);

  // ponytail: Use server data until user edits, then use local state
  const owners = localOwners ?? serverOwners;
  const isDirty = localOwners !== null;

  const setOwners = (newOwners: OwnerEntry[]) => setLocalOwners(newOwners);

  const isLoading = isLoadingDealers || isLoadingOwnership;

  // Validation
  const total = owners.reduce(
    (sum, o) => sum + (parseFloat(o.percentage) || 0),
    0,
  );
  const isValid = Math.abs(total - 100) < 0.01 && owners.length > 0;
  const hasEmptyOwner = owners.some((o) => !o.owner_id);

  const addOwner = () => {
    setOwners([...owners, { owner_id: "", percentage: "0" }]);
  };

  const removeOwner = (index: number) => {
    setOwners(owners.filter((_, i) => i !== index));
  };

  const updateOwner = (
    index: number,
    field: keyof OwnerEntry,
    value: string,
  ) => {
    const updated = [...owners];
    updated[index] = { ...updated[index], [field]: value };
    setOwners(updated);
  };

  const handleSave = async () => {
    if (!isValid || hasEmptyOwner) return;

    await setOwnership.mutateAsync({
      productId,
      owners: owners.map((o) => ({
        owner_id: o.owner_id,
        percentage: parseFloat(o.percentage).toFixed(2),
      })),
    });
    setLocalOwners(null); // Reset to server state
  };

  // Filter out already-selected dealers
  const selectedIds = new Set(owners.map((o) => o.owner_id));

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Cargando...</span>
      </div>
    );
  }

  // ponytail: Only show for admins who can see dealers. useDealers 403s for non-admins.
  if (dealers.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-sm font-semibold">Propietarios</h3>

      {owners.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Sin propietarios asignados. El producto pertenece a la organización
          actual.
        </p>
      ) : (
        <div className="mb-4 space-y-3">
          {owners.map((owner, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                value={owner.owner_id}
                onValueChange={(v) => updateOwner(index, "owner_id", v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar dealer" />
                </SelectTrigger>
                <SelectContent>
                  {dealers
                    .filter(
                      (d) => d.id === owner.owner_id || !selectedIds.has(d.id),
                    )
                    .map((dealer) => (
                      <SelectItem
                        key={dealer.id}
                        value={dealer.id}
                        textValue={dealer.name}
                      >
                        {dealer.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <div className="flex w-24 items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={owner.percentage}
                  onChange={(e) =>
                    updateOwner(index, "percentage", e.target.value)
                  }
                  className="text-right"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeOwner(index)}
                className="h-8 w-8 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Total indicator */}
      {owners.length > 0 && (
        <div
          className={`mb-4 text-sm ${Math.abs(total - 100) < 0.01 ? "text-green-600" : "text-destructive"}`}
        >
          Total: {total.toFixed(2)}%{" "}
          {Math.abs(total - 100) >= 0.01 && "(debe ser 100%)"}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOwner}
          disabled={dealers.length === owners.length}
        >
          <Plus className="mr-1 h-4 w-4" />
          Agregar propietario
        </Button>

        {isDirty && (
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!isValid || hasEmptyOwner || setOwnership.isPending}
          >
            {setOwnership.isPending ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
