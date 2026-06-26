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

import { useState, type CSSProperties } from "react";
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

  const outlineBtn: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 38,
    padding: "0 16px",
    borderRadius: 8,
    background: "var(--ps-bg-elevated)",
    border: "1px solid var(--ps-border-default)",
    color: "var(--ps-text-secondary)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "opacity 0.15s",
  };

  const primaryBtn: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 38,
    padding: "0 18px",
    borderRadius: 8,
    background: "var(--ps-cyan)",
    border: "none",
    color: "var(--ps-bg-base)",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.15s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ps-text-primary)",
            }}
          >
            Carga masiva de productos
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "var(--ps-text-secondary)",
            }}
          >
            Cargá múltiples productos desde un archivo CSV
          </p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} style={outlineBtn}>
            Cancelar
          </button>
        )}
      </div>

      {/* ── Template download ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "var(--ps-bg-surface)",
          border: "1px solid var(--ps-border-default)",
          borderRadius: 10,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <FileText
            size={18}
            strokeWidth={2}
            style={{ color: "var(--ps-text-secondary)", flexShrink: 0 }}
          />
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ps-text-primary)",
              }}
            >
              Plantilla CSV
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 12,
                color: "var(--ps-text-secondary)",
              }}
            >
              Descargá la plantilla con el formato correcto
            </p>
          </div>
        </div>
        <button type="button" onClick={downloadTemplate} style={primaryBtn}>
          <Download size={14} strokeWidth={2} />
          Descargar plantilla
        </button>
      </div>

      {/* ── Drop zone OR file selected ── */}
      {!file ? (
        <div
          {...getRootProps()}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            border: isDragActive
              ? "2px dashed var(--ps-cyan)"
              : "2px dashed var(--ps-border-default)",
            background: isDragActive ? "rgba(77,184,255,0.04)" : "transparent",
            padding: "48px 24px",
            cursor: "pointer",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <input {...getInputProps()} aria-label="Upload CSV file" />
          <Upload
            size={40}
            strokeWidth={1.5}
            style={{ color: "var(--ps-text-tertiary)", marginBottom: 16 }}
          />
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ps-text-primary)",
            }}
          >
            {isDragActive
              ? "Soltá el archivo CSV acá"
              : "Arrastrá y soltá el archivo CSV acá"}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--ps-text-secondary)",
            }}
          >
            o hacé click para buscar
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            background: "var(--ps-bg-surface)",
            border: "1px solid var(--ps-border-default)",
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <FileText
              size={28}
              strokeWidth={2}
              style={{ color: "var(--ps-cyan)", flexShrink: 0 }}
            />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ps-text-primary)",
                }}
              >
                {file.name}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 12,
                  color: "var(--ps-text-secondary)",
                }}
              >
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearFile}
            style={outlineBtn}
            aria-label="Eliminar archivo"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ── Upload button ── */}
      {file && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            style={{
              ...primaryBtn,
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
