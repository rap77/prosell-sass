"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, Pencil, Check, X } from "lucide-react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import {
  useDealer,
  useResendDealerInvitation,
  useUpdateDealer,
} from "@/lib/api/dealers";
import { BrokerManager } from "@/components/admin/BrokerManager";

/**
 * Admin dealer detail — Subsystem D Phase 6.
 *
 * Uses `useParams()` (not the `params: Promise<...>` + `use()` pattern)
 * — this page is 100% client-rendered via React Query, so there's no
 * server-streaming benefit to the promise form, and `use()` on a pending
 * promise needs a Suspense boundary to resolve cleanly in jsdom tests.
 */
export default function AdminDealerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isAdmin = useRequireAdmin();
  const { dealer, isLoading, error } = useDealer(id);
  const resendInvitation = useResendDealerInvitation();
  const updateDealer = useUpdateDealer();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const handleStartEdit = () => {
    if (dealer) {
      setEditedName(dealer.name);
      setIsEditingName(true);
    }
  };

  const handleSaveName = async () => {
    if (!dealer || !editedName.trim()) return;
    await updateDealer.mutateAsync({
      dealerId: dealer.id,
      data: { name: editedName.trim() },
    });
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--ps-text-secondary)",
        }}
      >
        <Loader2 size={16} className="animate-spin" />
        Cargando organización…
      </div>
    );
  }

  if (error) {
    return (
      <p style={{ color: "var(--ps-error)" }}>
        Error al cargar el organización: {error.message}
      </p>
    );
  }

  if (!dealer) {
    return (
      <p style={{ color: "var(--ps-text-secondary)" }}>
        Organización no encontrado.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Back button */}
      <Link
        href="/admin/organizations"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--ps-text-secondary)",
          textDecoration: "none",
          fontSize: 13,
        }}
      >
        <ArrowLeft size={14} />
        Organizaciones
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {isEditingName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") handleCancelEdit();
              }}
              autoFocus
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 8,
                border: "1px solid var(--ps-cyan)",
                background: "var(--ps-bg-elevated)",
                color: "var(--ps-text-primary)",
                fontSize: 18,
                fontWeight: 700,
                minWidth: 200,
              }}
            />
            <button
              type="button"
              onClick={handleSaveName}
              disabled={updateDealer.isPending || !editedName.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "none",
                background: "var(--ps-success)",
                color: "white",
                cursor: "pointer",
              }}
            >
              {updateDealer.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "1px solid var(--ps-border-default)",
                background: "var(--ps-bg-elevated)",
                color: "var(--ps-text-secondary)",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "var(--ps-text-primary)",
              }}
            >
              {dealer.name}
            </h1>
            <button
              type="button"
              onClick={handleStartEdit}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "1px solid var(--ps-border-default)",
                background: "var(--ps-bg-elevated)",
                color: "var(--ps-text-secondary)",
                cursor: "pointer",
              }}
              title="Editar nombre"
            >
              <Pencil size={12} />
            </button>
          </>
        )}
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            background:
              dealer.status === "active"
                ? "var(--ps-success-10)"
                : "var(--ps-warning-10)",
            color:
              dealer.status === "active"
                ? "var(--ps-success)"
                : "var(--ps-warning)",
          }}
        >
          {dealer.status === "active" ? "Activo" : "Pendiente"}
        </span>
      </div>

      {/* Pending status explanation */}
      {dealer.status === "pending_verification" && (
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            background: "var(--ps-warning-10)",
            border: "1px solid var(--ps-warning)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 600, color: "var(--ps-warning)" }}>
            Esperando aceptación del owner
          </div>
          <div style={{ fontSize: 13, color: "var(--ps-text-secondary)" }}>
            Se envió una invitación por email al owner. La organización se
            activará automáticamente cuando el owner acepte la invitación y
            complete su registro.
          </div>
          <button
            type="button"
            onClick={() => resendInvitation.mutate(dealer.id)}
            disabled={resendInvitation.isPending}
            style={{
              alignSelf: "flex-start",
              height: 32,
              padding: "0 12px",
              borderRadius: 6,
              background: "var(--ps-warning)",
              border: "none",
              color: "white",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {resendInvitation.isPending ? "Reenviando…" : "Reenviar invitación"}
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          href={`/admin/organizations/${dealer.id}/products`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 36,
            padding: "0 16px",
            borderRadius: 8,
            background: "var(--ps-cyan)",
            color: "var(--ps-bg-base)",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Ver productos <ArrowRight size={14} />
        </Link>
      </div>

      {/* Broker management section */}
      <BrokerManager dealerId={dealer.id} />
    </div>
  );
}
