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
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-6">
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
    <div className="flex gap-2">
      {steps.map((s) => {
        const active = s.id === step;
        return (
          <div
            key={s.id}
            className={cn(
              "flex-1 rounded-lg py-3 px-4 text-center text-sm",
              active
                ? "bg-ps-cyan text-ps-bg-base font-bold"
                : "bg-ps-bg-surface text-ps-text-secondary font-medium",
            )}
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
    <div className="flex flex-col gap-4">
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
        className={primaryBtnClass}
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="m-0 text-sm font-semibold">{label}</p>
          <p className="m-0 text-xs text-ps-text-secondary">{sublabel}</p>
        </div>
      </div>

      {file ? (
        <div className={fileCardClass}>
          <FileText size={20} style={{ color: "var(--ps-cyan)" }} />
          <span className="flex-1 text-xs">{file.name}</span>
          <button
            type="button"
            onClick={onClear}
            className="bg-transparent border-none cursor-pointer"
            aria-label="Quitar archivo"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={dropzoneCardClass}
          style={{
            borderColor: isDragActive
              ? "var(--ps-cyan)"
              : "var(--ps-border-default)",
          }}
        >
          <input {...getInputProps()} />
          <Upload size={28} style={{ color: "var(--ps-text-secondary)" }} />
          <p className="m-0 text-xs">
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
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
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

      <div className="border border-ps-border-default rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={thClass}>#</th>
                <th className={thClass}>VIN</th>
                <th className={thClass}>Estado</th>
                <th className={thClass}>Mapeados</th>
                <th className={thClass}>Imágenes</th>
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

      <div className="flex justify-between gap-3">
        <button type="button" onClick={onBack} className={secondaryBtnClass}>
          <ChevronLeft size={16} />
          Volver
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={primaryBtnClass}
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
    <tr className={tableBodyRowClass}>
      <td className={tdClass}>{row.row_number}</td>
      <td className={tdClass}>{row.vin || "—"}</td>
      <td className={tdClass} style={{ color: status.color, fontWeight: 600 }}>
        {status.label}
      </td>
      <td className={tdClass}>{Object.keys(row.mapped_fields).length}</td>
      <td className={tdClass}>{row.images_found.length}</td>
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
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

      <div className="rounded-lg bg-ps-bg-surface border border-ps-border-default p-3.5 text-xs text-ps-text-secondary">
        La importación es <strong>idempotente por VIN</strong>: productos
        existentes se actualizan, los nuevos se crean. Las imágenes del ZIP se
        suben a DO Spaces y se asocian al producto.
      </div>

      <div className="flex justify-between gap-3">
        <div className="flex gap-3">
          <button type="button" onClick={onBack} className={secondaryBtnClass}>
            <ChevronLeft size={16} />
            Volver
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={secondaryBtnClass}
            >
              Cancelar
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending || !organizationId || !categoryId}
          className={primaryBtnClass}
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
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-ps-border-default bg-ps-bg-base px-3 py-2.5 text-sm text-ps-text-primary"
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
    <div className="rounded-lg border border-ps-border-default bg-ps-bg-surface p-4">
      <p className="m-0 text-xs uppercase text-ps-text-secondary tracking-wide">
        {label}
      </p>
      <p
        className="mt-2 text-2xl font-bold"
        style={{
          color,
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const primaryBtnClass =
  "inline-flex items-center gap-1.5 rounded-lg bg-ps-cyan px-4.5 py-2.5 text-sm font-bold text-ps-bg-base cursor-pointer border-none";

const secondaryBtnClass =
  "inline-flex items-center gap-1.5 rounded-lg bg-transparent px-4.5 py-2.5 text-sm font-semibold text-ps-text-primary cursor-pointer border border-ps-border-default";

const dropzoneCardClass =
  "flex flex-col items-center gap-2.5 rounded-xl border-2 border-dashed bg-ps-bg-surface p-6 cursor-pointer";

const fileCardClass =
  "flex items-center gap-3 rounded-lg border border-ps-border-default bg-ps-bg-surface p-3.5";

const tableHeadRowClass = "bg-ps-bg-surface";

const tableBodyRowClass = "border-t border-ps-border-default";

const thClass =
  "px-3 py-2.5 text-left text-xs font-semibold uppercase text-ps-text-secondary tracking-wider";

const tdClass = "px-3 py-2.5 text-xs";
