"use client";

/**
 * StatusQuickChange — dropdown para cambio rápido de estado en ProSell.
 *
 * Permite cambiar el estado de un vehículo desde la datagrid con un click.
 * Custom dropdown — no Radix DropdownMenu.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  File,
  Globe,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

// ============================================
// TYPES & CONFIG
// ============================================

type VehicleStatus =
  "published" | "pending" | "failed" | "draft" | "expired" | "online" | "sold";

interface StatusQuickChangeProps {
  vehicleId: string;
  currentStatus: VehicleStatus;
  onStatusChange: (vehicleId: string, newStatus: VehicleStatus) => void;
}

const statusConfig: Record<
  VehicleStatus,
  { label: string; icon: React.ElementType; color: string }
> = {
  published: {
    label: "Publicado",
    icon: CheckCircle2,
    color: "var(--ps-success)",
  },
  pending: { label: "Pendiente", icon: Clock, color: "var(--ps-warning)" },
  failed: { label: "Fallido", icon: XCircle, color: "var(--ps-error)" },
  draft: { label: "Borrador", icon: File, color: "var(--ps-text-secondary)" },
  expired: { label: "Vencido", icon: Clock, color: "var(--ps-text-tertiary)" },
  online: { label: "Online", icon: Globe, color: "var(--ps-cyan)" },
  sold: { label: "Vendido", icon: CheckCircle, color: "var(--ps-blue)" },
};

const isVehicleStatus = (s: string): s is VehicleStatus => s in statusConfig;

// ============================================
// COMPONENT
// ============================================

export function StatusQuickChange({
  vehicleId,
  currentStatus,
  onStatusChange,
}: StatusQuickChangeProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleStatusChange = (newStatus: VehicleStatus) => {
    setOpen(false);
    onStatusChange(vehicleId, newStatus);
    toast.success("Estado actualizado", {
      description: `Estado cambiado a ${statusConfig[newStatus].label}`,
    });
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 h-8 px-2.5 rounded text-xs font-medium text-ps-text-secondary cursor-pointer transition-colors bg-transparent hover:bg-ps-bg-elevated"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--ps-bg-elevated)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <span>Cambiar estado</span>
        <ChevronDown size={12} strokeWidth={2} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full right-0 mt-1 w-48 bg-ps-bg-surface border border-ps-border-default rounded-[10px] shadow-lg z-100 overflow-hidden py-1"
          style={{
            boxShadow: "0 8px 24px rgba(6,13,36,0.3)",
          }}
        >
          {Object.entries(statusConfig).map(
            ([status, { label, icon: Icon, color }]) => {
              const isCurrent = status === currentStatus;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    if (!isCurrent && isVehicleStatus(status))
                      handleStatusChange(status);
                  }}
                  disabled={isCurrent}
                  className="flex items-center gap-2.5 w-full px-3 py-2 bg-transparent border-none text-left text-sm transition-colors"
                  style={{
                    color: isCurrent
                      ? "var(--ps-text-tertiary)"
                      : "var(--ps-text-primary)",
                    cursor: isCurrent ? "default" : "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent)
                      e.currentTarget.style.background =
                        "var(--ps-bg-elevated)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Icon
                    size={14}
                    strokeWidth={2}
                    style={{ color, flexShrink: 0 }}
                  />
                  <span className="flex-1">{label}</span>
                  {isCurrent && (
                    <span className="text-[10px] text-ps-text-tertiary">
                      Actual
                    </span>
                  )}
                </button>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
