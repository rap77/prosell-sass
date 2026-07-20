"use client";

/**
 * BulkUploadCSV — carga masiva de productos en ProSell.
 *
 * Permite subir múltiples productos desde un archivo CSV con:
 * - Drag & drop / click para seleccionar
 * - Descarga de plantilla CSV
 * - Schema-aware validation en el backend (PR1)
 *
 * El componente NO parsea el CSV client-side — eso lo hace el backend
 * (`POST /api/v1/products/bulk-upload` con `multipart/form-data`).
 * El resultado (`BulkUploadUploadResult`) se devuelve al caller vía
 * `onSuccess` o `onErrors` callbacks para que el padre abra el
 * `BulkUploadErrorModal` cuando hay partial failures.
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Upload, FileText, X, Download } from "lucide-react";
import { useBulkUploadProducts } from "@/lib/api/products";
import type { BulkUploadUploadResult } from "@/lib/api/schemas/bulkUpload";

interface BulkUploadCSVProps {
  onSuccess?: (count: number) => void;
  onErrors?: (result: BulkUploadUploadResult) => void;
  onCancel?: () => void;
}

export function BulkUploadCSV({
  onSuccess,
  onErrors,
  onCancel,
}: BulkUploadCSVProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const bulkUpload = useBulkUploadProducts();

  const onDrop = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Solo se permiten archivos CSV");
      return;
    }

    setFile(selectedFile);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await bulkUpload.mutateAsync(file);

      if (result.failed_count > 0) {
        onErrors?.(result);
      } else {
        toast.success(
          `Se cargaron ${result.created_count} productos correctamente`,
        );
        onSuccess?.(result.created_count);
        setFile(null);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al subir el CSV",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `title,price,category_id,description,condition,currency,location_city,location_state,location_zip
Product A,100,category-uuid-1,Well maintained,used,USD,Miami,FL,33101
Product B,250,category-uuid-1,Like new,used,USD,Miami,FL,33101
`;
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFile = () => {
    setFile(null);
  };

  const outlineBtnClass =
    "inline-flex items-center gap-1.5 h-9.5 px-4 rounded-lg bg-ps-bg-elevated border border-ps-border-default text-ps-text-secondary text-sm font-medium cursor-pointer transition-opacity duration-150";

  const primaryBtnClass =
    "inline-flex items-center gap-1.5 h-9.5 px-4.5 rounded-lg bg-ps-cyan border-0 text-ps-bg-base text-sm font-bold cursor-pointer transition-opacity duration-150";

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-xl font-bold tracking-tight text-ps-text-primary">
            Carga masiva de productos
          </h2>
          <p className="mt-1 text-sm text-ps-text-secondary">
            Cargá múltiples productos desde un archivo CSV
          </p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className={outlineBtnClass}>
            Cancelar
          </button>
        )}
      </div>

      {/* ── Template download ── */}
      <div className="flex items-center justify-between px-5 py-4 bg-ps-bg-surface border border-ps-border-default rounded-xl gap-3">
        <div className="flex items-center gap-3">
          <FileText
            size={18}
            strokeWidth={2}
            className="text-ps-text-secondary flex-shrink-0"
          />
          <div>
            <p className="m-0 text-sm font-semibold text-ps-text-primary">
              Plantilla CSV
            </p>
            <p className="mt-0.5 text-xs text-ps-text-secondary">
              Descargá la plantilla con el formato correcto
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className={primaryBtnClass}
        >
          <Download size={14} strokeWidth={2} />
          Descargar plantilla
        </button>
      </div>

      {/* ── Drop zone OR file selected ── */}
      {!file ? (
        <div
          {...getRootProps()}
          className="flex flex-col items-center justify-center rounded-xl cursor-pointer transition-colors duration-150"
          style={{
            borderRadius: 10,
            border: isDragActive
              ? "2px dashed var(--ps-cyan)"
              : "2px dashed var(--ps-border-default)",
            background: isDragActive ? "rgba(77,184,255,0.04)" : "transparent",
            padding: "48px 24px",
          }}
        >
          <input {...getInputProps()} aria-label="Upload CSV file" />
          <Upload
            size={40}
            strokeWidth={1.5}
            className="text-ps-text-tertiary mb-4"
          />
          <p className="m-0 text-base font-semibold text-ps-text-primary">
            {isDragActive
              ? "Soltá el archivo CSV acá"
              : "Arrastrá y soltá el archivo CSV acá"}
          </p>
          <p className="mt-1.5 text-sm text-ps-text-secondary">
            o hacé click para buscar
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 bg-ps-bg-surface border border-ps-border-default rounded-xl">
          <div className="flex items-center gap-3">
            <FileText
              size={28}
              strokeWidth={2}
              className="text-ps-cyan flex-shrink-0"
            />
            <div>
              <p className="m-0 text-sm font-semibold text-ps-text-primary">
                {file.name}
              </p>
              <p className="mt-0.5 text-xs text-ps-text-secondary">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className={outlineBtnClass}
            aria-label="Eliminar archivo"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ── Upload button ── */}
      {file && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className={primaryBtnClass}
            style={{
              opacity: isUploading ? 0.6 : 1,
              cursor: isUploading ? "not-allowed" : "pointer",
            }}
          >
            <Upload size={14} strokeWidth={2} />
            {isUploading ? "Subiendo..." : "Subir CSV"}
          </button>
        </div>
      )}
    </div>
  );
}
