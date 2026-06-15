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
  | "published"
  | "pending"
  | "failed"
  | "draft"
  | "expired"
  | "online"
  | "sold";

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
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          height: 32,
          padding: "0 10px",
          borderRadius: 6,
          background: "transparent",
          border: "none",
          color: "var(--ps-text-secondary)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
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
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            width: 192,
            background: "var(--ps-bg-surface)",
            border: "1px solid var(--ps-border-default)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(6,13,36,0.3)",
            zIndex: 100,
            overflow: "hidden",
            padding: "4px 0",
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 12px",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    fontSize: 13,
                    color: isCurrent
                      ? "var(--ps-text-tertiary)"
                      : "var(--ps-text-primary)",
                    cursor: isCurrent ? "default" : "pointer",
                    transition: "background 0.1s",
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
                  <span style={{ flex: 1 }}>{label}</span>
                  {isCurrent && (
                    <span
                      style={{ fontSize: 10, color: "var(--ps-text-tertiary)" }}
                    >
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
