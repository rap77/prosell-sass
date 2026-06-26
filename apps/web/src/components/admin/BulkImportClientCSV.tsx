"use client";

/**
 * BulkImportClientCSV — F01 wizard for client-specific CSV imports.
 *
 * 3-step flow:
 *   1. Upload    — dropzone for CSV (required) + ZIP (optional)
 *   2. Preview   — calls usePreviewBulkUpload, renders per-row table
 *   3. Confirm   — pick organization + category, run useBulkUploadVehicles
 *
 * This is a super_admin-only migration flow. The generic bulk upload
 * (BulkUploadCSV, PR #61) lives at /catalog and handles any category
 * with a schema-aware comma-separated format.
 *
 * F01 specifically handles the legacy client's semicolon-separated CSV
 * with VIN-based upsert and optional ZIP image association.
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState, type CSSProperties } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useBulkUploadVehicles,
  usePreviewBulkUpload,
  type BulkUploadVehiclesInput,
} from "@/lib/api/bulkImportClient";
import type {
  BulkUploadPreview,
  PreviewRow,
} from "@/lib/api/schemas/bulkImportClient";

type Step = "upload" | "preview" | "confirm";

interface BulkImportClientCSVProps {
  /** Tenant-scoped list of orgs (UUID → label) for the confirm step. */
  organizations: Array<{ id: string; name: string }>;
  /** Vehicle categories for the confirm step (UUID → label). */
  categories: Array<{ id: string; name: string }>;
  /** Called after a successful import. */
  onComplete?: () => void;
  /** Called when the user wants to abandon the wizard. */
  onCancel?: () => void;
}

export function BulkImportClientCSV({
  organizations,
  categories,
  onComplete,
  onCancel,
}: BulkImportClientCSVProps) {
  const [step, setStep] = useState<Step>("upload");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulkUploadPreview | null>(null);
  const [organizationId, setOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");

  const previewMutation = usePreviewBulkUpload();
  const importMutation = useBulkUploadVehicles();

  // ── Step 1: Upload ────────────────────────────────────────────────────────

  const csvDropzone = useDropzone({
    onDrop: (files) => {
      const f = files[0];
      if (!f) return;
      if (!f.name.endsWith(".csv")) {
        return;
      }
      setCsvFile(f);
    },
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  const zipDropzone = useDropzone({
    onDrop: (files) => {
      const f = files[0];
      if (!f) return;
      if (!f.name.endsWith(".zip")) {
        return;
      }
      setZipFile(f);
    },
    accept: { "application/zip": [".zip"] },
    maxFiles: 1,
  });

  const canPreview = csvFile !== null && !previewMutation.isPending;

  const runPreview = async () => {
    if (!csvFile) return;
    try {
      const result = await previewMutation.mutateAsync({
        csv: csvFile,
        zip: zipFile,
      });
      setPreview(result);
      setStep("preview");
    } catch {
      // toast handled in hook onError
    }
  };

  // ── Step 2: Preview ───────────────────────────────────────────────────────

  const goToConfirm = () => {
    if (!preview) return;
    setStep("confirm");
  };

  const backToUpload = () => {
    setPreview(null);
    setStep("upload");
  };

  // ── Step 3: Confirm ───────────────────────────────────────────────────────

  const runImport = async () => {
    if (!csvFile) return;
    const input: BulkUploadVehiclesInput = {
      csv: csvFile,
      zip: zipFile,
      organizationId,
      categoryId,
    };
    try {
      await importMutation.mutateAsync(input);
      onComplete?.();
    } catch {
      // toast handled in hook onError
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <StepIndicator step={step} />

      {step === "upload" && (
        <UploadStep
          csvFile={csvFile}
          zipFile={zipFile}
          csvDropzone={csvDropzone}
          zipDropzone={zipDropzone}
          onClearCsv={() => setCsvFile(null)}
          onClearZip={() => setZipFile(null)}
          onPreview={runPreview}
          isPending={previewMutation.isPending}
          canPreview={canPreview}
        />
      )}

      {step === "preview" && preview && (
        <PreviewStep
          preview={preview}
          onBack={backToUpload}
          onConfirm={goToConfirm}
        />
      )}

      {step === "confirm" && (
        <ConfirmStep
          organizationId={organizationId}
          categoryId={categoryId}
          organizations={organizations}
          categories={categories}
          onChangeOrg={setOrganizationId}
          onChangeCat={setCategoryId}
          onBack={() => setStep("preview")}
          onCancel={onCancel}
          onConfirm={runImport}
          isPending={importMutation.isPending}
        />
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps: Array<{ id: Step; label: string }> = [
    { id: "upload", label: "1. Subir archivos" },
    { id: "preview", label: "2. Vista previa" },
    { id: "confirm", label: "3. Confirmar importación" },
  ];

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {steps.map((s) => {
        const active = s.id === step;
        return (
          <div
            key={s.id}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 8,
              background: active ? "var(--ps-cyan)" : "var(--ps-bg-surface)",
              color: active ? "var(--ps-bg-base)" : "var(--ps-text-secondary)",
              fontWeight: active ? 700 : 500,
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

interface UploadStepProps {
  csvFile: File | null;
  zipFile: File | null;
  csvDropzone: ReturnType<typeof useDropzone>;
  zipDropzone: ReturnType<typeof useDropzone>;
  onClearCsv: () => void;
  onClearZip: () => void;
  onPreview: () => void;
  isPending: boolean;
  canPreview: boolean;
}

function UploadStep({
  csvFile,
  zipFile,
  csvDropzone,
  zipDropzone,
  onClearCsv,
  onClearZip,
  onPreview,
  isPending,
  canPreview,
}: UploadStepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Dropzone
        label="CSV del cliente (requerido)"
        sublabel="Separado por ; — 24 columnas"
        file={csvFile}
        dropzone={csvDropzone}
        onClear={onClearCsv}
      />

      <Dropzone
        label="ZIP con imágenes (opcional)"
        sublabel="Estructura de carpetas por path"
        file={zipFile}
        dropzone={zipDropzone}
        onClear={onClearZip}
      />

      <button
        type="button"
        onClick={onPreview}
        disabled={!canPreview}
        style={primaryBtn}
      >
        {isPending ? "Analizando..." : "Vista previa"}
        {!isPending && <ChevronRight size={16} />}
      </button>
    </div>
  );
}

interface DropzoneProps {
  label: string;
  sublabel: string;
  file: File | null;
  dropzone: ReturnType<typeof useDropzone>;
  onClear: () => void;
}

function Dropzone({ label, sublabel, file, dropzone, onClear }: DropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = dropzone;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{label}</p>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--ps-text-secondary)",
            }}
          >
            {sublabel}
          </p>
        </div>
      </div>

      {file ? (
        <div style={fileCard}>
          <FileText size={20} style={{ color: "var(--ps-cyan)" }} />
          <span style={{ flex: 1, fontSize: 13 }}>{file.name}</span>
          <button
            type="button"
            onClick={onClear}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            aria-label="Quitar archivo"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          style={{
            ...dropzoneCard,
            borderColor: isDragActive
              ? "var(--ps-cyan)"
              : "var(--ps-border-default)",
          }}
        >
          <input {...getInputProps()} />
          <Upload size={28} style={{ color: "var(--ps-text-secondary)" }} />
          <p style={{ margin: 0, fontSize: 13 }}>
            {isDragActive
              ? "Soltá el archivo acá"
              : "Arrastrá un archivo o hacé click para seleccionar"}
          </p>
        </div>
      )}
    </div>
  );
}

interface PreviewStepProps {
  preview: BulkUploadPreview;
  onBack: () => void;
  onConfirm: () => void;
}

function PreviewStep({ preview, onBack, onConfirm }: PreviewStepProps) {
  const { summary, rows } = preview;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <SummaryCard
          label="Importables"
          value={summary.importable_count}
          color="var(--ps-success)"
        />
        <SummaryCard
          label="Con errores"
          value={summary.error_count}
          color="var(--ps-error, #ef4444)"
        />
        <SummaryCard
          label="Imágenes"
          value={summary.images_count}
          color="var(--ps-cyan)"
        />
      </div>

      <div
        style={{
          border: "1px solid var(--ps-border-default)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={tableHeadRow}>
                <th style={th}>#</th>
                <th style={th}>VIN</th>
                <th style={th}>Estado</th>
                <th style={th}>Mapeados</th>
                <th style={th}>Imágenes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <PreviewRowView key={row.row_number} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{ display: "flex", gap: 12, justifyContent: "space-between" }}
      >
        <button type="button" onClick={onBack} style={secondaryBtn}>
          <ChevronLeft size={16} />
          Volver
        </button>
        <button
          type="button"
          onClick={onConfirm}
          style={primaryBtn}
          disabled={summary.importable_count === 0}
        >
          Continuar
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function PreviewRowView({ row }: { row: PreviewRow }) {
  const status = row.importable
    ? { label: "✓ OK", color: "var(--ps-success)" }
    : row.errors.length > 0
      ? { label: "✗ Error", color: "var(--ps-error, #ef4444)" }
      : { label: "⚠ Atención", color: "var(--ps-warning, #f59e0b)" };

  return (
    <tr style={tableBodyRow}>
      <td style={td}>{row.row_number}</td>
      <td style={td}>{row.vin || "—"}</td>
      <td style={{ ...td, color: status.color, fontWeight: 600 }}>
        {status.label}
      </td>
      <td style={td}>{Object.keys(row.mapped_fields).length}</td>
      <td style={td}>{row.images_found.length}</td>
    </tr>
  );
}

interface ConfirmStepProps {
  organizationId: string;
  categoryId: string;
  organizations: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  onChangeOrg: (id: string) => void;
  onChangeCat: (id: string) => void;
  onBack: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

function ConfirmStep({
  organizationId,
  categoryId,
  organizations,
  categories,
  onChangeOrg,
  onChangeCat,
  onBack,
  onCancel,
  onConfirm,
  isPending,
}: ConfirmStepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SelectField
          label="Organización"
          value={organizationId}
          options={organizations}
          onChange={onChangeOrg}
        />
        <SelectField
          label="Categoría"
          value={categoryId}
          options={categories}
          onChange={onChangeCat}
        />
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 8,
          background: "var(--ps-bg-surface)",
          border: "1px solid var(--ps-border-default)",
          fontSize: 13,
          color: "var(--ps-text-secondary)",
        }}
      >
        La importación es <strong>idempotente por VIN</strong>: productos
        existentes se actualizan, los nuevos se crean. Las imágenes del ZIP se
        suben a DO Spaces y se asocian al producto.
      </div>

      <div
        style={{ display: "flex", gap: 12, justifyContent: "space-between" }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={onBack} style={secondaryBtn}>
            <ChevronLeft size={16} />
            Volver
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} style={secondaryBtn}>
              Cancelar
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending || !organizationId || !categoryId}
          style={primaryBtn}
        >
          {isPending ? "Importando..." : "Importar"}
        </button>
      </div>
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: Array<{ id: string; name: string }>;
  onChange: (id: string) => void;
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid var(--ps-border-default)",
          background: "var(--ps-bg-base)",
          color: "var(--ps-text-primary)",
          fontSize: 14,
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--ps-border-default)",
        background: "var(--ps-bg-surface)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: "var(--ps-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 24,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const primaryBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 18px",
  borderRadius: 8,
  background: "var(--ps-cyan)",
  color: "var(--ps-bg-base)",
  border: "none",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 18px",
  borderRadius: 8,
  background: "transparent",
  color: "var(--ps-text-primary)",
  border: "1px solid var(--ps-border-default)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const dropzoneCard: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  padding: 24,
  borderRadius: 10,
  border: "2px dashed var(--ps-border-default)",
  background: "var(--ps-bg-surface)",
  cursor: "pointer",
};

const fileCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 14,
  borderRadius: 8,
  background: "var(--ps-bg-surface)",
  border: "1px solid var(--ps-border-default)",
};

const tableHeadRow: CSSProperties = {
  background: "var(--ps-bg-surface)",
};

const tableBodyRow: CSSProperties = {
  borderTop: "1px solid var(--ps-border-default)",
};

const th: CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ps-text-secondary)",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const td: CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
};
