"use client";

import { CheckCircle2, Clock, XCircle, File, Globe, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type VehicleStatus = "published" | "pending" | "failed" | "draft" | "expired" | "online" | "sold";

interface StatusQuickChangeProps {
  vehicleId: string;
  currentStatus: VehicleStatus;
  onStatusChange: (vehicleId: string, newStatus: VehicleStatus) => void;
}

const statusConfig = {
  published: { label: "Published", icon: CheckCircle2, color: "text-green-600" },
  pending: { label: "Pending", icon: Clock, color: "text-yellow-600" },
  failed: { label: "Failed", icon: XCircle, color: "text-red-600" },
  draft: { label: "Draft", icon: File, color: "text-gray-600" },
  expired: { label: "Expired", icon: Clock, color: "text-gray-600" },
  online: { label: "Online", icon: Globe, color: "text-blue-600" },
  sold: { label: "Sold", icon: CheckCircle, color: "text-purple-600" },
} as const;

export function StatusQuickChange({
  vehicleId,
  currentStatus,
  onStatusChange,
}: StatusQuickChangeProps) {
  const handleStatusChange = (newStatus: VehicleStatus) => {
    onStatusChange(vehicleId, newStatus);
    toast.success("Status updated", {
      description: `Vehicle status changed to ${statusConfig[newStatus].label}`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
        >
          <span className="text-xs">Change Status</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(statusConfig).map(([status, { label, icon: Icon }]) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status as VehicleStatus)}
            disabled={status === currentStatus}
            className="flex items-center gap-2"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {status === currentStatus && (
              <span className="ml-auto text-xs text-muted-foreground">
                Current
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
