"use client";

import { useState } from "react";
import { useReassignLead } from "@/lib/api/leads";
import { useVendedores, type Vendedor } from "@/lib/api/vendedores";
import type { Lead } from "@/lib/api/leads";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LeadReassignModalProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * LeadReassignModal - Modal for reassigning leads to different vendedores
 *
 * Features:
 * - Display lead information (buyer name, vehicle)
 * - Vendedor dropdown populated from /api/v1/vendedores
 * - Confirm button that calls useReassignLead mutation
 * - Cancel button to close modal
 * - Toast notifications for success/error
 * - Disabled confirm button until vendedor is selected
 */
export function LeadReassignModal({
  lead,
  open,
  onClose,
  onSuccess,
}: LeadReassignModalProps) {
  const [selectedVendedorId, setSelectedVendedorId] = useState<string | null>(
    null,
  );

  // Fetch vendedores for dropdown
  const { data: vendedores = [], isLoading: isLoadingVendedores } =
    useVendedores();

  // Reassign lead mutation
  const { mutate: reassignLead, isPending: isReassigning } = useReassignLead(
    lead?.id || "",
  );

  const handleReassign = () => {
    if (!lead || !selectedVendedorId) return;

    reassignLead(
      { vendedor_id: selectedVendedorId },
      {
        onSuccess: () => {
          toast.success("Lead reassigned successfully");
          onSuccess();
          onClose();
          setSelectedVendedorId(null);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to reassign lead");
        },
      },
    );
  };

  const handleClose = () => {
    setSelectedVendedorId(null);
    onClose();
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reassign Lead</DialogTitle>
          <DialogDescription>
            Reassign this lead to a different vendedor on your team.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Lead Information */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Lead Details
            </Label>
            <div className="p-3 bg-muted/50 rounded-md space-y-1">
              <p className="text-sm font-medium">{lead.buyer_name}</p>
              {lead.product && (
                <p className="text-sm text-muted-foreground">
                  {lead.product.title}
                </p>
              )}
            </div>
          </div>

          {/* Vendedor Selection */}
          <div className="space-y-2">
            <Label htmlFor="vendedor-select">Assign to Vendedor</Label>
            <Select
              value={selectedVendedorId || ""}
              onValueChange={(value) => setSelectedVendedorId(value)}
              disabled={isLoadingVendedores || isReassigning}
            >
              <SelectTrigger id="vendedor-select" data-testid="vendedor-select">
                <SelectValue placeholder="Select a vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((vendedor: Vendedor) => (
                  <SelectItem key={vendedor.id} value={vendedor.id}>
                    {vendedor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isReassigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={!selectedVendedorId || isReassigning}
          >
            {isReassigning ? "Reassigning..." : "Reassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
