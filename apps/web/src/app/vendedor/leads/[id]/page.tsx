"use client";

/**
 * LeadDetailsPage — ProSell lead detail view.
 *
 * Layout: two-column (main 2/3 + sidebar 1/3)
 * Main: buyer info, vehicle interest, message, appointment CTA
 * Sidebar: audit trail (status history), duplicate warning
 *
 * Data: useLead, useLeadDuplicates, useLeadAuditTrail
 * All colors via ps-* tokens.
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
    <div className="bg-ps-surface border border-ps-border-default rounded-xl overflow-hidden">
      <div className="py-3.5 px-5 border-b border-ps-border-subtle">
        <h2 className="m-0 text-[13px] font-semibold tracking-wider uppercase text-ps-tertiary">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
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
    <div className="flex items-start gap-2.5">
      <Icon
        size={14}
        strokeWidth={2}
        className="text-ps-tertiary mt-0.5 shrink-0"
      />
      <div>
        <p className="m-0 text-[11px] text-ps-tertiary uppercase tracking-wider font-semibold">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-ps-text-primary font-medium">
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
      <div className="flex items-center justify-center gap-2.5 p-20 text-ps-text-secondary">
        <Loader2 size={20} strokeWidth={2} className="animate-spin" />
        <span className="text-sm">Cargando lead...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 p-20 text-center">
        <div className="w-14 h-14 rounded-full bg-ps-error-bg border border-destructive/25 flex items-center justify-center">
          <AlertCircle
            size={24}
            className="text-destructive"
            strokeWidth={1.8}
          />
        </div>
        <p className="m-0 text-sm text-destructive">
          Error al cargar el lead: {error.message}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-9 px-4 bg-transparent border border-ps-border-default rounded-lg text-[13px] text-ps-text-secondary cursor-pointer inline-flex items-center gap-1.5"
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
      <div className="flex flex-col items-center gap-3 p-20 text-center">
        <p className="m-0 text-sm text-ps-text-secondary">
          Lead no encontrado.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-9 px-4 bg-transparent border border-ps-border-default rounded-lg text-[13px] text-ps-text-secondary cursor-pointer inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Volver a Leads
        </button>
      </div>
    );
  }

  // ── Detail ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1100px] mx-auto flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-[34px] h-[34px] inline-flex items-center justify-center bg-transparent border border-ps-border-default rounded-lg text-ps-text-secondary cursor-pointer shrink-0 hover:border-ps-border-strong hover:text-ps-text-primary"
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <div>
            <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-ps-text-primary leading-[1.2]">
              {lead.buyer_name}
            </h1>
            <p className="mt-[3px] text-[13px] text-ps-text-secondary">
              via {lead.source} ·{" "}
              {new Date(lead.created_at).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status dropdown */}
          <LeadStatusDropdown leadId={lead.id} currentStatus={lead.status} />

          {/* Appointment CTA */}
          <button
            type="button"
            onClick={() => setIsAppointmentModalOpen(true)}
            className="h-9 px-[14px] inline-flex items-center gap-1.5 bg-ps-cyan text-ps-base border-0 rounded-lg text-[13px] font-semibold cursor-pointer"
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
      <div className="grid grid-cols-[1fr_320px] gap-5 items-start">
        {/* Left — main info */}
        <div className="flex flex-col gap-4">
          {/* Buyer */}
          <DetailCard title="Datos del comprador">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-[52px] h-[52px] rounded-full shrink-0 bg-gradient-to-br from-ps-cyan to-ps-blue flex items-center justify-center text-[18px] font-bold text-ps-base">
                {getInitials(lead.buyer_name)}
              </div>
              <div>
                <p className="m-0 text-base font-bold text-ps-text-primary">
                  {lead.buyer_name}
                </p>
                <p className="mt-[3px] text-xs text-ps-text-secondary capitalize">
                  Fuente: {lead.source}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <InfoRow icon={User} label="Nombre" value={lead.buyer_name} />
              <InfoRow icon={Mail} label="Email" value={lead.buyer_email} />
              <InfoRow icon={Phone} label="Teléfono" value={lead.buyer_phone} />
            </div>
          </DetailCard>

          {/* Vehicle */}
          {lead.product && (
            <DetailCard title="Interés en vehículo">
              <div className="flex items-center gap-3.5 p-3 bg-ps-elevated rounded-lg border border-ps-border-subtle">
                <Car
                  size={24}
                  className="text-ps-cyan shrink-0"
                  strokeWidth={1.8}
                />
                <div>
                  <p className="m-0 text-[15px] font-semibold text-ps-text-primary">
                    {lead.product.title}
                  </p>
                  <p className="mt-[3px] text-xs text-ps-text-secondary">
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
              <div className="flex gap-2.5">
                <MessageSquare
                  size={16}
                  className="text-ps-tertiary shrink-0 mt-px"
                  strokeWidth={1.8}
                />
                <p className="m-0 text-sm text-ps-text-primary leading-relaxed">
                  {lead.message}
                </p>
              </div>
            </DetailCard>
          )}

          {/* Timeline */}
          <DetailCard title="Fechas">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="m-0 text-[11px] text-ps-tertiary uppercase tracking-wider font-semibold">
                  Creado
                </p>
                <p className="mt-1 text-sm text-ps-text-primary">
                  {new Date(lead.created_at).toLocaleString("es-AR")}
                </p>
              </div>
              <div>
                <p className="m-0 text-[11px] text-ps-tertiary uppercase tracking-wider font-semibold">
                  Última actualización
                </p>
                <p className="mt-1 text-sm text-ps-text-primary">
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
