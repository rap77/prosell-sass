"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { useDealers, useBulkAssignVehiclesToDealer } from "@/lib/api/dealers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DealerSelector } from "./DealerSelector";
import { Loader } from "@/components/ui/loader";

interface BulkDealerAssignProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleIds: string[];
  vehicleCount: number;
}

export function BulkDealerAssign({
  open,
  onOpenChange,
  vehicleIds,
  vehicleCount,
}: BulkDealerAssignProps) {
  const [selectedDealerId, setSelectedDealerId] = useState<string>("");
  const bulkAssign = useBulkAssignVehiclesToDealer();

  const handleAssign = () => {
    if (!selectedDealerId) {
      toast.error("Please select a dealer", {
        description: "You must select a dealer to assign vehicles to.",
      });
      return;
    }

    bulkAssign.mutate(
      { vehicleIds, dealerId: selectedDealerId },
      {
        onSuccess: () => {
          setSelectedDealerId("");
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
            Assign Vehicles to Dealer
          </DialogTitle>
          <DialogDescription>
            Assign {vehicleCount} vehicle{vehicleCount !== 1 ? "s" : ""} to a dealer.
            This will update the dealer assignment for all selected vehicles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="dealer-select" className="text-sm font-medium">
              Select Dealer
            </label>
            <DealerSelector
              value={selectedDealerId}
              onChange={setSelectedDealerId}
              placeholder="Choose a dealer..."
            />
          </div>

          {selectedDealerId && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                {vehicleCount} vehicle{vehicleCount !== 1 ? "s will" : " will"} be
                assigned to the selected dealer.
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
            disabled={!selectedDealerId || bulkAssign.isPending}
          >
            {bulkAssign.isPending ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                Assigning...
              </>
            ) : (
              `Assign ${vehicleCount} Vehicle${vehicleCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
