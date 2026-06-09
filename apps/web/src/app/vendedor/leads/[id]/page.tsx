"use client";

/**
 * LeadDetailsPage — ProSell lead detail view.
 *
 * Layout: two-column (main 2/3 + sidebar 1/3)
 * Main: buyer info, vehicle interest, message, appointment CTA
 * Sidebar: audit trail (status history), duplicate warning
 *
 * Data: useLead, useLeadDuplicates, useLeadAuditTrail
 * All colors via var(--ps-*) tokens.
 */

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLead, useLeadDuplicates, useLeadAuditTrail } from "@/lib/api/leads";
import { LeadStatusDropdown } from "@/components/leads/LeadStatusDropdown";
import { DuplicateWarning } from "@/components/leads/DuplicateWarning";
import { LeadAuditTrail } from "@/components/leads/LeadAuditTrail";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Mail,
  Phone,
  Car,
  MessageSquare,
  AlertCircle,
  User,
} from "lucide-react";

interface LeadDetailsPageProps {
  params: Promise<{ id: string }>;
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--ps-bg-surface)",
        border: "1px solid var(--ps-border-default)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--ps-border-subtle)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--ps-text-disabled)",
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ─── Info row helper ──────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <Icon
        size={14}
        strokeWidth={2}
        style={{
          color: "var(--ps-text-disabled)",
          marginTop: 2,
          flexShrink: 0,
        }}
      />
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: "var(--ps-text-disabled)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 14,
            color: "var(--ps-text-primary)",
            fontWeight: 500,
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadDetailsPage({ params }: LeadDetailsPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: lead, isLoading, error } = useLead(id);
  const { data: duplicatesData } = useLeadDuplicates(id);
  const {
    data: auditLogs = [],
    isLoading: isAuditLoading,
    error: auditError,
  } = useLeadAuditTrail(id);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: 80,
          color: "var(--ps-text-secondary)",
        }}
      >
        <Loader2
          size={20}
          strokeWidth={2}
          style={{ animation: "spin 0.8s linear infinite" }}
        />
        <span style={{ fontSize: 14 }}>Cargando lead...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: 80,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--ps-error-bg)",
            border: "1px solid rgba(240,68,56,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertCircle
            size={24}
            style={{ color: "var(--ps-error)" }}
            strokeWidth={1.8}
          />
        </div>
        <p style={{ margin: 0, fontSize: 14, color: "var(--ps-error)" }}>
          Error al cargar el lead: {(error as Error).message}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            height: 36,
            padding: "0 16px",
            background: "transparent",
            border: "1px solid var(--ps-input-border)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--ps-text-secondary)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Volver
        </button>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!lead) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: 80,
          textAlign: "center",
        }}
      >
        <p
          style={{ margin: 0, fontSize: 14, color: "var(--ps-text-secondary)" }}
        >
          Lead no encontrado.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            height: 36,
            padding: "0 16px",
            background: "transparent",
            border: "1px solid var(--ps-input-border)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--ps-text-secondary)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Volver a Leads
        </button>
      </div>
    );
  }

  // ── Detail ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              width: 34,
              height: 34,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid var(--ps-input-border)",
              borderRadius: 8,
              color: "var(--ps-text-secondary)",
              cursor: "pointer",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--ps-border-strong)";
              e.currentTarget.style.color = "var(--ps-text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--ps-input-border)";
              e.currentTarget.style.color = "var(--ps-text-secondary)";
            }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--ps-text-primary)",
                lineHeight: 1.2,
              }}
            >
              {lead.buyer_name}
            </h1>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 13,
                color: "var(--ps-text-secondary)",
              }}
            >
              via {lead.source} ·{" "}
              {new Date(lead.created_at).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Status dropdown */}
          <LeadStatusDropdown leadId={lead.id} currentStatus={lead.status} />

          {/* Appointment CTA */}
          <button
            type="button"
            onClick={() => setIsAppointmentModalOpen(true)}
            style={{
              height: 36,
              padding: "0 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--ps-cyan)",
              color: "var(--ps-bg-base)",
              border: 0,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Calendar size={14} strokeWidth={2} />
            Agendar cita
          </button>
        </div>
      </div>

      {/* Duplicate warning */}
      {duplicatesData && duplicatesData.count > 0 && (
        <DuplicateWarning
          duplicates={duplicatesData.duplicates}
          onLeadClick={(leadId) => router.push(`/vendedor/leads/${leadId}`)}
          className="max-w-full"
        />
      )}

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left — main info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Buyer */}
          <DetailCard title="Datos del comprador">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background:
                    "linear-gradient(135deg, var(--ps-cyan), var(--ps-blue))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--ps-bg-base)",
                }}
              >
                {getInitials(lead.buyer_name)}
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--ps-text-primary)",
                  }}
                >
                  {lead.buyer_name}
                </p>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: 12,
                    color: "var(--ps-text-secondary)",
                    textTransform: "capitalize",
                  }}
                >
                  Fuente: {lead.source}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <InfoRow icon={User} label="Nombre" value={lead.buyer_name} />
              <InfoRow icon={Mail} label="Email" value={lead.buyer_email} />
              <InfoRow icon={Phone} label="Teléfono" value={lead.buyer_phone} />
            </div>
          </DetailCard>

          {/* Vehicle */}
          {lead.product && (
            <DetailCard title="Interés en vehículo">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 16px",
                  background: "var(--ps-bg-elevated)",
                  borderRadius: 8,
                  border: "1px solid var(--ps-border-subtle)",
                }}
              >
                <Car
                  size={24}
                  style={{ color: "var(--ps-cyan)", flexShrink: 0 }}
                  strokeWidth={1.8}
                />
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--ps-text-primary)",
                    }}
                  >
                    {lead.product.title}
                  </p>
                  <p
                    style={{
                      margin: "3px 0 0",
                      fontSize: 12,
                      color: "var(--ps-text-secondary)",
                    }}
                  >
                    {[
                      lead.product.attributes.year,
                      lead.product.attributes.make,
                      lead.product.attributes.model,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            </DetailCard>
          )}

          {/* Message */}
          {lead.message && (
            <DetailCard title="Mensaje">
              <div style={{ display: "flex", gap: 10 }}>
                <MessageSquare
                  size={16}
                  style={{
                    color: "var(--ps-text-disabled)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                  strokeWidth={1.8}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: "var(--ps-text-primary)",
                    lineHeight: 1.6,
                  }}
                >
                  {lead.message}
                </p>
              </div>
            </DetailCard>
          )}

          {/* Timeline */}
          <DetailCard title="Fechas">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "var(--ps-text-disabled)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  Creado
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 14,
                    color: "var(--ps-text-primary)",
                  }}
                >
                  {new Date(lead.created_at).toLocaleString("es-AR")}
                </p>
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "var(--ps-text-disabled)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  Última actualización
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 14,
                    color: "var(--ps-text-primary)",
                  }}
                >
                  {new Date(lead.updated_at).toLocaleString("es-AR")}
                </p>
              </div>
            </div>
          </DetailCard>
        </div>

        {/* Right — audit trail */}
        <div>
          <DetailCard title="Historial de estados">
            <LeadAuditTrail
              auditLogs={auditLogs}
              isLoading={isAuditLoading}
              error={auditError}
            />
          </DetailCard>
        </div>
      </div>

      {/* Appointment modal */}
      <AppointmentForm
        open={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onSuccess={() => setIsAppointmentModalOpen(false)}
        leadId={lead.id}
        vehicleId={lead.product?.id || null}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
