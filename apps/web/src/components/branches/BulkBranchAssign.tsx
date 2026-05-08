"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { useBranches, useBulkAssignProductsToBranch } from "@/lib/api/branches";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BranchSelector } from "./BranchSelector";
import { Loader } from "@/components/ui/loader";

interface BulkBranchAssignProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  productCount: number;
}

export function BulkBranchAssign({
  open,
  onOpenChange,
  productIds,
  productCount,
}: BulkBranchAssignProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const bulkAssign = useBulkAssignProductsToBranch();

  const handleAssign = () => {
    if (!selectedBranchId) {
      toast.error("Please select a branch", {
        description: "You must select a branch to assign products to.",
      });
      return;
    }

    bulkAssign.mutate(
      { productIds, branchId: selectedBranchId },
      {
        onSuccess: () => {
          setSelectedBranchId("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Assign Products to Branch
          </DialogTitle>
          <DialogDescription>
            Assign {vehicleCount} product{productCount !== 1 ? "s" : ""} to a branch.
            This will update the branch assignment for all selected vehicles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="branch-select" className="text-sm font-medium">
              Select Branch
            </label>
            <BranchSelector
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              placeholder="Choose a branch..."
            />
          </div>

          {selectedBranchId && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                {vehicleCount} product{productCount !== 1 ? "s will" : " will"} be
                assigned to the selected branch.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={bulkAssign.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!selectedBranchId || bulkAssign.isPending}
          >
            {bulkAssign.isPending ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                Assigning...
              </>
            ) : (
              `Assign ${vehicleCount} Vehicle${productCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
