"use client";

/**
 * BulkUploadCSV — carga masiva de productos en ProSell.
 *
 * Permite subir múltiples productos desde un archivo CSV con:
 * - Drag & drop / click para seleccionar
 * - Preview de las primeras filas con validación
 * - Descarga de plantilla CSV
 * - Lógica de negocio preservada exactamente.
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";
import { useBulkUploadProducts } from "@/lib/api/vehicles";

// ============================================
// STYLES
// ============================================

const TABLE_STYLES = `
  .ps-bulk-table {
    width: 100%;
    font-size: 12px;
    border-collapse: collapse;
  }
  .ps-bulk-table th {
    padding: 8px 14px;
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ps-text-tertiary);
    background: var(--ps-bg-elevated);
    border-bottom: 1px solid var(--ps-border-default);
  }
  .ps-bulk-table td {
    padding: 10px 14px;
    color: var(--ps-text-secondary);
    border-bottom: 1px solid var(--ps-border-subtle);
  }
  .ps-bulk-table tr:last-child td {
    border-bottom: none;
  }
`;

// ============================================
// TYPES
// ============================================

interface CSVRecord {
  vin?: string;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  mileage?: string;
  price?: string;
  condition?: string;
  exterior_color?: string;
  interior_color?: string;
  transmission?: string;
  fuel_type?: string;
  body_style?: string;
  drivetrain?: string;
  engine?: string;
  cylinders?: string;
  description?: string;
  [key: string]: string | number | undefined;
}

interface ParsedRow extends CSVRecord {
  rowNumber: number;
  vin: string;
  error?: string;
}

interface BulkUploadCSVProps {
  onSuccess?: (count: number) => void;
  onCancel?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function BulkUploadCSV({ onSuccess, onCancel }: BulkUploadCSVProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);

  const bulkUpload = useBulkUploadProducts();

  const onDrop = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Solo se permiten archivos CSV");
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== "string") return;
      const text = result;
      try {
        const lines = text.split("\n").filter((line) => line.trim());
        const headers = lines[0].split(",").map((h) => h.trim());

        const rows: ParsedRow[] = lines.slice(1).map((line, index) => {
          const values = line.split(",").map((v) => v.trim());
          const row: ParsedRow = {
            rowNumber: index + 2, // +2: fila 1 = encabezado, índice 0-based
            vin: "",
          };

          headers.forEach((header, i) => {
            row[header] = values[i] || "";
          });
          return row;
        });

        // Validación básica
        rows.forEach((row) => {
          if (!row.vin || row.vin.length !== 17) {
            row.error = "El VIN debe tener exactamente 17 caracteres";
          }
        });

        setParsedRows(rows);
        setPreviewRows(rows.slice(0, 5)); // Mostrar primeras 5 filas
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error al parsear el CSV",
        );
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await bulkUpload.mutateAsync(file);

      if (result.errors.length > 0) {
        const rowsWithErrors = parsedRows.map((row) => {
          const error = result.errors.find(
            (e) => e.row_number === row.rowNumber,
          );
          return { ...row, error: error?.error };
        });
        setParsedRows(rowsWithErrors);
        setPreviewRows(rowsWithErrors.slice(0, 5));
      } else {
        toast.success(
          `Se cargaron ${result.created_count} productos correctamente`,
        );
        onSuccess?.(result.created_count);
        setFile(null);
        setParsedRows([]);
        setPreviewRows([]);
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
    const template = `vin,year,make,model,trim,mileage,price,exterior_color,interior_color,transmission,fuel_type,body_style,drivetrain,engine,cylinders,description
1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,Black,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Well maintained
2T1BURHE0FC123456,2015,Toyota,Camry,SE,80000,12000,White,Grey,Automatic,Gas,Sedan,FWD,2.5L 4-Cylinder,4,Clean title
`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vehicle_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFile = () => {
    setFile(null);
    setParsedRows([]);
    setPreviewRows([]);
  };

  const outlineBtn: React.CSSProperties = {
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

  const primaryBtn: React.CSSProperties = {
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
      <style>{TABLE_STYLES}</style>

      {/* ── Encabezado ── */}
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

      {/* ── Descarga de plantilla ── */}
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

      {/* ── Drop zone ── */}
      {!file && (
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
          <input {...getInputProps()} />
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
      )}

      {/* ── Preview del archivo ── */}
      {file && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Info del archivo */}
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
                strokeWidth={1.5}
                style={{ color: "var(--ps-cyan)", flexShrink: 0 }}
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
                  {file.name}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 11,
                    color: "var(--ps-text-secondary)",
                  }}
                >
                  {parsedRows.length} filas · {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearFile}
              aria-label="Eliminar archivo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "transparent",
                border: "none",
                color: "var(--ps-text-secondary)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--ps-bg-elevated)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Tabla de preview */}
          {previewRows.length > 0 && (
            <div
              style={{
                overflowX: "auto",
                borderRadius: 10,
                border: "1px solid var(--ps-border-default)",
              }}
            >
              <table className="ps-bulk-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>VIN</th>
                    <th>Año</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Precio</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td style={{ color: "var(--ps-text-tertiary)" }}>
                        {row.rowNumber}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                        {row.vin}
                      </td>
                      <td>{row.year ?? "-"}</td>
                      <td>{row.make ?? "-"}</td>
                      <td>{row.model ?? "-"}</td>
                      <td>{row.price ?? "-"}</td>
                      <td>
                        {row.error ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              color: "var(--ps-error)",
                            }}
                          >
                            <AlertCircle size={12} strokeWidth={2} />
                            <span style={{ fontSize: 11 }}>{row.error}</span>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              color: "var(--ps-success)",
                            }}
                          >
                            <CheckCircle2 size={12} strokeWidth={2} />
                            <span style={{ fontSize: 11 }}>Válido</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Botones de acción */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={clearFile} style={outlineBtn}>
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={isUploading || parsedRows.some((row) => row.error)}
              style={{
                ...primaryBtn,
                opacity:
                  isUploading || parsedRows.some((row) => row.error) ? 0.5 : 1,
                cursor:
                  isUploading || parsedRows.some((row) => row.error)
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {isUploading
                ? "Subiendo..."
                : `Subir ${parsedRows.length} productos`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
