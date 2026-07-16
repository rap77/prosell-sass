"use client";

/**
 * ProductOwnershipEditor — Edit product ownership with broker support.
 *
 * Flow:
 * 1. Select an organization (organization)
 * 2. If org has brokers → select brokers as owners with percentages
 * 3. If org has NO brokers → org itself is the 100% owner
 */

import { useState } from "react";
import { Plus, Trash2, Loader2, Building2, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  useOrganizations,
  useOrganizationBrokers,
} from "@/lib/api/organizations";
import {
  useProductOwnership,
  useSetProductOwnership,
} from "@/lib/api/products";

const OWNER_TYPE = {
  ORGANIZATION: "organization",
  USER: "user",
} as const;

type OwnerType = (typeof OWNER_TYPE)[keyof typeof OWNER_TYPE];

interface OwnerEntry {
  owner_id: string;
  owner_type: OwnerType;
  percentage: string;
}

interface ProductOwnershipEditorProps {
  productId: string;
}

export function ProductOwnershipEditor({
  productId,
}: ProductOwnershipEditorProps) {
  const queryClient = useQueryClient();
  const { data: organizations = [], isLoading: isLoadingOrganizations } =
    useOrganizations();
  const { data: ownership, isLoading: isLoadingOwnership } =
    useProductOwnership(productId);
  const setOwnership = useSetProductOwnership();

  // Derive initial state from server data
  const serverOwners =
    ownership?.owners.map((o) => ({
      owner_id: o.owner_id,
      owner_type: o.owner_type,
      percentage: o.percentage,
    })) ?? [];

  // ponytail: derive default org from existing ownership, no useEffect needed
  const defaultOrgId =
    serverOwners.find((o) => o.owner_type === OWNER_TYPE.ORGANIZATION)
      ?.owner_id ?? null;

  // User can override the default by selecting a different org
  const [userSelectedOrgId, setUserSelectedOrgId] = useState<string | null>(
    null,
  );
  const selectedOrgId = userSelectedOrgId ?? defaultOrgId;
  const setSelectedOrgId = setUserSelectedOrgId;

  // Fetch brokers for selected org
  const { data: brokers = [], isLoading: isLoadingBrokers } =
    useOrganizationBrokers(selectedOrgId ?? undefined);

  const [localOwners, setLocalOwners] = useState<OwnerEntry[] | null>(null);

  // Use server data until user edits
  const owners = localOwners ?? serverOwners;
  const isDirty = localOwners !== null;

  const setOwners = (newOwners: OwnerEntry[]) => setLocalOwners(newOwners);

  const selectedOrg = organizations.find((d) => d.id === selectedOrgId);
  const hasBrokers = (selectedOrg?.broker_count ?? 0) > 0;

  const isLoading = isLoadingOrganizations || isLoadingOwnership;

  // Validation
  const total = owners.reduce(
    (sum, o) => sum + (parseFloat(o.percentage) || 0),
    0,
  );
  const isValid = Math.abs(total - 100) < 0.01 && owners.length > 0;
  const hasEmptyOwner = owners.some((o) => !o.owner_id);

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    const org = organizations.find((d) => d.id === orgId);
    const orgHasBrokers = (org?.broker_count ?? 0) > 0;

    if (orgHasBrokers) {
      // Clear owners, let user select brokers
      setOwners([]);
    } else {
      // Org is the 100% owner
      setOwners([
        {
          owner_id: orgId,
          owner_type: OWNER_TYPE.ORGANIZATION,
          percentage: "100",
        },
      ]);
    }
  };

  const addBrokerOwner = () => {
    // ponytail: auto-fill remaining percentage to complete 100
    const used = owners.reduce(
      (sum, o) => sum + (parseFloat(o.percentage) || 0),
      0,
    );
    const remaining = Math.max(0, 100 - used);
    setOwners([
      ...owners,
      {
        owner_id: "",
        owner_type: OWNER_TYPE.USER,
        percentage: String(remaining),
      },
    ]);
  };

  const removeOwner = (index: number) => {
    setOwners(owners.filter((_, i) => i !== index));
  };

  const updateOwner = <K extends keyof OwnerEntry>(
    index: number,
    field: K,
    value: OwnerEntry[K],
  ) => {
    const updated = [...owners];
    updated[index] = { ...updated[index], [field]: value };
    setOwners(updated);
  };

  const handleSave = async () => {
    if (!isValid || hasEmptyOwner) return;

    // ponytail: use returned data directly to avoid race condition
    // between setLocalOwners(null) and query refetch
    const result = await setOwnership.mutateAsync({
      productId,
      owners: owners.map((o) => ({
        owner_id: o.owner_id,
        owner_type: o.owner_type,
        percentage: parseFloat(o.percentage).toFixed(2),
      })),
    });
    queryClient.setQueryData(["products", productId, "ownership"], result);
    setLocalOwners(null);
  };

  // Filter out already-selected brokers
  const selectedBrokerIds = new Set(
    owners
      .filter((o) => o.owner_type === OWNER_TYPE.USER)
      .map((o) => o.owner_id),
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Cargando...</span>
      </div>
    );
  }

  // Only show for admins who can see organizations
  if (organizations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-sm font-semibold">Propietarios</h3>

      {/* Step 1: Select Organization */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Organización
        </label>
        <Select value={selectedOrgId ?? ""} onValueChange={handleOrgChange}>
          <SelectTrigger className="w-full">
            {selectedOrgId ? (
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {selectedOrg?.name}
                {hasBrokers && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedOrg?.broker_count} brokers)
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Seleccionar organización
              </span>
            )}
          </SelectTrigger>
          <SelectContent>
            {organizations.map((organization) => (
              <SelectItem
                key={organization.id}
                value={organization.id}
                textValue={organization.name}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {organization.name}
                  {(organization.broker_count ?? 0) > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({organization.broker_count} brokers)
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2: Show owners based on org type */}
      {selectedOrgId && (
        <>
          {hasBrokers ? (
            // Org has brokers — user selects broker owners
            <>
              {isLoadingBrokers ? (
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando brokers...
                </div>
              ) : (
                <>
                  {owners.length === 0 ? (
                    <p className="mb-4 text-sm text-muted-foreground">
                      Seleccione los brokers propietarios del producto.
                    </p>
                  ) : (
                    <div className="mb-4 space-y-3">
                      {owners.map((owner, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Select
                            value={owner.owner_id || undefined}
                            onValueChange={(v) =>
                              updateOwner(index, "owner_id", v)
                            }
                          >
                            <SelectTrigger className="flex-1">
                              {owner.owner_id ? (
                                <span className="flex items-center gap-2 truncate">
                                  <User className="h-4 w-4" />
                                  {brokers.find((b) => b.id === owner.owner_id)
                                    ?.name ?? owner.owner_id}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Seleccionar broker
                                </span>
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {brokers
                                .filter(
                                  (b) =>
                                    b.id === owner.owner_id ||
                                    !selectedBrokerIds.has(b.id),
                                )
                                .map((broker) => (
                                  <SelectItem
                                    key={broker.id}
                                    value={broker.id}
                                    textValue={broker.name}
                                  >
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      {broker.name}
                                      <span className="text-xs text-muted-foreground">
                                        ({broker.email})
                                      </span>
                                      {broker.status === "pending" && (
                                        <span className="text-[10px] text-orange-500">
                                          (pendiente)
                                        </span>
                                      )}
                                    </div>
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
                            <span className="text-sm text-muted-foreground">
                              %
                            </span>
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

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBrokerOwner}
                    disabled={brokers.length === owners.length}
                    className="mb-4"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Agregar propietario
                  </Button>
                </>
              )}
            </>
          ) : (
            // Org has NO brokers — org is the owner
            <div className="mb-4 flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>
                <strong>{selectedOrg?.name}</strong> es el propietario (100%)
              </span>
            </div>
          )}
        </>
      )}

      {/* Total indicator */}
      {owners.length > 0 && hasBrokers && (
        <div
          className={`mb-4 text-sm ${Math.abs(total - 100) < 0.01 ? "text-green-600" : "text-destructive"}`}
        >
          Total: {total.toFixed(2)}%{" "}
          {Math.abs(total - 100) >= 0.01 && "(debe ser 100%)"}
        </div>
      )}

      {/* Save ownership button - visually distinct from main form save */}
      {isDirty && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={!isValid || hasEmptyOwner || setOwnership.isPending}
        >
          {setOwnership.isPending ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Aplicando...
            </>
          ) : (
            "Aplicar propietarios"
          )}
        </Button>
      )}
    </div>
  );
}
